from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

MODEL_NAME = "facebook/bart-large-cnn"
MAX_INPUT_TOKENS = 1024
CHUNK_TOKENS = 900

_model = None
_tokenizer = None


def _get_model_and_tokenizer():
    global _model, _tokenizer
    if _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
        _model.eval()
    return _model, _tokenizer


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
