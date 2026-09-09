MAX_KEY_MOMENTS = 5 
def detect_key_moments(transcript: str, video_duration_seconds: float | None = None) -> list[dict]:
    """
    PLACEHOLDER implementation.
 
    Splits the transcript into a handful of roughly equal chunks and
    treats each chunk as a "key moment", using its position in the
    transcript to estimate timestamps if a video duration is known.
    This is NOT real key-moment detection — it exists so the rest of
    the pipeline (API, database, frontend) can be built and tested
    end-to-end before the real AI logic is ready.
    """
    if not transcript.strip():
        return []
    words = transcript.split()
    if not words:
        return []
    chunk_count = min(MAX_KEY_MOMENTS, max(1, len(words) // 40))
    chunk_size = max(1, len(words) // chunk_count)
    chunks = [
        " ".join(words[i:i + chunk_size])
        for i in range(0, len(words), chunk_size)
    ][:chunk_count]
    total_chunks = len(chunks)
    duration = video_duration_seconds or 0.0
    key_moments = []
    for i, chunk in enumerate(chunks):
        start_time = (duration / total_chunks) * i if duration else float(i * 30)
        end_time = (duration / total_chunks) * (i + 1) if duration else float((i + 1) * 30)
        key_moments.append({
            "start_time": round(start_time, 2),
            "end_time": round(end_time, 2),
            "label": f"Segment {i + 1}",
            "text": chunk[:200],  # short excerpt
            "importance": round(1.0 - (i / total_chunks) * 0.3, 2),  # placeholder scoring
        })
    return key_moments
 