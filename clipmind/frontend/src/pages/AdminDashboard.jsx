import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { formatBytes, formatDateTime } from "../utils/format";
import { formatTimestamp } from "../utils/time";
import "../roles.css";

const ROLES = [
  ["learner", "Learner"],
  ["content_creator", "Content Creator"],
  ["educator", "Educator"],
  ["administrator", "Administrator"],
];
const ROLE_LABEL = Object.fromEntries(ROLES);
const TABS = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["videos", "Content"],
  ["processing", "Processing"],
  ["audit", "Audit log"],
];

// Small loader hook: { data, loading, error, reload }.
// `key` identifies the request (change it to refetch). Loading is DERIVED from
// whether the stored result belongs to the current key, so no state is set
// synchronously inside an effect.
function useApi(fn, key) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ id: null, data: null, error: "" });
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const id = `${key}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((data) => !cancelled && setResult({ id, data, error: "" }))
      .catch((err) => !cancelled && setResult({ id, data: null, error: err.message || "Request failed." }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loading = result.id !== id;
  return {
    data: loading ? null : result.data,
    loading,
    error: loading ? "" : result.error,
    reload: () => setTick((t) => t + 1),
  };
}

function Status({ loading, error, children }) {
  if (loading) return <p className="page-state">Loading...</p>;
  if (error) return <p className="page-state error">{error}</p>;
  return children;
}

function Overview() {
  const { data, loading, error } = useApi(() => api.getAdminStats(), "stats");
  return (
    <Status loading={loading} error={error}>
      {data && (
        <>
          <div className="role-stats">
            <div className="role-stat"><b>{data.users.total}</b><span>Users ({data.users.disabled} disabled)</span></div>
            <div className="role-stat"><b>{data.videos.total}</b><span>Videos</span></div>
            <div className="role-stat"><b>{data.videos.done}</b><span>Processed</span></div>
            <div className="role-stat"><b>{data.videos.processing}</b><span>In progress</span></div>
            <div className="role-stat"><b>{data.videos.failed}</b><span>Failed</span></div>
            <div className="role-stat"><b>{formatBytes(data.videos.storage_bytes)}</b><span>Storage used</span></div>
            <div className="role-stat"><b>{formatTimestamp(data.videos.total_duration_seconds)}</b><span>Total video time</span></div>
          </div>
          <h3>Users by role</h3>
          <ul className="role-breakdown">
            {ROLES.map(([value, label]) => (
              <li key={value}>{label}: <b>{data.users.by_role[value] || 0}</b></li>
            ))}
          </ul>
          <h3>Recent processing failures</h3>
          {data.recent_failures.length === 0 ? (
            <p className="page-state">No failed videos.</p>
          ) : (
            <ul className="role-list">
              {data.recent_failures.map((f) => (
                <li key={f.id}><b>{f.filename}</b> — {f.error_message || "No error message recorded."}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </Status>
  );
}

function Users() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const { data, loading, error, reload } = useApi(() => api.getAdminUsers({ search, role }), `users:${search}:${role}`);

  const act = async (fn, okText) => {
    setMsg({ type: "", text: "" });
    try {
      await fn();
      setMsg({ type: "ok", text: okText });
      reload();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "That change was not allowed." });
    }
  };

  return (
    <>
      <div className="role-filters">
        <input type="search" aria-label="Search users" placeholder="Search name or email" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {msg.text && <p role="status" className={`role-msg ${msg.type}`}>{msg.text}</p>}
      <Status loading={loading} error={error}>
        {data && data.users.length === 0 && <p className="page-state">No users match.</p>}
        {data && data.users.length > 0 && (
          <div className="role-table-wrap">
            <table className="role-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Videos</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className={u.is_active ? "" : "disabled"}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select aria-label={`Role for ${u.email}`} value={u.role}
                              onChange={(e) => act(() => api.setUserRole(u.id, e.target.value), `${u.email} is now ${ROLE_LABEL[e.target.value]}.`)}>
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td>{u.video_count}</td>
                    <td>{formatDateTime(u.created_at)}</td>
                    <td>
                      <button type="button"
                              onClick={() => act(() => api.setUserActive(u.id, !u.is_active), u.is_active ? `${u.email} was disabled.` : `${u.email} was enabled.`)}>
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Status>
    </>
  );
}

function Videos() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const { data, loading, error, reload } = useApi(() => api.getAdminVideos({ status, search }), `videos:${status}:${search}`);

  const remove = async (v) => {
    if (!window.confirm(`Permanently delete "${v.filename}" and everything generated from it? This cannot be undone.`)) return;
    try {
      await api.adminDeleteVideo(v.id);
      setMsg({ type: "ok", text: `Deleted ${v.filename}.` });
      reload();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not delete the video." });
    }
  };

  return (
    <>
      <div className="role-filters">
        <input type="search" aria-label="Search videos" placeholder="Search file name" value={search}
               onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["uploaded", "processing", "done", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {msg.text && <p role="status" className={`role-msg ${msg.type}`}>{msg.text}</p>}
      <Status loading={loading} error={error}>
        {data && data.videos.length === 0 && <p className="page-state">No videos match.</p>}
        {data && data.videos.length > 0 && (
          <div className="role-table-wrap">
            <table className="role-table">
              <thead><tr><th>File</th><th>Owner</th><th>Status</th><th>Length</th><th>Size</th><th>Uploaded</th><th /></tr></thead>
              <tbody>
                {data.videos.map((v) => (
                  <tr key={v.id}>
                    <td>{v.filename}</td>
                    <td>{v.owner_name}<br /><small>{v.owner_email}</small></td>
                    <td><span className={`role-badge ${v.status}`}>{v.status}</span></td>
                    <td>{v.duration ? formatTimestamp(v.duration) : "—"}</td>
                    <td>{formatBytes(v.size_bytes)}</td>
                    <td>{formatDateTime(v.uploaded_at)}</td>
                    <td><button type="button" className="danger" onClick={() => remove(v)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Status>
    </>
  );
}

function Processing() {
  const { data, loading, error, reload } = useApi(() => api.getAdminProcessing(), "processing");
  const rows = (list, empty) =>
    list.length === 0 ? (
      <p className="page-state">{empty}</p>
    ) : (
      <ul className="role-list">
        {list.map((v) => (
          <li key={v.id}>
            <b>{v.filename}</b> — {v.status} / {v.current_stage} ({v.progress}%)
            {v.error_message && <> — <em>{v.error_message}</em></>}
          </li>
        ))}
      </ul>
    );
  return (
    <Status loading={loading} error={error}>
      {data && (
        <>
          <button type="button" onClick={reload}>Refresh</button>
          <h3>Running now</h3>
          {rows(data.active, "Nothing is processing.")}
          <h3>Recent failures</h3>
          {rows(data.failed, "No failed jobs.")}
        </>
      )}
    </Status>
  );
}

function Audit() {
  const { data, loading, error } = useApi(() => api.getAdminAudit(100), "audit");
  return (
    <Status loading={loading} error={error}>
      {data && data.length === 0 && <p className="page-state">No administrator actions recorded yet.</p>}
      {data && data.length > 0 && (
        <div className="role-table-wrap">
          <table className="role-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.created_at)}</td>
                  <td>{a.actor_email}</td>
                  <td>{a.action}</td>
                  <td>{a.target_type}</td>
                  <td><small>{Object.entries(a.detail || {}).filter(([k]) => k !== "removed").map(([k, v]) => `${k}: ${v}`).join(", ")}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Status>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const Panel = { overview: Overview, users: Users, videos: Videos, processing: Processing, audit: Audit }[tab];
  return (
    <div className="role-page">
      <h2>Administrator</h2>
      <p>Manage users and roles, oversee content and monitor processing. Every change is recorded in the audit log.</p>
      <div className="role-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key}
                  className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <Panel />
      <p><Link to="/dashboard">Back to dashboard</Link></p>
    </div>
  );
}
