"""
Centralized local-model loading.

Every model this application uses (Whisper for transcription, BART for
summarization, NLLB for translation) is loaded through this module,
exactly once per process, and cached at module level. Nothing in this
codebase loads a model directly anywhere else — process_video.py,
summary_service.py and translation_service.py all call into here.

This module has NO OpenAI import and NO dependency on any external API
key. Every model here runs locally, on CPU by default and on GPU
automatically if one is available (torch.cuda.is_available()).

First use of each model downloads its weights from Hugging Face /
the Whisper release into the local cache (~/.cache/huggingface,
~/.cache/whisper) and reuses that cache on every subsequent run —
see docs/AI_PIPELINE.md for exact sizes and offline-deployment notes.
"""

import os

# This app runs Transformers models through PyTorch, not TensorFlow.
os.environ["USE_TF"] = "0"

import torch

_device = "cuda" if torch.cuda.is_available() else "cpu"

_whisper_models = {}
_summarization_model = None
_summarization_tokenizer = None
_translation_model = None
_translation_tokenizer = None


class ModelUnavailable(RuntimeError):
    """Raised when a local model fails to load (missing weights, no
    disk space, corrupt cache, etc). This is a "the local model isn't
    usable right now" error -- never a missing-API-key error, since
    none of these models need one."""


def device() -> str:
    return _device


def get_whisper_model(model_name: str):
    if model_name not in _whisper_models:
        import whisper
        try:
            _whisper_models[model_name] = whisper.load_model(
                model_name,
                device=_device,
            )
        except Exception as exc:
            raise ModelUnavailable(
                f"Could not load local Whisper model '{model_name}': {exc}"
            ) from exc
    return _whisper_models[model_name]


def release_whisper_model(model_name: str) -> None:
    """Release a Whisper checkpoint when later pipeline stages need RAM."""
    model = _whisper_models.pop(model_name, None)
    if model is not None:
        del model
        import gc
        gc.collect()
        if _device == "cuda":
            torch.cuda.empty_cache()


def get_summarization_model(model_name: str):
    """Returns (model, tokenizer) for the local BART-family
    summarization model, loaded once and cached."""
    global _summarization_model, _summarization_tokenizer
    if _summarization_model is None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        try:
            _summarization_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _summarization_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            _summarization_model.to(_device)
            _summarization_model.eval()
        except Exception as exc:
            raise ModelUnavailable(
                f"Could not load local summarization model '{model_name}': {exc}"
            ) from exc
    return _summarization_model, _summarization_tokenizer


def get_translation_model(model_name: str):
    """Returns (model, tokenizer) for the local NLLB translation
    model, loaded once and cached."""
    global _translation_model, _translation_tokenizer
    if _translation_model is None:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        try:
            _translation_tokenizer = AutoTokenizer.from_pretrained(model_name)
            _translation_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            _translation_model.to(_device)
            _translation_model.eval()
        except Exception as exc:
            raise ModelUnavailable(
                f"Could not load local translation model '{model_name}': {exc}"
            ) from exc
    return _translation_model, _translation_tokenizer


def get_model_status() -> dict:
    """Which local models are currently loaded in this process (not
    whether they're theoretically available -- they're lazy-loaded on
    first use, so a fresh process shows everything False until each
    feature is actually used once)."""
    return {
        "device": _device,
        "whisper_loaded": bool(_whisper_models),
        "summarization_loaded": _summarization_model is not None,
        "translation_loaded": _translation_model is not None,
    }
