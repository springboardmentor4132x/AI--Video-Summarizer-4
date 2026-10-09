"""
ClipMind Story -- turns a processed video's transcript into story panels.

Deliberately uses NO new AI model and NO external API (consistent with
the rest of this project, which runs fully locally). Everything a panel
shows comes from data the pipeline already produced for that video:

  * transcript_segments -- real Whisper segments with start/end times
  * keywords            -- the video's own extracted keywords + scores
  * key_moments         -- importance scores (used only as a ranking
                           signal; their `label` is just the first words
                           of the transcript, so it is NOT reused as a
                           title)

Algorithm
  1. Group consecutive transcript segments into "scenes" of roughly
     equal length.
  2. Score each scene by (a) how many of the video's keywords it
     contains, (b) the importance of any key moment overlapping it, and
     (c) how much is actually said in it (to avoid filler/silence).
  3. Split the timeline into N equal buckets and keep the best scene of
     each bucket, so the story covers the WHOLE video in order instead
     of clustering around one section. Leftover slots are filled with
     the next-best scenes that are not too close to an already chosen one.
  4. For each chosen scene, derive title / concept / caption /
     transcript excerpt from its own text, formatted per story mode.

All functions are pure (no DB, no FFmpeg) so they are easy to unit test.
"""

import re
from typing import Dict, List, Optional

MODES = ("comic", "storybook", "study_notes", "storyboard")

MODE_LABELS = {
    "comic": "Comic",
    "storybook": "Storybook",
    "study_notes": "Study Notes",
    "storyboard": "Storyboard",
}

# Default number of panels per mode (capped by how much content exists).
DEFAULT_PANELS = {
    "comic": 6,
    "storybook": 5,
    "study_notes": 8,
    "storyboard": 8,
}
MAX_PANELS = 12
MIN_SCENE_SECONDS = 10.0
MAX_SCENE_SECONDS = 45.0
MIN_SCENE_WORDS = 3          # shorter than this is treated as filler
FRAME_OFFSET_SECONDS = 1.0   # take the frame slightly after the scene starts

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "so", "to", "of", "in", "on",
    "at", "for", "with", "about", "as", "by", "is", "are", "was", "were",
    "be", "been", "it", "this", "that", "these", "those",
}

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


# ---------------------------------------------------------------- text utils

def split_sentences(text: str) -> List[str]:
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return []
    parts = [p.strip() for p in _SENTENCE_SPLIT.split(text) if p.strip()]
    return parts or [text]


def truncate(text: str, max_chars: int) -> str:
    """Trim to max_chars at a word boundary, adding an ellipsis if cut."""
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    cut = text[: max_chars - 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return (cut or text[: max_chars - 1]) + "…"


def _capitalize(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def _words(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9']+", (text or "").lower())


def _best_sentence(sentences: List[str], max_chars: int) -> str:
    """First sentence with a few real words that fits; else the first, truncated."""
    for s in sentences:
        if len(s.split()) >= 4 and len(s) <= max_chars:
            return s
    return truncate(sentences[0], max_chars) if sentences else ""


def _title_from(sentences: List[str]) -> str:
    base = _best_sentence(sentences, 200) or ""
    words = base.rstrip(".!?,;: ").split()
    short = " ".join(words[:7])
    if len(words) > 7:
        short += "…"
    return _capitalize(short)


# ------------------------------------------------------------------- scenes

def build_scenes(segments: List[dict], scene_len: float) -> List[dict]:
    """Group consecutive transcript segments into scenes ~scene_len seconds long."""
    scenes: List[dict] = []
    current: Optional[dict] = None

    for seg in sorted(segments, key=lambda s: s["start_time"]):
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        if current is None:
            current = {"start_time": seg["start_time"], "end_time": seg["end_time"], "text": text}
        elif seg["end_time"] - current["start_time"] > scene_len:
            scenes.append(current)
            current = {"start_time": seg["start_time"], "end_time": seg["end_time"], "text": text}
        else:
            current["end_time"] = max(current["end_time"], seg["end_time"])
            current["text"] = f"{current['text']} {text}"

    if current is not None:
        scenes.append(current)
    return scenes


def _score_scenes(scenes: List[dict], key_moments: List[dict], keywords: List[dict]) -> None:
    """Adds a 0..1 `score` and the matched `keywords` to each scene (in place)."""
    kw_scores: Dict[str, float] = {
        (k.get("word") or "").lower(): float(k.get("score") or 0.0)
        for k in keywords if k.get("word")
    }
    max_importance = max((float(m.get("importance") or 0.0) for m in key_moments), default=0.0)

    raw_kw = []
    for scene in scenes:
        words = _words(scene["text"])
        scene["_words"] = words
        matched = sorted(
            {w for w in words if w in kw_scores},
            key=lambda w: kw_scores[w],
            reverse=True,
        )
        scene["keywords"] = matched
        raw_kw.append(sum(kw_scores[w] for w in matched))
    max_kw = max(raw_kw, default=0.0)

    for scene, kw in zip(scenes, raw_kw):
        kw_norm = kw / max_kw if max_kw > 0 else 0.0

        moment_norm = 0.0
        if max_importance > 0:
            overlapping = [
                float(m.get("importance") or 0.0)
                for m in key_moments
                if m["start_time"] < scene["end_time"] and m["end_time"] > scene["start_time"]
            ]
            moment_norm = (max(overlapping) / max_importance) if overlapping else 0.0

        duration = max(scene["end_time"] - scene["start_time"], 1.0)
        density = min(1.0, len(scene["_words"]) / (duration * 2.5))

        scene["score"] = 0.45 * kw_norm + 0.40 * moment_norm + 0.15 * density


def _pick_scenes(scenes: List[dict], n: int) -> List[dict]:
    """Best scene per timeline bucket, then fill leftovers; returned in time order."""
    if n >= len(scenes):
        return list(scenes)

    t0 = scenes[0]["start_time"]
    t1 = max(s["end_time"] for s in scenes)
    span = max(t1 - t0, 1e-6)

    buckets: Dict[int, dict] = {}
    for scene in scenes:
        idx = min(n - 1, int((scene["start_time"] - t0) / span * n))
        best = buckets.get(idx)
        if best is None or scene["score"] > best["score"]:
            buckets[idx] = scene
    chosen = list(buckets.values())

    if len(chosen) < n:
        min_gap = max(5.0, span / (n * 4))
        remaining = sorted(
            (s for s in scenes if s not in chosen), key=lambda s: s["score"], reverse=True
        )
        for scene in remaining:
            if len(chosen) >= n:
                break
            if all(abs(scene["start_time"] - c["start_time"]) >= min_gap for c in chosen):
                chosen.append(scene)

    return sorted(chosen, key=lambda s: s["start_time"])


# ------------------------------------------------------------------ panels

def _caption(mode: str, sentences: List[str]) -> str:
    if mode == "comic":
        return _best_sentence(sentences, 130)               # one speech bubble
    if mode == "storybook":
        out: List[str] = []
        for s in sentences[:3]:                              # short narrative paragraph
            if len(" ".join(out + [s])) > 360:
                break
            out.append(s)
        if out:
            return " ".join(out)
        return truncate(sentences[0], 360) if sentences else ""
    if mode == "study_notes":
        return _best_sentence(sentences, 170)               # key takeaway
    return truncate(_best_sentence(sentences, 200), 90)     # storyboard: shot description


def _concept(scene: dict, sentences: List[str], title: str) -> str:
    if scene["keywords"]:
        return ", ".join(_capitalize(w) for w in scene["keywords"][:3])
    # No keyword hit: fall back to the scene's main sentence, but only if
    # it adds something beyond the title.
    fallback = truncate(_best_sentence(sentences, 200), 80)
    return "" if fallback.rstrip("…").lower() == title.rstrip("…").lower() else fallback


def build_story_panels(
    segments: List[dict],
    key_moments: Optional[List[dict]] = None,
    keywords: Optional[List[dict]] = None,
    mode: str = "comic",
    max_panels: Optional[int] = None,
) -> List[dict]:
    """Return panel dicts (in video order) for the given story mode.

    Each dict has: panel_number, timestamp, start_time, end_time,
    frame_time, title, concept, caption, transcript_excerpt, importance.
    Returns [] when there is no usable transcript content.
    """
    if mode not in MODES:
        raise ValueError(f"Unknown story mode: {mode}")

    key_moments = key_moments or []
    keywords = keywords or []

    usable = [s for s in segments if (s.get("text") or "").strip()]
    if not usable:
        return []

    n = min(max_panels or DEFAULT_PANELS[mode], MAX_PANELS)
    total = max(s["end_time"] for s in usable) - min(s["start_time"] for s in usable)
    scene_len = min(MAX_SCENE_SECONDS, max(MIN_SCENE_SECONDS, total / (n * 2)))

    scenes = build_scenes(usable, scene_len)
    substantive = [s for s in scenes if len(_words(s["text"])) >= MIN_SCENE_WORDS]
    scenes = substantive or scenes
    if not scenes:
        return []

    _score_scenes(scenes, key_moments, keywords)
    chosen = _pick_scenes(scenes, n)

    panels: List[dict] = []
    used_titles = set()
    for i, scene in enumerate(chosen, start=1):
        sentences = split_sentences(scene["text"])
        title = _title_from(sentences)
        if title.lower() in used_titles:
            title = f"{title} (part {i})"
        used_titles.add(title.lower())

        start = round(scene["start_time"], 2)
        end = round(scene["end_time"], 2)
        frame_time = min(start + FRAME_OFFSET_SECONDS, (start + end) / 2)

        panels.append({
            "panel_number": i,
            "timestamp": start,
            "start_time": start,
            "end_time": end,
            "frame_time": round(max(frame_time, 0.0), 2),
            "title": title,
            "concept": _concept(scene, sentences, title),
            "caption": _caption(mode, sentences),
            "transcript_excerpt": truncate(scene["text"], 320),
            "importance": round(scene["score"], 2),
        })
    return panels
