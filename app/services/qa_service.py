"""
Ask-about-this-video (Q&A), fully local -- no OpenAI, no external API,
no API key of any kind.

Approach (retrieval + extractive answer, as explicitly allowed for a
project like this rather than requiring a full local generative LLM):

Question
  -> TF-IDF vectorize the question + every transcript segment
  -> rank segments by cosine similarity to the question
  -> take the top-scoring segments (with a minimum-similarity floor,
     so an unrelated question doesn't get a confident-looking but
     meaningless "top segment")
  -> the answer IS the retrieved, relevant transcript text itself
     (clearly presented as an excerpt, not a generated claim) plus its
     timestamps

This never hallucinates by construction: the only text that can appear
in the answer is text that is actually present in the transcript. If
nothing scores above the similarity floor, we say so explicitly
instead of returning a low-confidence guess.

TF-IDF/cosine (scikit-learn) was used instead of a local generative
model because it needs no model download, works instantly on CPU, and
for the specific job here -- "find the transcript passage that answers
this question" -- retrieval quality matters far more than the fluency
of a generated paraphrase.
"""

import re
from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

TOP_K_SEGMENTS = 4
MIN_SIMILARITY = 0.08  # below this, treat the question as unanswerable from the transcript
NO_ANSWER_PHRASE = "The transcript does not contain enough information to answer this question."

_WORD_RE = re.compile(r"[a-zA-Z0-9']+")


def _retrieve_relevant_segments(question: str, segments: List[dict]) -> List[Tuple[dict, float]]:
    """Rank transcript segments by TF-IDF cosine similarity to the
    question. Returns (segment, score) pairs for segments that pass
    MIN_SIMILARITY, most relevant first."""
    texts = [seg.get("text", "") for seg in segments if seg.get("text", "").strip()]
    if not texts:
        return []

    # Question is treated as one more "document" so TF-IDF weights are
    # computed over the same vocabulary as the transcript.
    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        matrix = vectorizer.fit_transform(texts + [question])
    except ValueError:
        # Happens if every segment + the question are pure stopwords/empty
        # after TF-IDF's own tokenization -- nothing meaningful to score.
        return []

    question_vector = matrix[-1]
    segment_vectors = matrix[:-1]
    similarities = cosine_similarity(question_vector, segment_vectors)[0]

    scored = [
        (seg, float(score))
        for seg, score in zip(
            [s for s in segments if s.get("text", "").strip()], similarities
        )
        if score >= MIN_SIMILARITY
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    top = scored[:TOP_K_SEGMENTS]
    # Present in chronological order so the excerpt reads coherently.
    top.sort(key=lambda pair: pair[0]["start_time"])
    return top


def answer_question(question: str, transcript_segments: List[dict]) -> Tuple[str, List[float], bool]:
    """Answer a question grounded ONLY in the video's transcript
    segments -- fully local, no external API call.

    Returns (answer_text, relevant_timestamps, insufficient_info).
    """
    if not question.strip():
        raise ValueError("Question cannot be empty.")

    if not transcript_segments:
        return NO_ANSWER_PHRASE, [], True

    relevant = _retrieve_relevant_segments(question, transcript_segments)

    if not relevant:
        return NO_ANSWER_PHRASE, [], True

    excerpt_lines = [
        f"[{seg['start_time']:.1f}s] {seg['text'].strip()}" for seg, _score in relevant
    ]
    answer = (
        "Based on the transcript, the most relevant part"
        + ("s are" if len(relevant) > 1 else " is")
        + ":\n"
        + "\n".join(excerpt_lines)
    )

    timestamps = [seg["start_time"] for seg, _score in relevant]

    return answer, timestamps, False
