import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../roles.css";

// Roles allowed to correct transcript text (the backend enforces this too).
const EDIT_ROLES = ["content_creator", "educator", "administrator"];

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
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({}); // segment index -> edited text
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });

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
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const canEdit = EDIT_ROLES.includes(currentUser?.role) && segments.length > 0;
  const changed = Object.entries(drafts).filter(([i, text]) => text !== segments[Number(i)]?.text);

  const cancel = () => {
    setEditing(false);
    setDrafts({});
    setSaveMsg({ type: "", text: "" });
  };

  const save = async () => {
    if (changed.length === 0) {
      cancel();
      return;
    }
    setSaving(true);
    setSaveMsg({ type: "", text: "" });
    try {
      const updated = await api.editTranscript(
        localStorage.getItem("currentVideoId"),
        changed.map(([i, text]) => ({ index: Number(i), text }))
      );
      setVideo(updated);
      setEditing(false);
      setDrafts({});
      setSaveMsg({ type: "ok", text: `Saved ${changed.length} change${changed.length === 1 ? "" : "s"}.` });
    } catch (err) {
      setSaveMsg({ type: "error", text: err.message || "Could not save your edits." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="transcript-page">
      <h2>Transcript — {video.filename}</h2>

      {canEdit && (
        <div className="transcript-edit-bar">
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)}>Edit transcript</button>
          ) : (
            <>
              <button type="button" onClick={save} disabled={saving || changed.length === 0}>
                {saving ? "Saving..." : `Save changes (${changed.length})`}
              </button>
              <button type="button" onClick={cancel} disabled={saving}>Cancel</button>
              <small>Only the text changes — timestamps stay exactly as they are.</small>
            </>
          )}
        </div>
      )}
      {saveMsg.text && <p role={saveMsg.type === "error" ? "alert" : "status"} className={`role-msg ${saveMsg.type}`}>{saveMsg.text}</p>}
      {video.transcript_edited_at && (
        <p className="transcript-edit-note">
          This transcript was edited. The summary, key moments and flashcards were generated from the earlier text.
        </p>
      )}

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
            <li key={i} className={drafts[i] !== undefined && drafts[i] !== seg.text ? "edited" : ""}>
              <span className="timestamp">
                {formatTimestamp(seg.start_time)} - {formatTimestamp(seg.end_time)}
              </span>
              {editing ? (
                <textarea
                  aria-label={`Transcript text at ${formatTimestamp(seg.start_time)}`}
                  value={drafts[i] ?? seg.text}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                  disabled={saving}
                  lang={video.transcription_language === "hi" ? "hi" : undefined}
                  dir="auto"
                />
              ) : (
                <span
                  className="text"
                  lang={video.transcription_language === "hi" ? "hi" : undefined}
                  dir="auto"
                >
                  {seg.text}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Transcript;
