import { formatTimestamp as formatTime } from "../utils/time";
import "../evidence.css";

// Evidence Lens (Tejashwini): one question -> answer -> the transcript evidence
// behind it, each with a timestamp and a Watch button. Everything shown comes
// from the video's transcript; if nothing supports the question we say so.

/** Wraps the question words that matched the transcript in <mark> so the user
 *  can see WHY this passage was chosen. */
export function Highlighted({ text, words }) {
  if (!words || words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

export default function EvidenceAnswer({ turn, onWatch }) {
  if (turn.insufficient) {
    return (
      <p className="evidence-none">
        <strong>No evidence found.</strong> The transcript doesn&apos;t contain enough information
        to answer this.
      </p>
    );
  }
  return (
    <>
      <p className="evidence-answer">
        <strong>Answer (quoted from the video):</strong> {turn.answer}
      </p>
      <div className="evidence-list">
        {turn.evidence.map((e, j) => (
          <div key={j} className={`evidence-card ${e.strength}`}>
            <div className="evidence-meta">
              <span>
                {formatTime(e.start_time)} – {formatTime(e.end_time)}
              </span>
              <span className="evidence-strength">{e.strength} match</span>
            </div>
            <p className="evidence-text">
              “<Highlighted text={e.text} words={e.matched_words} />”
            </p>
            <button type="button" onClick={() => onWatch(e.start_time)}>
              ▶ Watch evidence
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
