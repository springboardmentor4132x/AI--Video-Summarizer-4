MAX_HIGHLIGHTS = 3
def generate_highlights(key_moments: list[dict], max_highlights: int = MAX_HIGHLIGHTS) -> list[dict]:
    """
    Selects the top `max_highlights` key moments by importance score.

    `key_moments` is a list of dicts shaped like:
        {"start_time": float, "end_time": float, "label": str,
         "text": str, "importance": float}
    (the same shape produced by key_moments_service.detect_key_moments)

    Returns the same shape, just filtered down to the most important
    ones, sorted highest importance first.
    """
    if not key_moments:
        return []
    sorted_moments = sorted(
        key_moments,
        key=lambda m: m.get("importance", 0.0),
        reverse=True,
    )

    return sorted_moments[:max_highlights]