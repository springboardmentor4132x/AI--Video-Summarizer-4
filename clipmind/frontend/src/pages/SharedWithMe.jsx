import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { formatDateTime } from "../utils/format";
import "../roles.css";

// Videos an educator has shared with me (read-only).
export default function SharedWithMe() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return undefined;
    }
    let cancelled = false;
    api
      .getSharedWithMe()
      .then((items) => !cancelled && setState({ loading: false, items, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, items: [], error: err.message || "Unable to load shared videos." }));
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (state.loading) return <p className="page-state">Loading...</p>;
  if (state.error) return <p className="page-state error">{state.error}</p>;

  return (
    <div className="role-page">
      <h2>Shared with me</h2>
      <p>Videos your educators have shared. You can watch them and read the summary, transcript and key moments.</p>
      {state.items.length === 0 ? (
        <p className="page-state">Nothing has been shared with you yet. Educators share videos using your account email.</p>
      ) : (
        <ul className="role-cards">
          {state.items.map((v) => (
            <li key={v.id} className="role-card">
              <h3>{v.filename}</h3>
              <p><small>Shared by {v.shared_by} · {formatDateTime(v.shared_at)}</small></p>
              <p>{v.short_summary || (v.status === "done" ? "No summary available." : "Still being processed.")}</p>
              <button type="button" disabled={v.status !== "done"} onClick={() => navigate(`/video/${v.id}`)}>
                Watch
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
