"""
Automatic chapter markers.

Deliberately does NOT make a new AI call: chapters are derived from data
the pipeline has already generated (key_moments), which already contain
real timestamps and short labels grounded in the actual transcript. This
matches the project's own "avoid unnecessary AI calls when the answer
can be derived from already-processed content" requirement.

If a video has no key moments yet (still processing, or that stage
failed), this returns an empty list -- the frontend shows a "chapters
not generated yet" state rather than fabricating anything.
"""

from typing import List

MIN_GAP_FOR_INTRO_SECONDS = 5.0


def generate_chapters(key_moments: List[dict], video_duration_seconds: float | None = None) -> List[dict]:
    """Turn a list of key-moment dicts into a list of chapter dicts.

    Each key moment becomes one chapter, titled from its own label/text
    (real, generated content -- never invented). Chapters are contiguous:
    each one's end_time is the next chapter's start_time, and the last
    one extends to the end of the video if that's known, or to its own
    key moment's end_time otherwise.

    If there's a real gap between time 0 and the first key moment, an
    "Introduction" chapter is added to cover it -- this is a structural
    label, not fabricated content, the same way a table of contents adds
    "Introduction" as a section name without inventing what's discussed.
    """
    if not key_moments:
        return []

    ordered = sorted(key_moments, key=lambda m: m["start_time"])

    chapters: List[dict] = []

    if ordered[0]["start_time"] >= MIN_GAP_FOR_INTRO_SECONDS:
        chapters.append(
            {
                "title": "Introduction",
                "start_time": 0.0,
                "end_time": ordered[0]["start_time"],
            }
        )

    for i, moment in enumerate(ordered):
        title = (moment.get("label") or "").strip()
        if not title:
            # Fall back to a trimmed slice of the real transcript text
            # for this moment rather than a generic placeholder.
            text = (moment.get("text") or "").strip()
            title = (text[:60] + "...") if len(text) > 60 else (text or f"Chapter {i + 1}")

        if i + 1 < len(ordered):
            end_time = ordered[i + 1]["start_time"]
        elif video_duration_seconds and video_duration_seconds > moment["start_time"]:
            end_time = video_duration_seconds
        else:
            end_time = moment["end_time"]

        chapters.append(
            {
                "title": title,
                "start_time": moment["start_time"],
                "end_time": end_time,
            }
        )

    return chapters
