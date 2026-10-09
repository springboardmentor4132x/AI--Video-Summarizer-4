import { useState } from "react";
import api from "../api";
import WatchChip from "./WatchChip";
import { formatTimestamp } from "../utils/time";

// "I Don't Understand": explains the moment the viewer is paused on, using
// only the transcript around that time (see insight_service.explain_moment).
export default function ExplainPanel({ videoId, playerRef }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const seek = (t) => playerRef.current && playerRef.current.seekTo(t);

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      const now = playerRef.current ? playerRef.current.getCurrentTime() : 0;
      setResult(await api.explainMoment(videoId, now));
    } catch (err) {
      setResult(null);
      setError(err.message || "Couldn't explain this moment.");
    } finally {
      setLoading(false);
    }
  };

  const r = result;
  return (
    <div className="explain">
      <button type="button" className="explain-button" onClick={handleClick} disabled={loading}>
        {loading ? "Looking at what was just said..." : "I Don't Understand"}
      </button>
      <span className="explain-hint">Pause where you got lost, then press it.</span>

      {error && <p className="page-state error" role="alert">{error}</p>}

      {r && (
        <div className="explain-card" aria-live="polite">
          <p className="explain-meta">
            Based only on the transcript around {formatTimestamp(r.timestamp)}.
          </p>
          <h4>Simple explanation</h4>
          <p>{r.simple_explanation}</p>
          <h4>Explain like I'm 10</h4>
          <p>{r.explain_like_10}</p>
          <h4>Exam definition</h4>
          {r.exam_definition ? (
            <p>
              {r.exam_definition.text}{" "}
              <WatchChip start={r.exam_definition.start_time} end={r.exam_definition.end_time} onWatch={seek} />
            </p>
          ) : (
            <p className="muted">No definition-style sentence was found near this moment.</p>
          )}
          <h4>Real-life example</h4>
          {r.real_life_example ? (
            <p>
              {r.real_life_example.text}{" "}
              <WatchChip start={r.real_life_example.start_time} end={r.real_life_example.end_time} onWatch={seek} />
            </p>
          ) : (
            <p className="muted">The speaker doesn't give an example near this moment.</p>
          )}
          <h4>Related concept</h4>
          {r.related_concept ? (
            <p>
              <strong>{r.related_concept.term}</strong> also comes up: {r.related_concept.text}{" "}
              <WatchChip start={r.related_concept.start_time} end={r.related_concept.end_time} onWatch={seek} />
            </p>
          ) : (
            <p className="muted">No related passage found elsewhere in this video.</p>
          )}
          <WatchChip
            label="Rewatch this part"
            start={r.rewatch_range.start_time}
            end={r.rewatch_range.end_time}
            onWatch={seek}
          />
        </div>
      )}
    </div>
  );
}
