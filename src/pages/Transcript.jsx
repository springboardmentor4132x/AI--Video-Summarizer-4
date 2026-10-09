import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, hasApi, normalizeStatus, PROCESSING_STATUSES } from "../api";

const sampleTranscript = [
  { time: "00:00", text: "Welcome to the introduction. In this lesson, we will explore the core ideas and how they connect." },
  { time: "01:42", text: "The first principle is to start with the user problem. Clear goals make every later decision easier." },
  { time: "03:18", text: "Next, we look at the workflow from beginning to end, identifying moments where thoughtful automation can help." },
  { time: "05:06", text: "Finally, we will turn these ideas into a practical checklist you can use in your next project." },
];

function Transcript() {
  const navigate = useNavigate();
  const [video] = useState(() => {
    const email = localStorage.getItem("loggedInUser");
    const savedVideo = email && localStorage.getItem(`currentVideo_${email}`);
    return savedVideo ? JSON.parse(savedVideo) : null;
  });
  const [transcript, setTranscript] = useState(() => {
    const email = localStorage.getItem("loggedInUser");
    const savedVideo = email && localStorage.getItem(`currentVideo_${email}`);
    const currentVideo = savedVideo ? JSON.parse(savedVideo) : null;
    return localStorage.getItem(`transcript_${currentVideo?.id}`) || sampleTranscript.map((item) => item.text).join("\n\n");
  });
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("loggedInUser");
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

  }, [navigate]);

  const generateTranscript = async () => {
    if (!video || status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      let nextTranscript = transcript;
      if (hasApi) {
        const data = await apiRequest(`/videos/${video.id}/transcript`);
        const transcriptStatus = normalizeStatus(data.status);
        const transcriptText = data.transcript || data.text || "";
        if (!transcriptText && (transcriptStatus === PROCESSING_STATUSES.PROCESSING || transcriptStatus === PROCESSING_STATUSES.NOT_STARTED)) {
          setStatus("loading");
          return;
        }
        nextTranscript = transcriptText;
      }
      nextTranscript = nextTranscript || sampleTranscript.map((item) => item.text).join("\n\n");
      setTranscript(nextTranscript);
      localStorage.setItem(`transcript_${video.id}`, nextTranscript);
      setStatus("ready");
    } catch (requestError) {
      setError(requestError.message || "Transcription failed. Please try again.");
      setStatus("error");
    }
  };

  const saveTranscript = () => {
    if (video) localStorage.setItem(`transcript_${video.id}`, transcript);
    setStatus("saved");
  };

  if (!video) {
    return <EmptyState navigate={navigate} />;
  }

  return (
    <main className="workspace-page">
      <section className="workspace-shell">
        <button className="back-link" onClick={() => navigate("/dashboard")}>← Back to dashboard</button>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Content workspace</p>
            <h1>Transcript</h1>
            <p className="lede">Review the generated transcript before turning it into a summary.</p>
          </div>
          <span className={`status-pill ${status === "error" ? "status-error" : "status-ready"}`}>
            <span className="status-dot" /> {status === "loading" ? "Transcribing" : status === "error" ? "Failed" : "Ready to review"}
          </span>
        </div>

        <div className="video-context">
          <div className="video-mark">▶</div>
          <div><strong>{video.filename}</strong><span>Uploaded {video.uploadDate} · Video ID {video.id}</span></div>
          <button className="text-button" onClick={() => navigate("/processing")}>View processing status →</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        <section className="transcript-layout">
          <div className="panel transcript-panel">
            <div className="panel-heading"><div><p className="eyebrow">Generated text</p><h2>Transcript editor</h2></div><button className="secondary-button" onClick={saveTranscript}>Save changes</button></div>
            <textarea value={transcript} onChange={(event) => { setTranscript(event.target.value); setStatus("editing"); }} aria-label="Transcript text" />
            <div className="transcript-footer"><span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span><span>{status === "saved" ? "Changes saved" : "Autosave off"}</span></div>
          </div>
          <aside className="panel timeline-panel"><div className="panel-heading"><div><p className="eyebrow">Highlights</p><h2>Timeline</h2></div></div>{sampleTranscript.map((item) => <button className="timeline-item" key={item.time} onClick={() => setTranscript((current) => current)}><span>{item.time}</span><p>{item.text}</p></button>)}</aside>
        </section>
        <div className="action-row"><button className="secondary-button" onClick={generateTranscript} disabled={status === "loading"}>{status === "loading" ? "Generating transcript..." : "↻ Regenerate transcript"}</button><button className="primary-button" onClick={() => navigate("/summary")}>Generate summary <span>→</span></button></div>
      </section>
    </main>
  );
}

function EmptyState({ navigate }) { return <main className="workspace-page"><section className="empty-state"><div className="empty-icon">◌</div><h1>No video selected</h1><p>Upload a video before generating a transcript.</p><button className="primary-button" onClick={() => navigate("/upload")}>Upload a video →</button></section></main>; }

export default Transcript;
