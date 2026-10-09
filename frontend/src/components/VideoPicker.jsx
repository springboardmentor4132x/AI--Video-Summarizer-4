import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

// Shared "which video?" screen for feature pages opened without a video id.
// Only fully processed videos are offered; empty / error states are explicit.
export default function VideoPicker({ title, blurb, basePath }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, videos: [], error: "" });

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return undefined;
    }
    let cancelled = false;
    api
      .getHistory()
      .then((rows) => {
        if (!cancelled) setState({ loading: false, videos: rows.filter((v) => v.status === "done"), error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, videos: [], error: err.message || "Unable to load your videos." });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="picker-page">
      <h2>{title}</h2>
      {blurb && <p>{blurb}</p>}
      {state.loading && <p className="page-state">Loading your videos...</p>}
      {state.error && <p className="page-state error">{state.error}</p>}
      {!state.loading && !state.error && state.videos.length === 0 && (
        <p className="page-state">
          No processed videos yet. <Link to="/upload">Upload a video</Link> and come back when it finishes processing.
        </p>
      )}
      <ul className="picker-list">
        {state.videos.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => navigate(`${basePath}/${v.id}`)}>
              {v.filename}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
