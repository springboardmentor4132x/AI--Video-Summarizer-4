import re
from collections import Counter
MAX_KEYWORDS = 10
# Small, common English stopword list - filters out words that carry
# no real topical meaning so they don't dominate the frequency count.
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "so", "to", "of", "in",
    "on", "at", "for", "with", "about", "as", "by", "is", "are", "was",
    "were", "be", "been", "being", "i", "you", "he", "she", "it", "we",
    "they", "my", "your", "his", "her", "its", "our", "their", "this",
    "that", "these", "those", "am", "do", "does", "did", "have", "has",
    "had", "will", "would", "can", "could", "should", "may", "might",
    "me", "him", "us", "them", "not", "very", "just", "then", "than",
}
def extract_keywords(transcript: str, max_keywords: int = MAX_KEYWORDS) -> list[dict]:
    """
    PLACEHOLDER implementation: basic word-frequency keyword extraction.

    Lowercases and tokenizes the transcript, removes stopwords and
    short/non-alphabetic tokens, then ranks remaining words by how
    often they appear. This is NOT real topic/keyword extraction, but
    it produces genuinely usable output today, and the interface
    matches what a proper NLP-based extractor would return.
    """
    if not transcript.strip():
        return []
    words = re.findall(r"[a-zA-Z']+", transcript.lower())
    words = [w for w in words if len(w) > 2 and w not in STOPWORDS]
    if not words:
        return []
    counts = Counter(words)
    top = counts.most_common(max_keywords)
    max_count = top[0][1] if top else 1
    return [
        {"word": word, "score": round(count / max_count, 2)}
        for word, count in top
    ]