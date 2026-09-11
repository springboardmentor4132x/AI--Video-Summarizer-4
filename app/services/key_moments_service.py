"""
Key-moment detection (Module 3, requirements 2 & 3 — important
video-segment identification + unified key-moment representation).

Real implementation, replacing the earlier equal-chunk placeholder.

Approach (deterministic / content-based, no external AI model, as
called for in the execution plan since the team has no existing
importance-scoring model to reuse):

1. Start from the transcript's real Whisper segments (each already
   has a genuine start/end timestamp - see transcript_service /
   TranscriptSegment) rather than guessing timestamps from word
   position in the flattened transcript.
2. Merge segments that are only a tiny gap apart into slightly larger
   "candidate moments" - raw Whisper segments are often sentence
   fragments a couple of seconds long, which is too granular to be a
   useful "key moment" on its own.
3. Score every candidate on:
     - keyword density  - how many of the video's own top keywords
       (via keyword_service.extract_keywords) appear in it
     - cue phrases       - "important", "remember", "in summary",
       numbers/statistics, questions, etc., which tend to mark
       moments a speaker is flagging as noteworthy
     - length            - very short filler ("um", "okay") is
       penalized so it can't dominate just by matching a keyword
4. Pick the top-scoring candidates, but skip any candidate that
   starts too close to one already picked, so the result isn't full
   of near-duplicate adjacent moments.

If no real segments are available (e.g. an older record from before
this change, or a transcript with no usable timing), this falls back
to the previous equal-chunk estimate so the endpoint still returns
something usable instead of erroring.
"""

import re

from app.services.keyword_service import extract_keywords

MAX_KEY_MOMENTS = 8
MERGE_GAP_SECONDS = 1.5          # merge segments closer together than this
MIN_MOMENT_GAP_SECONDS = 4.0     # don't select two moments closer than this
MIN_CANDIDATE_WORDS = 3          # candidates shorter than this are filler

CUE_PHRASES = (
    "important", "in summary", "to summarize", "in conclusion", "conclusion",
    "remember", "key point", "keep in mind", "note that", "crucial",
    "significant", "essential", "the main", "for example", "for instance",
    "first", "second", "finally", "in other words", "as a result",
)


def _merge_segments(segments: list[dict]) -> list[dict]:
    """Combine adjacent Whisper segments into slightly larger candidates."""
    if not segments:
        return []

    merged = [dict(segments[0])]
    for seg in segments[1:]:
        last = merged[-1]
        gap = seg["start_time"] - last["end_time"]
        if gap <= MERGE_GAP_SECONDS:
            last["end_time"] = seg["end_time"]
            last["text"] = f"{last['text']} {seg['text']}".strip()
        else:
            merged.append(dict(seg))
    return merged


def _cue_score(text: str) -> float:
    lowered = text.lower()
    score = 0.0
    for phrase in CUE_PHRASES:
        if phrase in lowered:
            score += 0.15
    if re.search(r"\d", text):        # mentions a number/date/statistic
        score += 0.1
    if "?" in text:                   # a posed question is often a pivot point
        score += 0.05
    return min(score, 0.5)


def _keyword_density(text: str, keyword_scores: dict[str, float]) -> float:
    if not keyword_scores:
        return 0.0
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if not words:
        return 0.0
    matched = sum(keyword_scores.get(w, 0.0) for w in words)
    return matched / len(words)


def _score_candidate(text: str, keyword_scores: dict[str, float]) -> float:
    word_count = len(text.split())
    if word_count < MIN_CANDIDATE_WORDS:
        return 0.0

    density_score = min(_keyword_density(text, keyword_scores) * 4, 0.6)
    cue = _cue_score(text)
    length_bonus = min(word_count / 60, 0.2)  # mild bonus for substantive moments

    return round(min(density_score + cue + length_bonus, 1.0), 3)


def _label_for(text: str, max_words: int = 8) -> str:
    words = text.strip().split()
    label = " ".join(words[:max_words])
    if len(words) > max_words:
        label += "..."
    return label


def _select_non_overlapping(candidates: list[dict], max_count: int) -> list[dict]:
    """Pick the top-scoring candidates while avoiding near-adjacent duplicates."""
    ranked = sorted(candidates, key=lambda c: c["importance"], reverse=True)
    selected: list[dict] = []
    for candidate in ranked:
        if len(selected) >= max_count:
            break
        too_close = any(
            abs(candidate["start_time"] - chosen["start_time"]) < MIN_MOMENT_GAP_SECONDS
            for chosen in selected
        )
        if too_close:
            continue
        selected.append(candidate)
    selected.sort(key=lambda c: c["start_time"])
    return selected


def _detect_from_segments(segments: list[dict]) -> list[dict]:
    merged = _merge_segments(segments)
    full_text = " ".join(seg["text"] for seg in merged)
    keyword_scores = {kw["word"]: kw["score"] for kw in extract_keywords(full_text)}

    candidates = []
    for seg in merged:
        importance = _score_candidate(seg["text"], keyword_scores)
        if importance <= 0:
            continue
        candidates.append({
            "start_time": round(seg["start_time"], 2),
            "end_time": round(seg["end_time"], 2),
            "label": _label_for(seg["text"]),
            "text": seg["text"][:400],
            "importance": importance,
        })

    if not candidates:
        return []

    return _select_non_overlapping(candidates, MAX_KEY_MOMENTS)


def _detect_from_plain_transcript(transcript: str, video_duration_seconds: float | None) -> list[dict]:
    """
    Fallback used only when no real timestamped segments exist
    (legacy records / edge cases). Same estimate-by-position approach
    as the original placeholder, kept so the endpoint degrades
    gracefully instead of returning nothing.
    """
    words = transcript.split()
    if not words:
        return []
    chunk_count = min(MAX_KEY_MOMENTS, max(1, len(words) // 40))
    chunk_size = max(1, len(words) // chunk_count)
    chunks = [
        " ".join(words[i:i + chunk_size])
        for i in range(0, len(words), chunk_size)
    ][:chunk_count]
    total_chunks = len(chunks)
    duration = video_duration_seconds or 0.0
    key_moments = []
    for i, chunk in enumerate(chunks):
        start_time = (duration / total_chunks) * i if duration else float(i * 30)
        end_time = (duration / total_chunks) * (i + 1) if duration else float((i + 1) * 30)
        key_moments.append({
            "start_time": round(start_time, 2),
            "end_time": round(end_time, 2),
            "label": _label_for(chunk),
            "text": chunk[:400],
            "importance": round(1.0 - (i / total_chunks) * 0.3, 2),
        })
    return key_moments


def detect_key_moments(
    transcript: str,
    video_duration_seconds: float | None = None,
    transcript_segments: list[dict] | None = None,
) -> list[dict]:
    """
    Detect important moments in a video.

    Prefers real per-segment timestamps (`transcript_segments`, each a
    dict with start_time/end_time/text - see TranscriptSegment) when
    available; falls back to an equal-chunk estimate against the flat
    `transcript` string otherwise.
    """
    if transcript_segments:
        result = _detect_from_segments(transcript_segments)
        if result:
            return result

    if not transcript.strip():
        return []

    return _detect_from_plain_transcript(transcript, video_duration_seconds)
