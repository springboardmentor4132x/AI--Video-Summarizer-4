"""
Evidence Lens: answer a question about a video AND show the transcript
evidence behind it (exact text, start/end timestamps, match strength).

Reuses the retrieval already implemented in qa_service.py -- no second
search engine. Every string returned comes straight from the transcript,
so nothing in the answer or the evidence is invented.
"""

import re
from typing import List

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

from app.services.qa_service import (
    NO_ANSWER_PHRASE,
    _WORD_RE,
    _retrieve_relevant_segments,
)

# Similarity thresholds for the strength label. These are starting
# guesses -- try a few real questions and adjust.
STRONG_SCORE = 0.30
MODERATE_SCORE = 0.15

# An answer should be a real statement, not a 2-3 word fragment.
MIN_ANSWER_WORDS = 6

# Common abbreviations. The expansion is APPENDED to the question (never
# replaces it), so "what is ML" also searches for "machine learning".
ABBREVIATIONS = {
    "ml": "machine learning",
    "dl": "deep learning",
    "ai": "artificial intelligence",
    "nlp": "natural language processing",
    "llm": "large language model",
}

# Wording that makes a sentence read like a definition / explanation.
_DEFINITION_RE = re.compile(
    r"\b(is|are|means|refers? to|is called|defined as|allows?|helps?|"
    r"enables?|used to|used for|works? by|finds?|learns?|makes?|lets?|"
    r"teaches?|uses?)\b",
    re.IGNORECASE,
)

# Wording that points at other content instead of explaining anything.
_META_RE = re.compile(
    r"\b(next video|previous video|this video|in this lesson|welcome|"
    r"today we|today i|subscribe|going to (talk|explain|cover|discuss)|"
    r"i'll explain|i will explain|let's get started|stay tuned)\b",
    re.IGNORECASE,
)


def _stem(word: str) -> str:
    """Very simple word-form stemmer: learn / learns / learning / learned
    all become "learn". Deliberately light -- no external library -- and
    applied consistently to both the question and the transcript."""
    w = word.lower()
    if w.endswith("'s"):
        w = w[:-2]
    w = w.replace("'", "")
    if len(w) <= 3:
        return w
    # plurals / verb -s
    if w.endswith("ies") and len(w) > 4:
        w = w[:-3] + "y"
    elif w.endswith(("sses", "xes", "zes", "ches", "shes")):
        w = w[:-2]
    elif w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]
    # -ing / -ed
    if w.endswith("ing") and len(w) > 5:
        w = w[:-3]
        if len(w) >= 3 and w[-1] == w[-2] and w[-1] not in "lsz":
            w = w[:-1]  # running -> run
    elif w.endswith("ed") and len(w) > 4:
        w = w[:-2]
        if len(w) >= 3 and w[-1] == w[-2] and w[-1] not in "lsz":
            w = w[:-1]
    # trailing e, so make / making / makes all meet at "mak"
    if w.endswith("e") and len(w) > 3:
        w = w[:-1]
    return w


def _stem_text(text: str) -> str:
    """Stem every non-stop word so the TF-IDF search matches word forms.
    Stop words are left alone so the vectorizer's own stop list still
    recognises them."""
    out = []
    for word in _WORD_RE.findall(text.lower()):
        out.append(word if word in ENGLISH_STOP_WORDS else _stem(word))
    return " ".join(out)


def _retrieve_stemmed(question: str, segments: List[dict]) -> list:
    """Run the existing qa_service retrieval on stemmed text, then map the
    hits back to the ORIGINAL transcript wording (quotes stay exact)."""
    stemmed_segments = [
        {
            "start_time": seg["start_time"],
            "end_time": seg.get("end_time", seg["start_time"]),
            "text": _stem_text(seg.get("text", "")),
            "orig_text": seg.get("text", ""),
        }
        for seg in segments
    ]
    hits = _retrieve_relevant_segments(_stem_text(question), stemmed_segments)
    return [
        (
            {
                "start_time": seg["start_time"],
                "end_time": seg["end_time"],
                "text": seg["orig_text"],
            },
            score,
        )
        for seg, score in hits
    ]


def _strength(score: float) -> str:
    if score >= STRONG_SCORE:
        return "strong"
    if score >= MODERATE_SCORE:
        return "moderate"
    return "weak"


def _is_question(text: str) -> bool:
    return text.strip().endswith("?")


def _expand_question(question: str) -> str:
    """Append the long form of any known abbreviation in the question."""
    lowered = question.lower()
    extras = []
    for token in _WORD_RE.findall(lowered):
        expansion = ABBREVIATIONS.get(token)
        if expansion and expansion not in lowered and expansion not in extras:
            extras.append(expansion)
    return f"{question} {' '.join(extras)}".strip() if extras else question


def _matched_words(question: str, text: str) -> List[str]:
    """Words in the segment (as written) that match a question word,
    ignoring word form, so the UI can highlight them."""
    q_stems = {
        _stem(w)
        for w in _WORD_RE.findall(question.lower())
        if len(w) > 2 and w not in ENGLISH_STOP_WORDS
    }
    found: List[str] = []
    for w in _WORD_RE.findall(text.lower()):
        if (
            len(w) > 2
            and w not in ENGLISH_STOP_WORDS
            and _stem(w) in q_stems
            and w not in found
        ):
            found.append(w)
    return sorted(found)


def _answer_score(seg: dict, similarity: float) -> float:
    """Rank candidate answers: relevant, definition-like, not meta talk."""
    text = seg["text"].strip()
    score = similarity
    if _DEFINITION_RE.search(text):
        score += 0.25
    if _META_RE.search(text):
        score -= 0.5
    return score


def _pick_answer(relevant: list) -> dict:
    """Prefer a substantive, explanatory statement as the answer.

    Plain similarity favours short fragments and sentences that merely
    mention the topic ("In the next video I'll explain ..."), so each
    candidate is also scored on definition-style wording and penalised
    for meta talk. Falls back to the top-scoring segment if nothing
    qualifies, so it never returns nothing.
    """

    def usable(seg: dict) -> bool:
        text = seg["text"].strip()
        return len(text.split()) >= MIN_ANSWER_WORDS and not _is_question(text)

    candidates = [pair for pair in relevant if usable(pair[0])] or relevant
    best_seg, _ = max(candidates, key=lambda pair: _answer_score(pair[0], pair[1]))
    return best_seg


def answer_with_evidence(question: str, transcript_segments: List[dict]) -> dict:
    """Return a short quoted answer plus the transcript evidence behind it.

    Result shape:
        {
          "answer": str,                 # best explanatory transcript sentence
          "evidence": [                  # chronological order
              {"start_time", "end_time", "text", "score",
               "strength", "matched_words"}, ...
          ],
          "insufficient_info": bool,     # True -> no evidence found
        }
    """
    if not question.strip():
        raise ValueError("Question cannot be empty.")

    search_question = _expand_question(question)

    relevant = (
        _retrieve_stemmed(search_question, transcript_segments)
        if transcript_segments
        else []
    )

    if not relevant:
        return {
            "answer": NO_ANSWER_PHRASE,
            "evidence": [],
            "insufficient_info": True,
        }

    answer_seg = _pick_answer(relevant)

    # A speaker posing the question, or pointing at other videos, is not
    # evidence of an answer, so hide those segments -- unless that would
    # leave nothing to show.
    evidence_pairs = [
        p
        for p in relevant
        if not _is_question(p[0]["text"]) and not _META_RE.search(p[0]["text"])
    ] or relevant

    evidence = [
        {
            "start_time": seg["start_time"],
            "end_time": seg.get("end_time", seg["start_time"]),
            "text": seg["text"].strip(),
            "score": round(score, 3),
            "strength": _strength(score),
            "matched_words": _matched_words(search_question, seg["text"]),
        }
        for seg, score in evidence_pairs  # already in chronological order
    ]

    return {
        "answer": answer_seg["text"].strip(),
        "evidence": evidence,
        "insufficient_info": False,
    }