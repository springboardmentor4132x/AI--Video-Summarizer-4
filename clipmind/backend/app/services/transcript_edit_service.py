"""
Transcript editing (original spec: "Transcript editing", Educator "Review and
edit transcripts").

Only the TEXT of existing segments can change. Start/end times are never
touched, so every timestamp link in the app (Story, Memory Deck, Evidence...)
keeps pointing at the right moment of the video.
"""

from typing import Dict, List, Tuple

MAX_SEGMENT_CHARS = 2000
MAX_EDITS_PER_REQUEST = 500


def apply_segment_edits(segments: List[dict], edits: List[dict]) -> Tuple[List[dict], int]:
    """
    segments: [{start_time, end_time, text}]; edits: [{index, text}].
    Returns (new_segments, number_of_segments_whose_text_changed).
    Raises ValueError with a user-facing message for any invalid edit; nothing
    is applied unless ALL edits are valid.
    """
    if not edits:
        raise ValueError("No edits were provided.")
    if len(edits) > MAX_EDITS_PER_REQUEST:
        raise ValueError(f"Too many edits in one request (maximum {MAX_EDITS_PER_REQUEST}).")

    seen = set()
    cleaned: Dict[int, str] = {}
    for e in edits:
        idx = e.get("index")
        if not isinstance(idx, int) or isinstance(idx, bool) or idx < 0 or idx >= len(segments):
            raise ValueError(f"Segment {idx!r} does not exist.")
        if idx in seen:
            raise ValueError(f"Segment {idx} was edited more than once in the same request.")
        seen.add(idx)
        text = e.get("text")
        if not isinstance(text, str):
            raise ValueError(f"Segment {idx}: text must be a string.")
        text = " ".join(text.split())          # collapse stray whitespace/newlines
        if not text:
            raise ValueError(f"Segment {idx}: text cannot be empty.")
        if len(text) > MAX_SEGMENT_CHARS:
            raise ValueError(f"Segment {idx}: text is too long (maximum {MAX_SEGMENT_CHARS} characters).")
        cleaned[idx] = text

    changed = 0
    result = []
    for i, seg in enumerate(segments):
        new = dict(seg)
        if i in cleaned and cleaned[i] != seg.get("text", ""):
            new["text"] = cleaned[i]
            changed += 1
        result.append(new)
    return result, changed


def rebuild_transcript(segments: List[dict]) -> str:
    """The flat transcript string is always derived from the segments."""
    return " ".join(s["text"].strip() for s in segments if s.get("text", "").strip())
