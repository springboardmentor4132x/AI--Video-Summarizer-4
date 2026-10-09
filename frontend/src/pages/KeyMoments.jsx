import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Backend note: key moments live on VideoOut.key_moments once the
// pipeline (or POST /api/videos/{id}/key-moments) has generated them.
// Real fields, from app/models/video.py's KeyMoment model:
//   start_time, end_time, label, text, importance
// NOT: timestamp, segment, highlight — those don't exist on the backend.

function KeyMoments() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const videoId = typeof window !== "undefined" ? localStorage.getItem("currentVideoId") : null;

  const load = async () => {
    const data = await api.getVideoStatus(videoId);
    setVideo(data);
    return data;
  };

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    (async () => {
      if (!videoId) {
        setError("No uploaded video selected yet.");
        setLoading(false);
        return;
      }
      try {
        await load();
      } catch (err) {
        setError(err.message || "Unable to load key moments.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await api.generateKeyMoments(videoId);
      setVideo(data);
    } catch (err) {
      setError(err.message || "Key moment detection failed.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="page-state">Loading key moments...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!video) return null;

  const moments = video.key_moments || [];

  return (
    <div className="key-moments-page">
      <h2>Key Moments — {video.filename}</h2>

      {moments.length === 0 ? (
        <div className="page-state">No key moments detected yet.</div>
      ) : (
        <ol className="key-moments-list">
          {moments.map((m, i) => (
            <li key={i}>
              <div className="timestamp">
                {formatTimestamp(m.start_time)} → {formatTimestamp(m.end_time)}
              </div>
              {m.label && <div className="label">{m.label}</div>}
              <div className="text">{m.text}</div>
              <div className="importance">
                Importance: {Math.round((m.importance || 0) * 100)}%
              </div>
            </li>
          ))}
        </ol>
      )}

      <button onClick={handleGenerate} disabled={generating}>
        {generating ? "Detecting..." : "Re-run key moment detection"}
      </button>
    </div>
  );
}

export default KeyMoments;
