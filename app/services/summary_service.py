import time
from typing import Tuple

CHUNK_SIZE_CHARS = 3000  # placeholder threshold; tune once real model is wired in


def _chunk_transcript(transcript_text: str, chunk_size: int = CHUNK_SIZE_CHARS):
    return [transcript_text[i:i + chunk_size] for i in range(0, len(transcript_text), chunk_size)]


def summarize_transcript(transcript_text: str) -> Tuple[str, str]:
    """
    MOCK AI summarization.
    Amrita: replace this body with the real BART/T5 model + chunking logic.
    Keep the function name and signature the same.
    """
    time.sleep(0.2)  # simulate processing delay
    chunks = _chunk_transcript(transcript_text)  # currently just splits for structure; not model-summarized yet

    short_summary = (
        "[MOCK SHORT SUMMARY] Machine learning enables computers to learn patterns "
        "from data and make predictions without being explicitly programmed."
    )
    detailed_summary = (
        "[MOCK DETAILED SUMMARY] Covers what machine learning is, supervised learning, "
        "unsupervised learning, reinforcement learning, and applications discussed in "
        f"the video. (Processed from {len(chunks)} chunk(s) of the transcript.) Replace "
        "this with real chunked-and-combined model output once summarization is integrated."
    )
    return short_summary, detailed_summary