"""
ClipMind Time Machine -- search and topic history across ALL of a user's
videos. Pure functions over stored data (transcript segments + keywords);
no external API, nothing invented.

  search_history     rank transcript passages across videos for a query
  topic_evolution    the concepts a user has met, in the order they met them
"""

import math
import re
from datetime import datetime
from typing import Dict, List, Optional

from app.services.story_service import truncate

_WORD = re.compile(r"[a-zA-Z0-9']+")
_STOP = {"the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "for", "to", "with", "is", "are",
         "was", "were", "be", "it", "this", "that", "what", "how", "why", "do", "does", "vs", "about"}

MIN_COVERAGE = 0.5          # share of the query's (weighted) terms a passage must contain
HIT_SPACING_SECONDS = 20.0  # collapse overlapping hits in one video


def stem(word: str) -> str:
    """Tiny suffix stripper so 'joins' ~ 'join', 'indexes' ~ 'index', 'normalization' stays."""
    w = word.lower().strip("'")
    for suffix, repl in (("ies", "y"), ("sses", "ss"), ("ing", ""), ("es", ""), ("s", "")):
        if w.endswith(suffix) and len(w) - len(suffix) >= 3:
            return w[: len(w) - len(suffix)] + repl
    return w


def _stems(text: str) -> List[str]:
    return [stem(w) for w in _WORD.findall((text or "").lower()) if w not in _STOP]


def _ts(value) -> Optional[datetime]:
    return value if isinstance(value, datetime) else None


def search_history(query: str, videos: List[dict], limit: int = 30, per_video: int = 3) -> List[dict]:
    """videos: [{id, filename, uploaded_at, last_opened_at, keywords, segments}]"""
    q_stems = list(dict.fromkeys(_stems(query)))
    if not q_stems:
        return []
    phrase = " ".join(w.lower() for w in _WORD.findall(query) if w.lower() not in _STOP)

    # document frequency over every segment the user owns -> rarer terms weigh more
    rows = []
    df: Dict[str, int] = {}
    for v in videos:
        segs = sorted((s for s in v["segments"] if (s.get("text") or "").strip()), key=lambda s: s["start_time"])
        for i, seg in enumerate(segs):
            st = set(_stems(seg["text"]))
            rows.append((v, segs, i, st))
            for t in st:
                df[t] = df.get(t, 0) + 1
    n = max(len(rows), 1)
    idf = {t: math.log((n + 1) / (df.get(t, 0) + 1)) + 1 for t in q_stems}
    total = sum(idf.values())

    hits = []
    for v, segs, i, st in rows:
        matched = [t for t in q_stems if t in st]
        if not matched:
            continue
        coverage = sum(idf[t] for t in matched) / total
        if coverage < MIN_COVERAGE:
            continue
        seg = segs[i]
        bonus = 0.25 if phrase and phrase in " ".join(w.lower() for w in _WORD.findall(seg["text"])) else 0.0
        hits.append((coverage + bonus, v, segs, i))

    hits.sort(key=lambda h: (-h[0], _ts(h[1].get("uploaded_at")) or datetime.min))

    out, taken = [], {}
    for score, v, segs, i in hits:
        seg = segs[i]
        mine = taken.setdefault(v["id"], [])
        if len(mine) >= per_video or any(abs(seg["start_time"] - t) < HIT_SPACING_SECONDS for t in mine):
            continue
        mine.append(seg["start_time"])

        seg_words = {stem(w) for w in _WORD.findall(seg["text"].lower())}
        kw = [k for k in sorted(v.get("keywords") or [], key=lambda k: -float(k.get("score") or 0))
              if stem(k.get("word") or "") in seg_words]
        concept = (kw[0]["word"] if kw else query.strip()).strip()
        context = " ".join(s["text"].strip() for s in segs[max(0, i - 1): i + 2])

        out.append({
            "video_id": v["id"], "filename": v["filename"],
            "uploaded_at": v.get("uploaded_at"), "last_opened_at": v.get("last_opened_at"),
            "concept": concept[:1].upper() + concept[1:],
            "start_time": seg["start_time"], "end_time": seg["end_time"],
            "text": seg["text"].strip(), "context": truncate(context, 320),
            "score": round(score, 3),
        })
        if len(out) >= limit:
            break
    return out


def topic_evolution(videos: List[dict], max_concepts: int = 12) -> dict:
    """Concepts (stored keywords) ordered by when the user first met them:
    video upload date, then where in that video they first appear."""
    ordered = sorted(videos, key=lambda v: (_ts(v.get("uploaded_at")) or datetime.min, v["filename"]))
    concepts: Dict[str, dict] = {}

    for rank, v in enumerate(ordered):
        segs = sorted((s for s in v["segments"] if (s.get("text") or "").strip()), key=lambda s: s["start_time"])
        seg_stems = [[stem(w) for w in _WORD.findall(s["text"].lower())] for s in segs]
        for kw in v.get("keywords") or []:
            word = (kw.get("word") or "").strip()
            if not word:
                continue
            key = stem(word)
            positions = [(segs[i], words.count(key)) for i, words in enumerate(seg_stems) if key in words]
            if not positions:
                continue                      # keyword with no supporting transcript text: skip, don't guess
            first_seg = positions[0][0]
            c = concepts.setdefault(key, {"concept": word, "score": 0.0, "videos": [], "_order": (rank, first_seg["start_time"])})
            c["score"] += float(kw.get("score") or 0)
            c["videos"].append({
                "video_id": v["id"], "filename": v["filename"], "uploaded_at": v.get("uploaded_at"),
                "first_time": first_seg["start_time"], "end_time": first_seg["end_time"],
                "mentions": sum(m for _, m in positions),
                "text": truncate(first_seg["text"].strip(), 200),
            })

    top = sorted(concepts.values(), key=lambda c: (-c["score"], c["concept"]))[:max_concepts]
    top.sort(key=lambda c: c["_order"])
    for c in top:
        c.pop("_order")
        c["score"] = round(c["score"], 3)
        c["concept"] = c["concept"][:1].upper() + c["concept"][1:]

    with_data = [v for v in ordered if v.get("keywords")]
    return {
        "concepts": top,
        "video_count": len(with_data),
        "enough_data": len(with_data) >= 2 and len(top) >= 3,
    }
