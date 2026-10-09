import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend note (verified from app/api/routes/videos.py and
// app/services/process_video.py): POST /api/videos/{id}/summary
// generates/regenerates the summary and returns the full VideoOut.
// There is no separate GET-only summary endpoint.
//
// UPDATE (Milestone 1-3 audit): short_summary and summary are now
// genuinely different fields. Previously generate_summary() produced
// one combined block of text that was assigned to both fields; it now
// asks the model for two distinct sections (a short overview and a
// fuller detailed summary) and the backend stores them separately.

function Summary() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const videoId = typeof window !== "undefined" ? localStorage.getItem("currentVideoId") : null;

  const loadStatus = async () => {
    try {
      // Use status, not a summary-specific GET — the backend doesn't have
      // one; VideoOut already carries summary/short_summary once generated.
      const data = await api.getVideoStatus(videoId);
      setVideo(data);
      return data;
    } catch (err) {
      setError(err.message || "Unable to load this video.");
      return null;
    }
  };

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    (async () => {
      if (!videoId) {
        setError("No uploaded video selected yet.");
        setLoading(false);
        return;
      }
      await loadStatus();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    try {
      const data = await api.generateSummary(videoId);
      setVideo(data);
    } catch (err) {
      setError(err.message || "Summary generation failed.");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <div className="page-state">Loading summary...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!video) return null;

  const hasSummary = Boolean(video.summary && video.summary.trim());
  const hasShortSummary = Boolean(video.short_summary && video.short_summary.trim());

  return (
    <div className="summary-page">
      <h2>Summary — {video.filename}</h2>

      {hasSummary ? (
        <>
          {hasShortSummary && (
            <section className="short-summary">
              <h3>Short overview</h3>
              <p className="summary-text">{video.short_summary}</p>
            </section>
          )}
          <section className="detailed-summary">
            <h3>Detailed summary</h3>
            <p className="summary-text">{video.summary}</p>
          </section>
        </>
      ) : (
        // Real empty/error state — never a fabricated sample summary.
        // If generation failed, video.error_message carries the real
        // reason (e.g. "AI summary unavailable: <actual error>").
        <div className="page-state">
          {video.error_message
            ? `Summary unavailable: ${video.error_message}`
            : "Summary not generated yet."}
        </div>
      )}

      <button onClick={handleRegenerate} disabled={regenerating}>
        {regenerating ? "Generating..." : hasSummary ? "Regenerate summary" : "Generate summary"}
      </button>
    </div>
  );
}

export default Summary;
