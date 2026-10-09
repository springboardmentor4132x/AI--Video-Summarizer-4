"""
Summary translation, fully local -- no OpenAI, no external API, no API
key of any kind.

Uses Meta's NLLB-200 (facebook/nllb-200-distilled-600M by default), a
single open-source model that covers all six required languages
directly, rather than hunting for six separate per-language MarianMT
checkpoints. Model loading goes through the centralized model manager
(app/services/model_manager.py) -- loaded once, reused for every
translation call.

Translates the ALREADY-GENERATED short_summary/summary -- never
retranscribes or resummarizes the video. Caching (so the model never
runs twice for the same video+language) is the caller's job in
videos.py, since that's where the Video document (the cache) lives;
this module only does the actual translation.
"""

from app.core.config import settings
from app.services.model_manager import get_translation_model, ModelUnavailable

MODEL_NAME = settings.TRANSLATION_MODEL_NAME

# NLLB-200 language codes (FLORES-200 codes), for the six languages
# this project targets. English source is always "eng_Latn".
SUPPORTED_LANGUAGES = {
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
}

_NLLB_CODES = {
    "te": "tel_Telu",
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "bn": "ben_Beng",
}

_SOURCE_LANG = "eng_Latn"
_MAX_INPUT_TOKENS = 512


def _translate_text(text: str, target_code: str) -> str:
    import torch

    model, tokenizer = get_translation_model(MODEL_NAME)

    tokenizer.src_lang = _SOURCE_LANG
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=_MAX_INPUT_TOKENS,
    )

    # transformers>=4.x exposes the target-language forced-BOS token
    # id via convert_tokens_to_ids on the language code token.
    forced_bos_token_id = tokenizer.convert_tokens_to_ids(target_code)

    with torch.no_grad():
        generated = model.generate(
            **inputs,
            forced_bos_token_id=forced_bos_token_id,
            max_length=_MAX_INPUT_TOKENS,
            num_beams=4,
        )

    return tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()


def translate_summary(short_summary: str, detailed_summary: str, language_code: str) -> tuple[str, str]:
    """Translate both summary fields into the target language, fully
    locally. Returns (translated_short, translated_detailed).

    Raises ValueError for an unsupported language code or empty input,
    and ModelUnavailable if the local translation model can't be
    loaded (e.g. weights not downloaded / no disk space) -- the caller
    turns that into a clear error rather than silently producing
    empty/fake text.
    """
    if language_code not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language code '{language_code}'. "
            f"Supported: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    if not short_summary.strip() and not detailed_summary.strip():
        raise ValueError("Nothing to translate -- summary has not been generated yet.")

    target_code = _NLLB_CODES[language_code]

    translated_short = (
        _translate_text(short_summary, target_code) if short_summary.strip() else ""
    )
    translated_detailed = (
        _translate_text(detailed_summary, target_code) if detailed_summary.strip() else ""
    )

    return translated_short, translated_detailed
