import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { formatBytes, formatDateTime, formatPercent } from "../utils/format";
import { formatTimestamp } from "../utils/time";
import "../roles.css";

// Educator dashboard: your own videos, who you've shared them with, and how
// those students actually engaged (from their real viewing activity).

function SharePanel({ video, onChanged }) {
  const [emails, setEmails] = useState("");
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState({ loading: true, data: null, error: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getVideoShares(video.id)
      .then((data) => setDetail({ loading: false, data, error: "" }))
      .catch((err) => setDetail({ loading: false, data: null, error: err.message || "Unable to load students." }));
  }, [video.id]);
  useEffect(load, [load]);

  const share = async (e) => {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    try {
      setResult(await api.shareVideo(video.id, list));
      setEmails("");
      load();
      onChanged();
    } catch (err) {
      setResult({ error: err.message || "Sharing failed." });
    } finally {
      setBusy(false);
    }
  };

  const unshare = async (s) => {
    if (!window.confirm(`Remove ${s.email}'s access to "${video.filename}"?`)) return;
    try {
      await api.unshareVideo(video.id, s.student_id);
      load();
      onChanged();
    } catch (err) {
      setResult({ error: err.message || "Could not remove access." });
    }
  };

  const outcome = result && !result.error && (
    <ul className="role-list" role="status">
      {result.shared.length > 0 && <li>Shared with: {result.shared.join(", ")}</li>}
      {result.already_shared.length > 0 && <li>Already had access: {result.already_shared.join(", ")}</li>}
      {result.not_found.length > 0 && <li>No account found for: {result.not_found.join(", ")}</li>}
      {result.not_eligible.length > 0 && <li>Not a learner account: {result.not_eligible.join(", ")}</li>}
    </ul>
  );

  return (
    <div className="role-panel">
      <h4>Share &ldquo;{video.filename}&rdquo; with students</h4>
      <p><small>Students get read-only access to the summary, transcript, key moments and player. They need a Learner account.</small></p>
      <form onSubmit={share} className="role-filters">
        <input type="text" aria-label="Student emails" placeholder="student@example.com, another@example.com"
               value={emails} onChange={(e) => setEmails(e.target.value)} disabled={busy} />
        <button type="submit" disabled={busy || !emails.trim()}>{busy ? "Sharing..." : "Share"}</button>
      </form>
      {result?.error && <p role="alert" className="role-msg error">{result.error}</p>}
      {outcome}

      <h4>Students &amp; engagement</h4>
      {detail.loading && <p className="page-state">Loading...</p>}
      {detail.error && <p className="page-state error">{detail.error}</p>}
      {detail.data && detail.data.students.length === 0 && <p className="page-state">Not shared with anyone yet.</p>}
      {detail.data && detail.data.students.length > 0 && (
        <>
          <p>
            {detail.data.students_opened} of {detail.data.students_with_access} opened it · average progress{" "}
            <b>{formatPercent(detail.data.average_completion)}</b>
          </p>
          <div className="role-table-wrap">
            <table className="role-table">
              <thead><tr><th>Student</th><th>Opened</th><th>Progress</th><th>Last watched</th><th /></tr></thead>
              <tbody>
                {detail.data.students.map((s) => (
                  <tr key={s.student_id}>
                    <td>{s.name}<br /><small>{s.email}</small></td>
                    <td>{s.opened ? `${s.open_count}×` : "Not yet"}</td>
                    <td>{formatPercent(s.completion)}</td>
                    <td>{s.opened ? formatDateTime(s.last_opened_at) : "—"}</td>
                    <td><button type="button" onClick={() => unshare(s)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function EducatorDashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api
      .getEducatorOverview()
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((err) => setState({ loading: false, data: null, error: err.message || "Unable to load your content." }));
  }, []);
  useEffect(load, [load]);

  const editTranscript = (v) => {
    localStorage.setItem("currentVideoId", v.id); // the Transcript page reads the selected video from here
    navigate("/transcript");
  };

  const remove = async (v) => {
    if (!window.confirm(`Permanently delete "${v.filename}" and everything generated from it? This cannot be undone.`)) return;
    try {
      await api.deleteVideo(v.id);
      setMsg(`Deleted ${v.filename}.`);
      if (open === v.id) setOpen(null);
      load();
    } catch (err) {
      setMsg(err.message || "Could not delete the video.");
    }
  };

  if (state.loading) return <p className="page-state">Loading...</p>;
  if (state.error) return <p className="page-state error">{state.error}</p>;
  const { totals, videos } = state.data;

  return (
    <div className="role-page">
      <h2>Educator dashboard</h2>
      <p>Your lecture videos, who you&apos;ve shared them with, and how students engage.</p>

      <div className="role-stats">
        <div className="role-stat"><b>{totals.total}</b><span>Your videos</span></div>
        <div className="role-stat"><b>{totals.done}</b><span>Ready to share</span></div>
        <div className="role-stat"><b>{totals.processing}</b><span>Processing</span></div>
        <div className="role-stat"><b>{totals.students_reached}</b><span>Students reached</span></div>
        <div className="role-stat"><b>{formatBytes(totals.storage_bytes)}</b><span>Storage</span></div>
      </div>
      {msg && <p role="status" className="role-msg ok">{msg}</p>}

      {videos.length === 0 ? (
        <p className="page-state">You haven&apos;t uploaded anything yet. <Link to="/upload">Upload a lecture</Link> to get started.</p>
      ) : (
        <div className="role-table-wrap">
          <table className="role-table">
            <thead>
              <tr><th>Video</th><th>Status</th><th>Length</th><th>Students</th><th>Opened</th><th>Avg. progress</th><th /></tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.filename}
                    {v.transcript_edited_at && <><br /><small>Transcript edited {formatDateTime(v.transcript_edited_at)}</small></>}
                  </td>
                  <td><span className={`role-badge ${v.status}`}>{v.status}</span></td>
                  <td>{v.duration ? formatTimestamp(v.duration) : "—"}</td>
                  <td>{v.students_with_access}</td>
                  <td>{v.students_opened}</td>
                  <td>{formatPercent(v.average_completion)}</td>
                  <td className="role-actions">
                    <button type="button" onClick={() => navigate(`/video/${v.id}`)} disabled={v.status !== "done"}>Open</button>
                    <button type="button" onClick={() => setOpen(open === v.id ? null : v.id)} disabled={v.status !== "done"}>
                      {open === v.id ? "Hide sharing" : "Share & engagement"}
                    </button>
                    <button type="button" onClick={() => editTranscript(v)} disabled={!v.has_transcript}>Edit transcript</button>
                    <button type="button" className="danger" onClick={() => remove(v)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <SharePanel video={videos.find((v) => v.id === open)} onChanged={load} />}
    </div>
  );
}
