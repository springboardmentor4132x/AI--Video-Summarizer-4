import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeStatus } from "../api";

function Dashboard() {
  const navigate = useNavigate();
  const name = localStorage.getItem("loggedInUserName") || "User";
  const role = localStorage.getItem("loggedInUserRole") || "User";
  const history = useMemo(() => {
    const email = localStorage.getItem("loggedInUser");
    return JSON.parse(localStorage.getItem(`uploadHistory_${email}`) || "[]");
  }, []);
  const counts = {
    total: history.length,
    completed: history.filter((video) => normalizeStatus(video.status) === "COMPLETED").length,
    processing: history.filter((video) => normalizeStatus(video.status) === "PROCESSING").length,
    failed: history.filter((video) => normalizeStatus(video.status) === "FAILED").length,
  };

  const logout = () => {
    ["loggedInUser", "loggedInUserName", "loggedInUserRole", "authToken"].forEach((key) => localStorage.removeItem(key));
    navigate("/login");
  };

  const openLatest = (path) => navigate(path);

  return (
    <div className="dashboard-page">
      <header className="reference-nav">
        <button className="brand" onClick={() => navigate("/dashboard")}><span className="brand-mark">▶</span><strong>ClipMind <b>AI</b></strong></button>
        <nav><button className="active" onClick={() => navigate("/dashboard")}>Dashboard</button><button onClick={() => navigate("/upload")}>Upload Video</button><button onClick={() => navigate("/history")}>My Videos</button></nav>
        <div className="nav-user">Welcome, <strong>{name}</strong> ({role}) <span className="profile-icon">♙</span><button onClick={logout}>Logout</button></div>
      </header>

      <main className="reference-main">
        <section className="reference-stats">
          <Stat label="Total Uploads" value={counts.total} tone="blue" icon="↥" />
          <Stat label="Completed" value={counts.completed} tone="green" icon="✓" />
          <Stat label="Processing" value={counts.processing} tone="orange" icon="◌" />
          <Stat label="Failed" value={counts.failed} tone="red" icon="!" />
        </section>

        <section className="reference-tools">
          <div className="reference-panel upload-panel"><h2>Upload a New Video</h2><button onClick={() => openLatest("/upload")}><span>☁</span>Drag &amp; Drop Files or <b>Browse</b><strong>Upload Video</strong></button></div>
          <div className="reference-panel quick-panel"><h2>Quick Actions</h2><div><button onClick={() => openLatest("/transcript")}><span>▤</span>View Transcripts</button><button onClick={() => openLatest("/summary")}><span>⌕</span>Generate Summary</button></div></div>
        </section>

        <section className="reference-panel recent-panel"><div className="recent-heading"><h2>Recent Uploads &amp; Status</h2><button onClick={() => openLatest("/history")}>View all →</button></div><div className="table-wrap"><table><thead><tr><th>Video Title</th><th>Upload Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{history.slice(0, 6).map((video) => <tr key={video.id}><td>{video.filename}</td><td>{video.uploadDate}</td><td><span className={`table-status ${video.status.toLowerCase()}`}>{video.status === "Completed" ? "✓ Completed" : video.status === "Failed" ? "! Failed" : "◌ Processing..."}</span></td><td><button onClick={() => openLatest("/processing")} aria-label={`View ${video.filename}`}>👁</button><button onClick={() => openLatest("/history")} aria-label={`Delete ${video.filename}`}>🗑</button></td></tr>)}</tbody></table></div></section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone, icon }) { return <div className={`reference-stat ${tone}`}><span className="stat-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>; }

export default Dashboard;