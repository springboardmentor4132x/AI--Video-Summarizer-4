"""Transcript-grounded card creation and explain-it-yourself feedback."""

import re
from typing import Iterable

from app.models.video import Video

MAX_CARDS_PER_VIDEO = 20
KEYWORD_STOPWORDS = {"a", "an", "and", "for", "of", "the", "to"}
STOPWORDS = {
    "about", "after", "again", "also", "because", "been", "being", "between",
    "could", "does", "during", "from", "have", "into", "more", "most", "other",
    "over", "same", "some", "such", "than", "that", "their", "them", "then",
    "there", "these", "they", "this", "those", "through", "under", "very", "what",
    "when", "where", "which", "while", "with", "would", "your", "you", "the",
    "and", "for", "are", "was", "were", "has", "had", "its", "his", "her", "our",
    "but", "not", "can", "will", "one", "all", "any", "out", "use", "used",
}


def _topic_for(text: str, keywords: list) -> str:
    """Choose a transcript-grounded topic for the recall question."""
    for keyword in sorted(keywords, key=lambda item: item.score, reverse=True):
        term = keyword.word.strip()
        if not term or term.lower() in KEYWORD_STOPWORDS:
            continue
        match = re.search(rf"(?<!\w){re.escape(term)}(?!\w)", text, re.IGNORECASE)
        if match:
            proper_nouns = list(re.finditer(r"(?<!\w)[A-Z][a-z]+(?!\w)", text))
            noun_index = next(
                (
                    index for index, noun in enumerate(proper_nouns)
                    if noun.start() <= match.start() and noun.end() >= match.end()
                ),
                None,
            )
            if noun_index is not None:
                start = end = noun_index
                while (
                    start > 0
                    and text[proper_nouns[start - 1].end():proper_nouns[start].start()].isspace()
                ):
                    start -= 1
                while (
                    end + 1 < len(proper_nouns)
                    and text[proper_nouns[end].end():proper_nouns[end + 1].start()].isspace()
                ):
                    end += 1
                return text[proper_nouns[start].start():proper_nouns[end].end()]
            return match.group(0)
    return ""


def build_card_sources(video: Video) -> list[dict]:
    """Create focused, timestamped card sources from individual transcript sections."""
    segments = sorted(video.transcript_segments, key=lambda item: item.start_time)
    sources = []
    for index, segment in enumerate(segments[:MAX_CARDS_PER_VIDEO], start=1):
        text = segment.text.strip()
        if not text:
            continue
        topic = _topic_for(text, video.keywords)
        is_hindi = bool(re.search(r"[\u0900-\u097f]", text))
        if topic:
            hindi_templates = (
                f"इस भाग में {topic} के बारे में क्या बताया गया है?",
                f"{topic} के बारे में इस भाग का मुख्य विचार क्या है?",
                f"इस भाग में {topic} से जुड़ी कौन-सी बात समझाई गई है?",
            )
            english_templates = (
                f"What does this section explain about {topic}?",
                f"What is the key idea about {topic} in this section?",
                f"What does this section say about {topic}?",
            )
            prompt = (
                hindi_templates[(index - 1) % len(hindi_templates)]
                if is_hindi
                else english_templates[(index - 1) % len(english_templates)]
            )
            label = topic
        else:
            prompt = (
                "इस भाग का मुख्य विचार क्या है?"
                if is_hindi
                else "What is the main idea in this section?"
            )
            label = f"Transcript section {index}"
        sources.append({
            "label": label,
            "prompt": prompt,
            "text": text,
            "start": segment.start_time,
            "end": segment.end_time,
        })
    return sources


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