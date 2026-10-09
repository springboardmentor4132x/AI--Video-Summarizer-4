"""Transcript-grounded card creation and explain-it-yourself feedback."""

import re
from typing import Iterable

from app.models.video import Video

MAX_CARDS_PER_VIDEO = 20
STOPWORDS = {
    "about", "after", "again", "also", "because", "been", "being", "between",
    "could", "does", "during", "from", "have", "into", "more", "most", "other",
    "over", "same", "some", "such", "than", "that", "their", "them", "then",
    "there", "these", "they", "this", "those", "through", "under", "very", "what",
    "when", "where", "which", "while", "with", "would", "your", "you", "the",
    "and", "for", "are", "was", "were", "has", "had", "its", "his", "her", "our",
    "but", "not", "can", "will", "one", "all", "any", "out", "use", "used",
}


def build_card_sources(video: Video) -> list[dict]:
    """Use real timestamped key moments, or transcript segments as fallback."""
    moments = sorted(video.key_moments, key=lambda item: item.start_time)
    sources = [
        {
            "label": moment.label.strip() or "Key idea",
            "text": moment.text.strip(),
            "start": moment.start_time,
            "end": moment.end_time,
        }
        for moment in moments
        if moment.text.strip()
    ]
    if sources:
        return sources[:MAX_CARDS_PER_VIDEO]

    return [
        {
            "label": "Transcript concept",
            "text": segment.text.strip(),
            "start": segment.start_time,
            "end": segment.end_time,
        }
        for segment in video.transcript_segments[:MAX_CARDS_PER_VIDEO]
        if segment.text.strip()
    ]


def explain_against_source(explanation: str, source: str) -> tuple[list[str], list[str]]:
    """Compare meaningful source terms with the learner's own response."""
    def terms(text: str) -> set[str]:
        return {
            word.lower()
            for word in re.findall(r"[a-zA-Z][a-zA-Z'-]{2,}", text)
            if word.lower() not in STOPWORDS
        }

    source_terms = terms(source)
    explanation_terms = terms(explanation)
    matched = sorted(source_terms & explanation_terms)
    missing = sorted(source_terms - explanation_terms)
    return matched, missing


def explanation_feedback(matched: Iterable[str], missing: Iterable[str]) -> str:
    matched_terms = list(matched)
    missing_terms = list(missing)
    if not matched_terms:
        return "I could not match key terms in that explanation. Review the source section, then try describing its main idea in your own words."
    if missing_terms:
        return "Your explanation shares some terms with the source. Revisit the section and consider these other ideas: " + ", ".join(missing_terms[:5]) + "."
    return "Your explanation includes the key terms found in this source section. Revisit it once to check the details and connections."