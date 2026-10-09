"""
Video Version Comparison -- compares what two videos actually SAY.

Transcript sentences from the old and new video are matched by TF-IDF
cosine similarity (greedy best pairs), then classified:

  unchanged  essentially the same sentence
  changed    clearly the same point, reworded or with different details
  new        only in the newer video
  removed    only in the older video

This is lexical, not semantic: heavily paraphrased content can show up as
one removed + one new item instead of "changed". The API reports this.
"""

import difflib
import re
from typing import List, Optional

from app.services.insight_service import _sentences_with_time
from app.services.story_service import truncate

MAX_UNITS = 1200
MIN_UNITS = 3
MATCH_THRESHOLD = 0.5       # below this a sentence has no counterpart
UNCHANGED_THRESHOLD = 0.92

_TOKEN = re.compile(r"[a-zA-Z0-9.%']+")
_NUMBER = re.compile(r"\d+(?:\.\d+)?%?")


class InsufficientContent(ValueError):
    pass


def _norm(text: str) -> str:
    return " ".join(w.lower() for w in _TOKEN.findall(text))


def _units(segments: List[dict]) -> List[dict]:
    return [u for u in _sentences_with_time(segments) if len(u["text"].split()) >= 3]


def _explain(old: str, new: str) -> str:
    a, b = _norm(old).split(), _norm(new).split()
    parts = []
    old_nums, new_nums = _NUMBER.findall(old), _NUMBER.findall(new)
    if old_nums != new_nums:
        parts.append(f"Numbers changed: {', '.join(old_nums) or 'none'} to {', '.join(new_nums) or 'none'}.")
    added, removed = [], []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
        if op in ("replace", "delete"):
            removed.append(" ".join(a[i1:i2]))
        if op in ("replace", "insert"):
            added.append(" ".join(b[j1:j2]))
    if added:
        parts.append("Added: " + "; ".join(f"“{truncate(x, 60)}”" for x in added[:3]) + ".")
    if removed:
        parts.append("Removed: " + "; ".join(f"“{truncate(x, 60)}”" for x in removed[:3]) + ".")
    return " ".join(parts) or "Wording differs slightly."


def _similarity_matrix(old_texts: List[str], new_texts: List[str]):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import linear_kernel
    try:
        vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True,
                              token_pattern=r"(?u)\b\w+\b")   # keep single digits: "4 weeks" vs "6 weeks"
        m = vec.fit_transform(old_texts + new_texts)
    except ValueError:                      # every sentence was stop words
        return None
    return linear_kernel(m[: len(old_texts)], m[len(old_texts):])


def compare_transcripts(old_segments: List[dict], new_segments: List[dict]) -> dict:
    old_u, new_u = _units(old_segments), _units(new_segments)
    truncated = len(old_u) > MAX_UNITS or len(new_u) > MAX_UNITS
    old_u, new_u = old_u[:MAX_UNITS], new_u[:MAX_UNITS]
    if len(old_u) < MIN_UNITS or len(new_u) < MIN_UNITS:
        raise InsufficientContent("Both videos need at least a few sentences of transcript to be compared.")

    sim = _similarity_matrix([u["text"] for u in old_u], [u["text"] for u in new_u])

    pairs = []
    old_norm = {i: _norm(u["text"]) for i, u in enumerate(old_u)}
    new_norm = {j: _norm(u["text"]) for j, u in enumerate(new_u)}
    for i in range(len(old_u)):
        for j in range(len(new_u)):
            if old_norm[i] and old_norm[i] == new_norm[j]:
                s = 1.0
            elif sim is not None:
                s = float(sim[i][j])
            else:
                continue
            if s >= MATCH_THRESHOLD:
                pairs.append((s, i, j))
    pairs.sort(key=lambda p: (-p[0], abs(old_u[p[1]]["start_time"] - new_u[p[2]]["start_time"])))

    used_old, used_new, matched = set(), set(), []
    for s, i, j in pairs:
        if i in used_old or j in used_new:
            continue
        used_old.add(i); used_new.add(j); matched.append((s, i, j))

    items: List[dict] = []
    for s, i, j in matched:
        o, n = old_u[i], new_u[j]
        status = "unchanged" if s >= UNCHANGED_THRESHOLD else "changed"
        items.append({
            "status": status, "text": n["text"], "old_text": o["text"],
            "old_start": o["start_time"], "old_end": o["end_time"],
            "new_start": n["start_time"], "new_end": n["end_time"],
            "similarity": round(s, 3),
            "explanation": "" if status == "unchanged" else _explain(o["text"], n["text"]),
        })
    for j, n in enumerate(new_u):
        if j not in used_new:
            items.append({"status": "new", "text": n["text"], "old_text": None, "old_start": None, "old_end": None,
                          "new_start": n["start_time"], "new_end": n["end_time"], "similarity": None,
                          "explanation": "This point appears only in the newer video."})
    for i, o in enumerate(old_u):
        if i not in used_old:
            items.append({"status": "removed", "text": o["text"], "old_text": o["text"],
                          "old_start": o["start_time"], "old_end": o["end_time"],
                          "new_start": None, "new_end": None, "similarity": None,
                          "explanation": "This point appears only in the older video."})

    order = {"changed": 0, "new": 1, "removed": 2, "unchanged": 3}
    items.sort(key=lambda it: (order[it["status"]], it["new_start"] if it["new_start"] is not None else it["old_start"]))

    counts = {k: sum(1 for it in items if it["status"] == k) for k in order}
    denom = max(len(old_u), len(new_u))
    similarity = round((counts["unchanged"] + 0.5 * counts["changed"]) / denom, 3)
    verdict = ("Very similar" if similarity >= 0.85 else "Partly different" if similarity >= 0.5
               else "Substantially different")
    return {"counts": counts, "similarity": similarity, "verdict": verdict, "truncated": truncated, "items": items}
