from importlib import import_module

process_video = import_module("app.services.process_video")


def test_transcribe_audio_forwards_explicit_language(monkeypatch):
    class FakeWhisper:
        def transcribe(self, audio_path, **options):
            assert audio_path == "sample.wav"
            assert options == {
                "task": "transcribe",
                "language": "hi",
                "fp16": False,
                "initial_prompt": process_video.HINDI_TRANSCRIPTION_PROMPT,
            }
            return {
                "text": " नमस्ते ",
                "segments": [{"start": 0, "end": 1, "text": " नमस्ते "}],
            }

    def get_fake_model(model_name):
        assert model_name == process_video.settings.WHISPER_HINDI_MODEL_NAME
        return FakeWhisper()

    monkeypatch.setattr(process_video, "get_whisper_model_cached", get_fake_model)
    released_models = []
    monkeypatch.setattr(
        process_video,
        "release_whisper_model",
        released_models.append,
    )

    result = process_video.transcribe_audio("sample.wav", language="hi")

    assert released_models == [process_video.settings.WHISPER_HINDI_MODEL_NAME]
    assert result == {
        "text": "नमस्ते",
        "segments": [{"start_time": 0.0, "end_time": 1.0, "text": "नमस्ते"}],
    }


def test_transcribe_audio_uses_auto_detection_by_default(monkeypatch):
    class FakeWhisper:
        def transcribe(self, _audio_path, **options):
            assert options == {
                "task": "transcribe",
                "language": None,
                "fp16": False,
            }
            return {"text": "hello", "segments": []}

    def get_fake_model(model_name):
        assert model_name == process_video.settings.WHISPER_MODEL_NAME
        return FakeWhisper()

    monkeypatch.setattr(process_video, "get_whisper_model_cached", get_fake_model)

    assert process_video.transcribe_audio("sample.wav")["text"] == "hello"
