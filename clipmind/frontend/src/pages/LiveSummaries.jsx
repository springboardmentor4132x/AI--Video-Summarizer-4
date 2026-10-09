import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../live.css";

const ACTIVE_STATES = new Set(["starting", "live"]);

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function LiveSummaries() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  const sessionId = session?.id;
  const sessionStatus = session?.status;

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    const sessionId = localStorage.getItem("currentLiveSummarySession");
    const restore = sessionId
      ? api.getLiveSummary(sessionId)
        .then((savedSession) => {
          if (!cancelled) setSession(savedSession);
        })
        .catch(() => {
          if (!cancelled) localStorage.removeItem("currentLiveSummarySession");
        })
      : Promise.resolve();

    restore.finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (!sessionId || !ACTIVE_STATES.has(sessionStatus)) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const updated = await api.getLiveSummary(sessionId);
        if (!cancelled) setSession(updated);
      } catch (pollError) {
        if (!cancelled) setError(pollError.message || "Unable to refresh the live summary.");
      }
    };
    const timer = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId, sessionStatus]);

  const handleStart = async (event) => {
    event.preventDefault();
    setStarting(true);
    setError("");
    try {
      const created = await api.startLiveSummary(url.trim());
      localStorage.setItem("currentLiveSummarySession", created.id);
      setSession(created);
      setUrl("");
    } catch (startError) {
      setError(startError.message || "Could not start this live stream.");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    setStopping(true);
    setError("");
    try {
      setSession(await api.stopLiveSummary(session.id));
    } catch (stopError) {
      setError(stopError.message || "Could not stop this stream.");
    } finally {
      setStopping(false);
    }
  };

  const handleStartAnother = () => {
    localStorage.removeItem("currentLiveSummarySession");
    setSession(null);
    setError("");
  };

  if (loading) return <div className="page-state">Loading live summaries...</div>;

  const isActive = session && ACTIVE_STATES.has(session.status);

  return (
    <div className="live-summary-page">
      <header className="live-summary-header">
        <div>
          <p className="home-kicker"><span /> LIVE VIDEO WORKSPACE</p>
          <h1>Real-Time Summaries</h1>
          <p>Follow a live stream with an updating transcript and rolling summary.</p>
        </div>
        {isActive && (
          <button className="live-stop-button" type="button" onClick={handleStop} disabled={stopping}>
            {stopping ? "Stopping..." : "Stop stream"}
          </button>
        )}
      </header>

      {error && <div className="live-alert" role="alert">{error}</div>}

      {!isActive && (
        <form className="live-source-form" onSubmit={handleStart}>
          <label htmlFor="live-source-url">Live video URL</label>
          <div className="live-source-row">
            <input
              id="live-source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a YouTube Live or direct .m3u8 link"
              required
              maxLength={2048}
              autoComplete="url"
            />
            <button type="submit" disabled={starting || !url.trim()}>
              {starting ? "Connecting..." : "Start live summary"}
            </button>
          </div>
          <p className="live-source-hint">Supports public YouTube Live pages and direct HLS (.m3u8) streams.</p>
        </form>
      )}

      {session && (
        <>
          <div className="live-session-bar">
            <span className={`live-status live-status-${session.status}`}>
              <i /> {session.status === "live" ? "LIVE" : session.status}
            </span>
            <span>{session.source_kind === "youtube_live" ? "YouTube Live" : "HLS stream"}</span>
            <span>Runtime {formatTime(session.elapsed_seconds)}</span>
            <time>{new Date(session.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </div>

          {session.error_message && <div className="live-alert" role="status">{session.error_message}</div>}

          <div className="live-summary-grid">
            <section className="live-panel live-summary-panel">
              <div className="live-panel-heading">
                <span>ROLLING SUMMARY</span>
                <span>{session.summary ? "UPDATED LIVE" : "BUILDING"}</span>
              </div>
              {session.summary ? (
                <>
                  {session.short_summary && <p className="live-short-summary">{session.short_summary}</p>}
                  <p className="live-detailed-summary">{session.summary}</p>
                </>
              ) : (
                <p className="live-empty-copy">
                  {session.transcript_segments.length
                    ? "The summary will appear as more of the stream is transcribed."
                    : "Waiting for the first audio segment..."}
                </p>
              )}
            </section>

            <section className="live-panel live-transcript-panel">
              <div className="live-panel-heading">
                <span>LIVE TRANSCRIPT</span>
                <span>{session.transcript_segments.length} SEGMENTS</span>
              </div>
              {session.transcript_segments.length ? (
                <ol className="live-transcript-list">
                  {session.transcript_segments.map((segment, index) => (
                    <li key={`${segment.start_time}-${index}`}>
                      <time>{formatTime(segment.start_time)}</time>
                      <p>{segment.text}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="live-empty-copy">Transcript segments will appear here as the audio is processed.</p>
              )}
            </section>
          </div>

          {!isActive && (
            <button className="live-restart-button" type="button" onClick={handleStartAnother}>
              Start another stream
            </button>
          )}
        </>
      )}
    </div>
  );
}