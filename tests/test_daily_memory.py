"""ClipMind Daily x Memory Deck: weak cards become 'memory_review' items (pure logic)."""
from app.services.daily_service import build_daily_items

VID = {"id": "v1", "filename": "db.mp4", "uploaded_at": None, "duration": 600,
       "key_moments": [], "keywords": [], "segments": [{"start_time": 0, "end_time": 600, "text": "x"}]}


def card(strength, start, prompt="Explain the key idea: indexes", vid="v1", due=None):
    return {"video_id": vid, "prompt": prompt, "strength": strength, "source_start": start,
            "source_end": start + 20, "next_review_at": due}


def test_weak_cards_are_planned_forgotten_first_with_source_timestamps():
    items = build_daily_items(30, [VID], [], {}, [card("needs_review", 100), card("forgotten", 200), card("strong", 300)])
    mem = [i for i in items if i["kind"] == "memory_review"]
    assert [i["start_time"] for i in mem] == [200.0, 100.0]       # forgotten first, strong excluded
    assert all(i["video_id"] == "v1" and i["end_time"] > i["start_time"] for i in mem)
    assert items[0]["kind"] == "memory_review"                     # review comes first


def test_no_weak_cards_means_no_memory_items_and_no_invention():
    assert build_daily_items(30, [VID], [], {}, [card("strong", 10)]) == []
    assert build_daily_items(30, [VID], [], {}, None) == []


def test_cards_for_unknown_videos_are_ignored_and_count_is_capped():
    many = [card("needs_review", i * 30) for i in range(20)] + [card("forgotten", 5, vid="gone")]
    items = build_daily_items(120, [VID], [], {}, many)
    mem = [i for i in items if i["kind"] == "memory_review"]
    assert 0 < len(mem) <= 5 and all(i["video_id"] == "v1" for i in mem)
