import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend note: GET /api/videos/{id}/status returns the full VideoOut,
// including current_stage (upload|audio|transcription|summary|
// key_moments|highlights|keywords|done|failed) and the per-stage
// *_progress fields plus overall progress/status. The old page just
// read a single static snapshot out of localStorage and never polled,
// so it could never reflect real progress.

const POLL_INTERVAL_MS = 3000;

function StageRow({ label, progress }) {
  return (
    <div className="stage-row">
      <span className="stage-label">{label}</span>
      <div className="stage-bar">
        <div className="stage-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="stage-percent">{progress}%</span>
    </div>
  );
}

export default function ProcessingStatus() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }

    const videoId = localStorage.getItem("currentVideoId");

    const poll = async () => {
      try {
        const data = await api.getVideoStatus(videoId);
        setVideo(data);

        if (data.status === "done" || data.status === "failed") {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        setError(err.message || "Unable to load processing status.");
        clearInterval(pollRef.current);
      }
    };

    (async () => {
      if (!videoId) {
        setError("No video selected.");
        return;
      }
      await poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    })();

    return () => clearInterval(pollRef.current);
  }, [navigate]);

  if (error) {
    return (
      <div className="processing-page page-state">
        <h2>🎬 No Video Selected</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/upload")}>Upload a video</button>
      </div>
    );
  }

  if (!video) {
    return <div className="page-state">Loading status...</div>;
  }

  if (video.status === "failed") {
    return (
      <div className="processing-page page-state error">
        <h2>Processing failed</h2>
        <p>{video.error_message || "An unknown error occurred."}</p>
      </div>
    );
  }

  return (
    <div className="processing-page">
      <h2>Processing — {video.filename}</h2>
      <p className="overall-status">
        Overall progress: {video.progress}% — stage: {video.current_stage}
      </p>

      <StageRow label="Upload" progress={video.upload_progress} />
      <StageRow label="Audio extraction" progress={video.audio_progress} />
      <StageRow label="Transcription (Whisper)" progress={video.transcription_progress} />
      <StageRow label="Summary" progress={video.summary_progress} />
      <StageRow label="Key moments" progress={video.key_moments_progress} />
      <StageRow label="Highlights" progress={video.highlights_progress} />
      <StageRow label="Keywords" progress={video.keywords_progress} />

      {video.status === "done" ? (
        <button onClick={() => navigate("/results")}>View results</button>
      ) : (
        <p className="page-state">Processing... this page updates automatically.</p>
      )}
    </div>
  );
}
