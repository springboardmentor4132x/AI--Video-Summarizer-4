"""
ClipMind Daily -- builds a time-boxed study session from the user's REAL data:
unfinished videos (from playback activity), bookmarks, and the most important
key moments, plus a closing quick-revision step when the videos have
revisable content. Pure function; no randomness, no invented items.
"""

import math
from typing import Dict, List, Optional

from app.services.insight_service import revision_for_video
from app.services.story_service import truncate

MIN_MINUTES, MAX_MINUTES = 5, 120
BOOKMARK_WINDOW = (10.0, 80.0)      # seconds before / after the bookmark
KEY_MOMENT_MAX_SECONDS = 120.0
KEY_MOMENT_MIN_SECONDS = 45.0
WEAK_STRENGTHS = ("forgotten", "needs_review")   # Memory Deck cards worth revisiting
MAX_MEMORY_CARDS = 5
RESUME_FINISHED_RATIO = 0.9         # past this, a video counts as finished


def _t(value) -> float:
    """Sortable number for a datetime (or 0 when missing)."""
    return value.timestamp() if hasattr(value, "timestamp") else 0.0


def _mins(seconds: float) -> int:
    return max(1, math.ceil(seconds / 60))


def _mmss(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 60:02d}:{s % 60:02d}"


def _overlaps(items: List[dict], video_id: str, start: float, end: float) -> bool:
    return any(i["video_id"] == video_id and i["start_time"] is not None
               and start < i["end_time"] and end > i["start_time"] for i in items)


def build_daily_items(
    minutes: int,
    videos: List[dict],
    bookmarks: List[dict],
    activity: Dict[str, dict],
    cards: Optional[List[dict]] = None,
) -> List[dict]:
    """videos: [{id, filename, uploaded_at, duration, key_moments, segments, keywords}]
    bookmarks: [{video_id, timestamp, note}]; activity: video_id -> {last_position, duration, last_opened_at}
    cards: the user's Memory Deck cards [{video_id, prompt, strength, source_start, source_end, next_review_at}]"""
    minutes = max(MIN_MINUTES, min(int(minutes), MAX_MINUTES))
    by_id = {v["id"]: v for v in videos}
    reserve = (min(5, max(2, round(minutes * 0.15))) if minutes >= 10 else 0)   # for the closing revision
    left = minutes - reserve

    def video_len(v):
        a = activity.get(v["id"], {})
        return max(v.get("duration") or 0, a.get("duration") or 0)

    items: List[dict] = []

    # ---- 0. memory deck: cards the user marked Forgotten / Needs Review ---------
    # One minute each, most-forgotten first, then the longest-overdue.
    weak = [c for c in (cards or []) if c.get("strength") in WEAK_STRENGTHS and c.get("video_id") in by_id]
    weak.sort(key=lambda c: (c["strength"] != "forgotten", _t(c.get("next_review_at"))))
    mem_cap = min(MAX_MEMORY_CARDS, int(left * 0.4))
    memory_items = []
    for c in weak[:mem_cap]:
        v = by_id[c["video_id"]]
        start = float(c.get("source_start") or 0.0)
        end = max(float(c.get("source_end") or 0.0), start + 5.0)
        label = "Forgotten" if c["strength"] == "forgotten" else "Needs review"
        memory_items.append({
            "kind": "memory_review", "video_id": v["id"], "filename": v["filename"],
            "start_time": round(start, 1), "end_time": round(end, 1), "minutes": 1,
            "title": truncate((c.get("prompt") or "Memory card").strip(), 70),
            "reason": f"Marked {label} in your Memory Deck. Rewatch the source, then review the card.",
        })
    left -= len(memory_items)

    # ---- 1. resume: videos the user started but didn't finish -------------------
    resume_cap = int(left * 0.4)
    unfinished = []
    for v in videos:
        a = activity.get(v["id"])
        length = video_len(v)
        if a and length > 0 and 0 < a.get("last_position", 0) < length * RESUME_FINISHED_RATIO:
            unfinished.append((a.get("last_opened_at"), v, a["last_position"], length))
    unfinished.sort(key=lambda x: _t(x[0]), reverse=True)
    resume_items = []
    spent = 0
    for _, v, pos, length in unfinished:
        allowed = min(resume_cap - spent, 8)
        if allowed < 2:
            break
        end = min(length, pos + allowed * 60)
        m = _mins(end - pos)
        resume_items.append({
            "kind": "resume", "video_id": v["id"], "filename": v["filename"],
            "start_time": round(pos, 1), "end_time": round(end, 1), "minutes": m,
            "title": f"Continue {v['filename']}",
            "reason": f"You stopped at {_mmss(pos)} of {_mmss(length)}.",
        })
        spent += m
    left -= spent

    # ---- 2. bookmarks: moments the user saved themselves ------------------------
    bm_items = []
    bm_cap = int(left * 0.6)
    spent = 0
    for b in sorted(bookmarks, key=lambda b: _t(b.get("created_at"))):
        v = by_id.get(b["video_id"])
        if not v:
            continue
        length = video_len(v) or (b["timestamp"] + BOOKMARK_WINDOW[1])
        start = max(0.0, b["timestamp"] - BOOKMARK_WINDOW[0])
        end = min(length, b["timestamp"] + BOOKMARK_WINDOW[1])
        if end - start < 5:
            continue
        m = _mins(end - start)
        if spent + m > bm_cap:
            continue
        if _overlaps(resume_items + bm_items, v["id"], start, end):
            continue
        note = (b.get("note") or "").strip()
        bm_items.append({
            "kind": "bookmark", "video_id": v["id"], "filename": v["filename"],
            "start_time": round(start, 1), "end_time": round(end, 1), "minutes": m,
            "title": truncate(note, 70) if note else f"Bookmark at {_mmss(b['timestamp'])}",
            "reason": "You bookmarked this moment" + (f": {truncate(note, 80)}" if note else "."),
        })
        spent += m
    left -= spent

    # ---- 3. key moments: the most important parts, spread across videos ---------
    km_items = []
    pools = []
    for v in sorted(videos, key=lambda v: _t(activity.get(v["id"], {}).get("last_opened_at") or v.get("uploaded_at")),
                    reverse=True):
        moments = sorted(v.get("key_moments") or [], key=lambda m: -float(m.get("importance") or 0))[:2]
        pools.append((v, moments))
    rounds = 0
    while left >= 1 and rounds < 2:
        for v, moments in pools:
            if rounds >= len(moments):
                continue
            m = moments[rounds]
            length = video_len(v) or m["end_time"]
            start = m["start_time"]
            end = min(length, max(start + KEY_MOMENT_MIN_SECONDS, min(m["end_time"], start + KEY_MOMENT_MAX_SECONDS)))
            if end - start < 5:
                continue
            mins = _mins(end - start)
            if mins > left or _overlaps(resume_items + bm_items + km_items, v["id"], start, end):
                continue
            km_items.append({
                "kind": "key_moment", "video_id": v["id"], "filename": v["filename"],
                "start_time": round(start, 1), "end_time": round(end, 1), "minutes": mins,
                "title": truncate((m.get("text") or m.get("label") or "Key moment").strip(), 70),
                "reason": f"One of the most important moments in {v['filename']}.",
            })
            left -= mins
        rounds += 1

    # review first (saved + important), then continue watching, then wrap up
    items = memory_items + bm_items + km_items + resume_items

    # ---- 4. closing quick revision, only if the chosen videos have content ------
    if reserve and items:
        vids = list(dict.fromkeys(i["video_id"] for i in items))[:5]
        found = 0
        for vid in vids:
            v = by_id[vid]
            rev = revision_for_video(v["segments"], v.get("key_moments") or [], v.get("keywords") or [])
            found += sum(len(rev[k]) for k in ("definitions", "differences", "formulas", "confusions", "must_remember"))
        if found:
            items.append({
                "kind": "revision", "video_id": vids[0], "filename": by_id[vids[0]]["filename"],
                "start_time": None, "end_time": None, "minutes": reserve,
                "title": "Quick revision",
                "reason": f"Revision page built from {len(vids)} video{'s' if len(vids) != 1 else ''} in today's session.",
            })
    return items
