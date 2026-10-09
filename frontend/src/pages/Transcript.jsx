import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// This page is the TEMPLATE PATTERN for rewiring Summary.jsx, KeyMoments.jsx,
// Keywords.jsx, Analytics.jsx, ContentInsights.jsx, UsageReports.jsx and
// History.jsx: swap raw fetch()/localStorage-as-auth for api.<call>(), keep
// the "currentVideoId" convenience key, and treat the backend response as
// the only source of truth for results.

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function Transcript() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }

    const videoId = localStorage.getItem("currentVideoId");

    (async () => {
      if (!videoId) {
        setError("No uploaded video selected yet.");
        setLoading(false);
        return;
      }

      try {
        // Real backend call: GET /api/videos/{id}/transcript
        // Response is the canonical VideoOut object — transcript AND
        // transcript_segments (with real start_time/end_time from Whisper).
        const data = await api.getTranscript(videoId);
        setVideo(data);
      } catch (err) {
        setError(err.message || "Unable to fetch transcript.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <div className="page-state">Loading transcript...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!video) return null;

  const segments = video.transcript_segments || [];

  return (
    <div className="transcript-page">
      <h2>Transcript — {video.filename}</h2>

      {segments.length === 0 ? (
        // Empty state, not fake data: falls back to the flat transcript
        // only if segments genuinely aren't available yet.
        video.transcript ? (
          <p>{video.transcript}</p>
        ) : (
          <div className="page-state">Transcript not available yet.</div>
        )
      ) : (
        <ul className="transcript-segments">
          {segments.map((seg, i) => (
            <li key={i}>
              <span className="timestamp">
                {formatTimestamp(seg.start_time)} - {formatTimestamp(seg.end_time)}
              </span>
              <span className="text">{seg.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Transcript;
