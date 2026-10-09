"""Evidence Lens (Tejashwini's service): grounded answers + transcript evidence."""
from app.services.evidence_service import answer_with_evidence
from app.services.qa_service import NO_ANSWER_PHRASE

SEGS = [
    {"start_time": 0, "end_time": 8, "text": "Welcome to this lesson on databases."},
    {"start_time": 8, "end_time": 20, "text": "A database index is a data structure that speeds up lookups on a table."},
    {"start_time": 20, "end_time": 31, "text": "Normalization is the process of organizing tables to reduce redundancy."},
    {"start_time": 31, "end_time": 42, "text": "Without an index the engine must scan every row of the table."},
]


def test_answer_is_a_real_transcript_sentence_with_timestamps():
    r = answer_with_evidence("What is a database index?", SEGS)
    assert not r["insufficient_info"]
    texts = {s["text"] for s in SEGS}
    assert r["answer"] in texts                      # never invented
    assert r["evidence"] and all(e["text"] in texts for e in r["evidence"])
    starts = [e["start_time"] for e in r["evidence"]]
    assert starts == sorted(starts)                  # chronological
    assert 8 in starts                               # the defining sentence is cited
    assert all(e["strength"] in {"strong", "moderate", "weak"} for e in r["evidence"])


def test_matched_words_come_from_the_segment():
    r = answer_with_evidence("how does normalization reduce redundancy", SEGS)
    hit = next(e for e in r["evidence"] if e["start_time"] == 20)
    assert {"normalization", "redundancy"} <= set(hit["matched_words"])


def test_unrelated_question_reports_no_evidence_instead_of_inventing():
    r = answer_with_evidence("how do rockets reach orbit", SEGS)
    assert r["insufficient_info"] is True
    assert r["evidence"] == [] and r["answer"] == NO_ANSWER_PHRASE


def test_no_transcript_and_empty_question():
    assert answer_with_evidence("what is an index", [])["insufficient_info"] is True
    import pytest
    with pytest.raises(ValueError):
        answer_with_evidence("   ", SEGS)


def test_word_forms_match_via_stemming():
    r = answer_with_evidence("why are indexes useful", SEGS)
    assert not r["insufficient_info"] and any(e["start_time"] == 8 for e in r["evidence"])
