"""
Learning insights built ONLY from a video's own stored data
(transcript segments, keywords, key moments) -- no external API, no
generative model. Pure functions: no DB, no FFmpeg.

  video_dna        structure / topic distribution / density of a video
  build_revision   compact "5-minute revision" for one or more videos
  explain_moment   "I don't understand" explanation for a timestamp

Honest limitation: everything is extractive. Sentences shown are real
transcript sentences, selected with pattern rules (definitions,
examples, formulas ...). Nothing is paraphrased or invented, so a
category with no matching sentence is returned empty rather than filled.
"""

import re
from typing import Dict, List, Optional

from app.services.story_service import split_sentences, truncate

_WORD = re.compile(r"[a-zA-Z0-9']+")

# --- cue patterns (case-insensitive) ---------------------------------------
_DEFINITION = re.compile(
    r"^(?P<term>[A-Za-z][\w\- ]{1,50}?)\s+(?:is|are|means|refers to|is defined as|is called|stands for)\s+(?P<body>.{8,})$",
    re.I,
)
_DIFFERENCE = re.compile(
    r"\b(difference between|differs? from|unlike|whereas|versus|\bvs\.?\b|compared (?:to|with)|on the other hand|in contrast)\b", re.I)
_CONFUSION = re.compile(
    r"\b(common mistake|mistake|confus\w*|be careful|don'?t confuse|do not confuse|misconception|watch out|note that|remember that|keep in mind)\b", re.I)
_FORMULA = re.compile(
    r"(\w+\s*=\s*[\w(]|\bequals?\b|\bformula\b|\bsquared\b|\bdivided by\b|\bmultiplied by\b|[\w)]\s*[+\-*/^]\s*[\w(]\s*=|\d\s*[*/^+]\s*\d)", re.I)
_EXAMPLE = re.compile(r"\b(for example|for instance|such as|e\.g\.|imagine|suppose|let'?s say|consider|think of|like when)\b", re.I)

_ROLE_CUES = {
    "Introduction": re.compile(r"\b(welcome|today we|in this (?:video|lecture|session|tutorial)|let'?s (?:begin|start)|going to (?:learn|talk|cover)|overview|agenda)\b", re.I),
    "Problem": re.compile(r"\b(problem|issue|challenge|difficult|why (?:do|does|is)|struggle|pain point)\b", re.I),
    "Example": _EXAMPLE,
    "Conclusion": re.compile(r"\b(in summary|to summari[sz]e|in conclusion|to conclude|finally|wrap up|recap|key takeaways?|that'?s it for)\b", re.I),
    "Explanation": re.compile(r"\b(because|means|is defined|works by|refers to|in other words|that is|therefore|which is)\b", re.I),
}

_GENERIC_NOUNS = {"problem", "issue", "thing", "reason", "point", "idea", "fact", "question", "answer",
                  "way", "goal", "case", "result", "difference", "step", "key", "rule", "one", "others", "all"}
_CLAUSE_STARTS = ("that ", "to ", "how ", "when ", "why ", "whether ", "because ", "if ", "what ")

_STOP = {"the", "a", "an", "and", "or", "but", "so", "to", "of", "in", "on", "at", "for", "with", "is",
         "are", "was", "were", "be", "it", "this", "that", "these", "those", "what", "how", "why", "do",
         "does", "did", "you", "your", "we", "i", "can", "will", "about", "as", "by", "from"}


def _tokens(text: str) -> List[str]:
    return [w for w in _WORD.findall((text or "").lower())]


def _clean(segments: List[dict]) -> List[dict]:
    return sorted(
        (s for s in segments if (s.get("text") or "").strip()),
        key=lambda s: s["start_time"],
    )


def _sentences_with_time(segments: List[dict]) -> List[dict]:
    """Every transcript sentence with the start/end of the segment it came from."""
    out = []
    for seg in _clean(segments):
        for sent in split_sentences(seg["text"]):
            out.append({"start_time": seg["start_time"], "end_time": seg["end_time"], "text": sent})
    return out


# =============================================================== VIDEO DNA

def video_dna(segments: List[dict], key_moments: List[dict], keywords: List[dict]) -> dict:
    segs = _clean(segments)
    if not segs:
        return {"duration": 0.0, "sections": [], "topic_distribution": []}

    t0 = segs[0]["start_time"]
    t1 = max(s["end_time"] for s in segs)
    duration = max(t1 - t0, 1.0)

    n = max(4, min(12, round(duration / 60)))          # ~1 section per minute, 4..12
    width = duration / n
    kw_scores = {(k.get("word") or "").lower(): float(k.get("score") or 0) for k in keywords if k.get("word")}
    max_importance = max((float(m.get("importance") or 0) for m in key_moments), default=0.0)

    sections = []
    for i in range(n):
        a = t0 + i * width
        b = t0 + (i + 1) * width if i < n - 1 else t1
        in_bin = [s for s in segs if s["start_time"] < b and s["end_time"] > a]
        text = " ".join(s["text"].strip() for s in in_bin)
        words = _tokens(text)

        overlapping = [float(m.get("importance") or 0) for m in key_moments
                       if m["start_time"] < b and m["end_time"] > a]
        importance = (sum(overlapping) / max_importance) if max_importance > 0 else 0.0

        topics = sorted({w for w in words if w in kw_scores}, key=lambda w: kw_scores[w], reverse=True)[:3]
        cue_scores = {role: len(rx.findall(text)) for role, rx in _ROLE_CUES.items()}

        sections.append({
            "index": i + 1,
            "start_time": round(a, 2),
            "end_time": round(b, 2),
            "words_per_minute": round(len(words) / max((b - a) / 60, 1e-6), 1),
            "_importance_raw": importance,
            "_cues": cue_scores,
            "topics": topics,
            "excerpt": truncate(text, 140),
        })

    # normalise 0..1 so the UI can draw relative bars
    max_wpm = max(s["words_per_minute"] for s in sections) or 1.0
    max_imp = max(s["_importance_raw"] for s in sections) or 1.0
    for idx, s in enumerate(sections):
        s["information_density"] = round(s["words_per_minute"] / max_wpm, 2)
        s["importance_density"] = round(s["_importance_raw"] / max_imp, 2) if max_imp else 0.0
        cues = s.pop("_cues")
        s.pop("_importance_raw")
        best_role, best = max(cues.items(), key=lambda kv: kv[1])
        if best == 0:
            best_role = "Explanation"
        # The opening and closing sections default to Introduction / Conclusion
        # unless the transcript clearly signals something else.
        if idx == 0 and cues["Conclusion"] == 0 and (best == 0 or best_role != "Introduction"):
            best_role = "Introduction"
        if idx == len(sections) - 1 and best_role in ("Explanation",) and cues["Conclusion"] == 0:
            best_role = "Conclusion"
        s["role"] = best_role

    # Topic distribution: share of keyword mentions across the whole transcript.
    all_words = _tokens(" ".join(s["text"] for s in segs))
    counts = {w: all_words.count(w) for w in kw_scores}
    top = sorted(((w, c) for w, c in counts.items() if c > 0), key=lambda x: (-x[1], -kw_scores[x[0]]))[:8]
    total = sum(c for _, c in top) or 1
    distribution = [{"topic": w, "mentions": c, "share": round(c / total, 3)} for w, c in top]

    return {"duration": round(duration, 2), "sections": sections, "topic_distribution": distribution}


# ============================================================== REVISION

def _definition_items(sentences: List[dict]) -> List[dict]:
    items = []
    for s in sentences:
        text = s["text"].strip()
        if len(text) > 220:
            continue
        m = _DEFINITION.match(text)
        if not m:
            continue
        term = m.group("term").strip()
        body = m.group("body").strip().lower()
        words = term.lower().split()
        # Not a definition: "The problem is that ...", "This is how ...", "It is because ..."
        if len(words) > 5 or (len(words) == 1 and words[0] in _STOP):
            continue
        if words[-1] in _GENERIC_NOUNS or body.startswith(_CLAUSE_STARTS):
            continue
        items.append({**s, "term": term})
    return items


def _by_pattern(sentences: List[dict], rx: re.Pattern, limit: int) -> List[dict]:
    return [s for s in sentences if rx.search(s["text"])][:limit]


def revision_for_video(segments: List[dict], key_moments: List[dict], keywords: List[dict]) -> dict:
    sentences = _sentences_with_time(segments)
    defs = _definition_items(sentences)[:6]

    moments = sorted(key_moments, key=lambda m: float(m.get("importance") or 0), reverse=True)[:5]
    must = [{"start_time": m["start_time"], "end_time": m["end_time"], "text": truncate(m.get("text", ""), 220)}
            for m in moments if (m.get("text") or "").strip()]

    cards = []
    for d in defs[:4]:
        m = _DEFINITION.match(d["text"])
        cards.append({
            "question": f"What {'is' if not d['term'].lower().endswith('s') else 'are'} {d['term']}?",
            "answer": truncate(m.group("body").rstrip(". "), 200),
            "start_time": d["start_time"], "end_time": d["end_time"],
        })
    for m in must:
        if len(cards) >= 6:
            break
        cards.append({
            "question": f"What was said at {int(m['start_time'] // 60):02d}:{int(m['start_time'] % 60):02d}?",
            "answer": m["text"], "start_time": m["start_time"], "end_time": m["end_time"],
        })

    pick = lambda items: [{"start_time": i["start_time"], "end_time": i["end_time"], "text": truncate(i["text"], 220)} for i in items]
    return {
        "must_remember": must,
        "definitions": [{"term": d["term"], "start_time": d["start_time"], "end_time": d["end_time"],
                         "text": truncate(d["text"], 220)} for d in defs],
        "differences": pick(_by_pattern(sentences, _DIFFERENCE, 5)),
        "formulas": pick(_by_pattern(sentences, _FORMULA, 5)),
        "confusions": pick(_by_pattern(sentences, _CONFUSION, 5)),
        "key_timestamps": [{"start_time": m["start_time"], "end_time": m["end_time"], "label": truncate(m.get("text", ""), 90)}
                           for m in sorted(moments, key=lambda m: m["start_time"])],
        "flashcards": cards,
    }


# ================================================================ EXPLAIN

def _shorten(sentence: str, max_words: int = 18) -> str:
    words = sentence.rstrip(".!? ").split()
    return " ".join(words[:max_words]) + ("…" if len(words) > max_words else "")


def explain_moment(segments: List[dict], timestamp: float, keywords: List[dict]) -> Optional[dict]:
    """Explain the part of the video around `timestamp`, using ONLY nearby
    transcript text. Returns None if there is no transcript."""
    segs = _clean(segments)
    if not segs:
        return None

    # the segment being watched (or the nearest one)
    current_idx = min(range(len(segs)),
                      key=lambda i: 0 if segs[i]["start_time"] <= timestamp < segs[i]["end_time"]
                      else min(abs(segs[i]["start_time"] - timestamp), abs(segs[i]["end_time"] - timestamp)))
    lo, hi = max(0, current_idx - 2), min(len(segs), current_idx + 2)       # 2 before, 1 after
    window = segs[lo:hi]
    around = _sentences_with_time(window)
    wide = _sentences_with_time(segs[max(0, current_idx - 6): current_idx + 7])
    current_sents = split_sentences(segs[current_idx]["text"])

    focus = current_sents[0] if current_sents else window[0]["text"]
    prior = ""
    if current_idx > 0:
        prev = split_sentences(segs[current_idx - 1]["text"])
        prior = prev[-1] if prev else ""

    window_text = " ".join(s["text"] for s in window)
    kw_scores = {(k.get("word") or "").lower(): float(k.get("score") or 0) for k in keywords if k.get("word")}
    window_terms = sorted({w for w in _tokens(window_text) if w in kw_scores}, key=lambda w: kw_scores[w], reverse=True)

    # exam definition: a definition-shaped sentence nearby, else anywhere that defines a window term
    exam = next(iter(_definition_items(around)), None)
    if exam is None:
        everything = _definition_items(_sentences_with_time(segs))
        exam = next((d for d in everything if d["term"].lower().split()[-1] in window_terms), None)

    example = next(iter(_by_pattern(wide, _EXAMPLE, 1)), None)

    related = None
    for term in window_terms:
        for s in _sentences_with_time(segs):
            if term in _tokens(s["text"]) and not (window[0]["start_time"] <= s["start_time"] <= window[-1]["end_time"]):
                related = {"term": term, "start_time": s["start_time"], "end_time": s["end_time"], "text": truncate(s["text"], 160)}
                break
        if related:
            break

    simple = " ".join(x for x in (prior, focus) if x).strip()

    def src(s):
        return {"start_time": s["start_time"], "end_time": s["end_time"], "text": truncate(s["text"], 220)}

    return {
        "timestamp": round(timestamp, 2),
        "simple_explanation": truncate(simple, 320),
        "explain_like_10": f"In short: {_shorten(focus)}." + (f" Key idea: {window_terms[0]}." if window_terms else ""),
        "exam_definition": ({**src(exam), "term": exam["term"]} if exam else None),
        "real_life_example": (src(example) if example else None),
        "related_concept": related,
        "rewatch_range": {"start_time": window[0]["start_time"], "end_time": window[-1]["end_time"]},
        "method": "extractive",
    }
