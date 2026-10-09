import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { hasApi, normalizeStatus, postJson, PROCESSING_STATUSES } from "../api";

const initialSummary = {
  short: "A practical introduction to the principles behind user-focused workflows, from identifying the problem to turning insights into a repeatable checklist.",
  detailed: "The lesson begins by establishing the importance of starting with a clear user problem. It then maps the workflow from beginning to end, calling out opportunities for thoughtful automation. The final section brings the ideas together as a practical checklist for applying the framework to a new project.",
};

function Summary() {
  const navigate = useNavigate();
  const [video] = useState(() => {
    const email = localStorage.getItem("loggedInUser");
    const savedVideo = email && localStorage.getItem(`currentVideo_${email}`);
    return savedVideo ? JSON.parse(savedVideo) : null;
  });
  const [summary, setSummary] = useState(() => {
    const email = localStorage.getItem("loggedInUser");
    const savedVideo = email && localStorage.getItem(`currentVideo_${email}`);
    const currentVideo = savedVideo ? JSON.parse(savedVideo) : null;
    const savedSummary = currentVideo && localStorage.getItem(`summary_${currentVideo.id}`);
    return savedSummary ? JSON.parse(savedSummary) : initialSummary;
  });
  const [status, setStatus] = useState(() => {
    const email = localStorage.getItem("loggedInUser");
    const savedVideo = email && localStorage.getItem(`currentVideo_${email}`);
    const currentVideo = savedVideo ? JSON.parse(savedVideo) : null;
    return currentVideo && localStorage.getItem(`summary_${currentVideo.id}`)
      ? PROCESSING_STATUSES.COMPLETED
      : PROCESSING_STATUSES.NOT_STARTED;
  });
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("Today, 10:42 AM");

  useEffect(() => {
    const email = localStorage.getItem("loggedInUser");
    if (!email) { navigate("/login", { replace: true }); return; }
  }, [navigate]);

  const generateSummary = async () => {
    if (!video || status === PROCESSING_STATUSES.PROCESSING) return;
    setStatus(PROCESSING_STATUSES.PROCESSING);
    setError("");
    try {
      let nextSummary = summary;
      if (hasApi) {
        const data = await postJson(`/videos/${video.id}/summary`, {});
        const responseStatus = normalizeStatus(data.status);
        const hasSummary = Boolean(data.shortSummary || data.short || data.detailedSummary || data.detailed);
        if (!hasSummary && (responseStatus === PROCESSING_STATUSES.PROCESSING || responseStatus === PROCESSING_STATUSES.NOT_STARTED)) {
          setStatus(PROCESSING_STATUSES.PROCESSING);
          return;
        }
        nextSummary = { short: data.shortSummary || data.short || "", detailed: data.detailedSummary || data.detailed || "" };
        setSummary(nextSummary);
      }
      localStorage.setItem(`summary_${video.id}`, JSON.stringify(nextSummary));
      setGeneratedAt("Just now");
      setStatus(PROCESSING_STATUSES.COMPLETED);
    } catch (requestError) {
      setError(requestError.message || "Summary generation failed. Please try again.");
      setStatus(PROCESSING_STATUSES.FAILED);
    }
  };

  if (!video) return <main className="workspace-page"><section className="empty-state"><div className="empty-icon">◌</div><h1>No video selected</h1><p>Upload a video before generating a summary.</p><button className="primary-button" onClick={() => navigate("/upload")}>Upload a video →</button></section></main>;

  return (
    <main className="workspace-page">
      <section className="workspace-shell">
        <button className="back-link" onClick={() => navigate("/transcript")}>← Back to transcript</button>
        <div className="page-heading"><div><p className="eyebrow">AI output</p><h1>Summary</h1><p className="lede">A clear, skimmable version of your video, ready to share.</p></div><span className={`status-pill ${status === PROCESSING_STATUSES.FAILED ? "status-error" : status === PROCESSING_STATUSES.PROCESSING ? "status-working" : "status-ready"}`}><span className="status-dot" /> {status === PROCESSING_STATUSES.PROCESSING ? "Processing" : status === PROCESSING_STATUSES.FAILED ? "Failed" : status === PROCESSING_STATUSES.NOT_STARTED ? "Not started" : "Completed"}</span></div>
        <div className="video-context"><div className="video-mark">✦</div><div><strong>{video.filename}</strong><span>Summary generated {generatedAt}</span></div><button className="text-button" onClick={() => navigate("/transcript")}>Edit transcript →</button></div>
        {error && <div className="alert alert-error">{error}</div>}
        {status === PROCESSING_STATUSES.PROCESSING && <div className="alert alert-working"><span className="spinner" /> Summary generation in progress. You can stay on this page while we work.</div>}
        <div className="summary-grid">
          <article className="panel summary-card summary-short"><div className="summary-label"><span className="label-icon">✦</span><span>In one sentence</span></div><h2>Short summary</h2><p>{summary.short}</p></article>
          <article className="panel summary-card"><div className="summary-label"><span className="label-icon">≡</span><span>Full context</span></div><h2>Detailed summary</h2><p>{summary.detailed}</p></article>
        </div>
        <div className="summary-footer"><div><span className="success-check">✓</span><span>{status === PROCESSING_STATUSES.COMPLETED ? "Generated from the latest transcript" : "Summary is not ready"}<br /><small>{status === PROCESSING_STATUSES.FAILED ? "Retry to request a new summary" : "Ready to review and share"}</small></span></div><button className="primary-button" onClick={generateSummary} disabled={status === PROCESSING_STATUSES.PROCESSING}>{status === PROCESSING_STATUSES.PROCESSING ? "Generating..." : status === PROCESSING_STATUSES.FAILED ? "↻ Retry summary" : "↻ Regenerate summary"}</button></div>
      </section>
    </main>
  );
}

export default Summary;
