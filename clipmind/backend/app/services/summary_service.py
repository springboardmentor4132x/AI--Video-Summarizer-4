"""
Local, fully-offline summarization using a Hugging Face
sequence-to-sequence model (facebook/bart-large-cnn by default).

No OpenAI dependency, no network call at inference time, no API key
required. The model name is configurable via
Settings.SUMMARIZATION_MODEL_NAME (env var SUMMARIZATION_MODEL_NAME) so
a deployment can swap in a different checkpoint without code changes.

Model loading is centralized in _get_model_and_tokenizer(): the model
is loaded once per process (module-level cache) and reused for every
summarization request, instead of being reloaded per call.
"""

from app.core.config import settings
from app.services.model_manager import get_summarization_model

MODEL_NAME = settings.SUMMARIZATION_MODEL_NAME
MAX_INPUT_TOKENS = 1024
CHUNK_TOKENS = 900


def _get_model_and_tokenizer():
    """Delegates to the centralized model manager (app/services/
    model_manager.py), which loads and caches the model once per
    process. Kept as a thin wrapper here so the rest of this file
    reads the same as before."""
    return get_summarization_model(MODEL_NAME)
def _summarize_text(text: str, max_length: int, min_length: int) -> str:
    import torch
    model, tokenizer = _get_model_and_tokenizer()
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_INPUT_TOKENS,
    )
    safe_min = min(min_length, max(max_length - 10, 10))
    safe_max = max(max_length, safe_min + 10)
    with torch.no_grad():
        summary_ids = model.generate(
            inputs["input_ids"],
            attention_mask=inputs.get("attention_mask"),
            max_length=safe_max,
            min_length=safe_min,
            do_sample=False,
            num_beams=4,
        )
    return tokenizer.decode(summary_ids[0], skip_special_tokens=True).strip()
def _chunk_text(text: str, max_tokens: int) -> list[str]:
    _, tokenizer = _get_model_and_tokenizer()
    if len(tokenizer.encode(text, add_special_tokens=False)) <= max_tokens:
        return [text]
    chunks: list[str] = []
    current: list[str] = []
    for word in text.split():
        candidate = " ".join(current + [word])
        if len(tokenizer.encode(candidate, add_special_tokens=False)) > max_tokens:
            if current:
                chunks.append(" ".join(current))
                current = [word]
            else:
                chunks.append(word)
        else:
            current.append(word)
    if current:
        chunks.append(" ".join(current))
    return chunks or [text]
def generate_summaries(transcript: str) -> dict:
    """Produce a short overview and a longer, genuinely distinct
    detailed summary for a transcript. Long transcripts are chunked
    (CHUNK_TOKENS words-worth of tokens per chunk) and summarized in
    two passes so length is never limited by the model's context
    window. Raises whatever the underlying model call raises (e.g. if
    the model weights are unavailable) — the caller in process_video.py
    treats that as a best-effort optional step, not a hard failure of
    the whole video.
    """
    if not transcript.strip():
        return {
            "short_summary": "No speech detected.",
            "detailed_summary": "No speech detected.",
        }
    chunks = _chunk_text(transcript, CHUNK_TOKENS)
    if len(chunks) == 1:
        short_summary = _summarize_text(chunks[0], max_length=80, min_length=30)
        detailed_summary = _summarize_text(chunks[0], max_length=400, min_length=150)
    else:
        chunk_summaries = [
            _summarize_text(chunk, max_length=120, min_length=40)
            for chunk in chunks
        ]
        combined = " ".join(chunk_summaries)
        short_summary = _summarize_text(combined, max_length=80, min_length=30)
        detailed_summary = _summarize_text(combined, max_length=400, min_length=150)
    return {
        "short_summary": short_summary.strip(),
        "detailed_summary": detailed_summary.strip(),
    }