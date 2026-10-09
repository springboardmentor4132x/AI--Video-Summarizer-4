import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../memory.css";

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isDue(card) {
  return new Date(card.next_review_at).getTime() <= Date.now();
}

export default function MemoryDeck() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionDone, setSessionDone] = useState([]);
  const [explainMode, setExplainMode] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explainResult, setExplainResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadDeck = async () => {
    const [deck, history] = await Promise.all([
      api.getMemoryCards(false),
      api.getHistory(),
    ]);
    setCards(deck);
    setVideos(history.filter((video) => video.status === "done" && video.transcript_segments?.length));
  };

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    Promise.all([api.getMemoryCards(false), api.getHistory()])
      .then(([deck, history]) => {
        if (cancelled) return;
        setCards(deck);
        setVideos(history.filter((video) => video.status === "done" && video.transcript_segments?.length));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load your Memory Deck.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  const visibleCards = cards.filter((card) =>
    (showAll || isDue(card)) && !sessionDone.includes(card.id)
  );
  const card = visibleCards[0];
  const dueCount = cards.filter(isDue).length;

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!selectedVideo) return;
    setBusy(true);
    setError("");
    try {
      await api.generateMemoryCards(selectedVideo);
      await loadDeck();
      setSessionDone([]);
      setShowAll(false);
      setShowAnswer(false);
    } catch (err) {
      setError(err.message || "Unable to generate cards.");
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (strength) => {
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.reviewMemoryCard(card.id, strength);
      setCards((previous) => previous.map((item) => item.id === card.id ? updated : item));
      setSessionDone((previous) => [...previous, card.id]);
      setShowAnswer(false);
      setExplainMode(false);
      setExplainResult(null);
      setExplanation("");
    } catch (err) {
      setError(err.message || "Unable to save this review.");
    } finally {
      setBusy(false);
    }
  };

  const handleExplain = async (event) => {
    event.preventDefault();
    if (!card || !explanation.trim()) return;
    setBusy(true);
    setError("");
    try {
      setExplainResult(await api.explainMemoryCard(card.id, explanation.trim()));
    } catch (err) {
      setError(err.message || "Unable to check your explanation.");
    } finally {
      setBusy(false);
    }
  };

  const openSource = (sourceCard) => {
    // Canonical deep link: the Results page seeks the player to ?t=SECONDS.
    navigate(`/video/${sourceCard.video_id}?t=${Math.floor(sourceCard.source_start)}`);
  };

  if (loading) return <div className="page-state">Loading Memory Deck...</div>;

  return (
    <section className="memory-deck-page">
      <header className="memory-deck-header">
        <div>
          <p className="memory-deck-eyebrow">DAILY REVISION</p>
          <h1>Memory Deck</h1>
          <p>{dueCount} {dueCount === 1 ? "card" : "cards"} due today</p>
        </div>
        <form className="memory-generate-form" onSubmit={handleGenerate}>
          <select
            aria-label="Choose a video for flashcards"
            value={selectedVideo}
            onChange={(event) => setSelectedVideo(event.target.value)}
          >
            <option value="">Generate from a video</option>
            {videos.map((video) => (
              <option value={video.id} key={video.id}>{video.filename}</option>
            ))}
          </select>
          <button type="submit" disabled={!selectedVideo || busy}>
            {busy ? "Working..." : "Generate cards"}
          </button>
        </form>
      </header>

      {error && <p className="page-state error" role="alert">{error}</p>}
      {cards.length > 0 && (
        <div className="memory-deck-controls">
          <button type="button" onClick={() => { setShowAll(!showAll); setSessionDone([]); }}>
            {showAll ? "Review due only" : "Browse all cards"}
          </button>
        </div>
      )}

      {!card ? (
        <div className="memory-empty-state">
          <span className="memory-empty-mark" aria-hidden="true">✓</span>
          <h2>{cards.length ? "You're clear for today" : "Your deck is ready to build"}</h2>
          <p>{cards.length ? "Weak cards will return when they are due." : "Choose a processed video to create timestamp-linked cards."}</p>
        </div>
      ) : (
        <article className="memory-review-card">
          <div className="memory-card-meta">
            <span>{card.video_filename}</span>
            <span className={`memory-strength strength-${card.strength}`}>
              {card.strength.replaceAll("_", " ")}
            </span>
          </div>
          <p className="memory-card-progress">{visibleCards.length} to review</p>
          <h2>{card.prompt}</h2>
          <button className="memory-source-link" type="button" onClick={() => openSource(card)}>
            <span aria-hidden="true">↗</span> Source {formatTimestamp(card.source_start)} · {card.source_label}
          </button>

          {!showAnswer ? (
            <div className="memory-recall-actions">
              <button type="button" className="memory-primary" onClick={() => setShowAnswer(true)}>
                Reveal answer
              </button>
              <button type="button" onClick={() => { setExplainMode(!explainMode); setExplainResult(null); }}>
                {explainMode ? "Use flashcard" : "Explain it yourself"}
              </button>
            </div>
          ) : (
            <div className="memory-answer">
              <p>{card.answer}</p>
              <p className="memory-rating-label">How well did you recall it?</p>
              <div className="memory-rating-actions">
                <button type="button" disabled={busy} onClick={() => handleReview("forgotten")}>Forgotten</button>
                <button type="button" disabled={busy} onClick={() => handleReview("needs_review")}>Needs Review</button>
                <button type="button" className="memory-primary" disabled={busy} onClick={() => handleReview("strong")}>Strong</button>
              </div>
            </div>
          )}

          {explainMode && (
            <form className="memory-explain-form" onSubmit={handleExplain}>
              <label htmlFor="memory-explanation">Explain the concept in your own words</label>
              <textarea
                id="memory-explanation"
                rows="4"
                maxLength="3000"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                placeholder="What is the key idea, and how does it work?"
              />
              <button type="submit" disabled={!explanation.trim() || busy}>
                {busy ? "Checking..." : "Check explanation"}
              </button>
              {explainResult && (
                <div className="memory-feedback" aria-live="polite">
                  <p>{explainResult.feedback}</p>
                  {explainResult.matched_terms.length > 0 && (
                    <p><strong>Connected ideas:</strong> {explainResult.matched_terms.join(", ")}</p>
                  )}
                  {explainResult.missing_terms.length > 0 && (
                    <p><strong>Revisit:</strong> {explainResult.missing_terms.slice(0, 5).join(", ")}</p>
                  )}
                  <button type="button" className="memory-source-link" onClick={() => openSource(card)}>
                    Revisit {formatTimestamp(explainResult.source_start)}
                  </button>
                </div>
              )}
            </form>
          )}
        </article>
      )}
    </section>
  );
}