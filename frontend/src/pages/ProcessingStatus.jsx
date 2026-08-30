import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

function ProcessingStatus() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read the video ID from the URL first, then use router state/localStorage as fallback.
  const searchParams = new URLSearchParams(location.search);

  const [videoId, setVideoId] = useState(
    searchParams.get("videoId") ||
      searchParams.get("id") ||
      location.state?.videoId ||
      localStorage.getItem("currentVideoId") ||
      ""
  );

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const pollingRef = useRef(null);

  // IMPORTANT:
  // Login.jsx stores the token as "accessToken"
  const token = localStorage.getItem("accessToken");

  const loadStatus = useCallback(async () => {
    if (!videoId) {
      setLoading(false);
      setError("No video selected.");
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/videos/${videoId}/status`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load video status."
        );
      }

      setVideo(data);
      setError("");
      setLoading(false);

      // Stop polling once processing is finished or transcript is ready
      if (
        data.status === "done" ||
        data.status === "failed" ||
        Boolean(data.transcript?.trim())
      ) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error("Status error:", err);

      setLoading(false);
      setError(
        err.message || "Unable to load video status."
      );
    }
  }, [videoId, token, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryVideoId =
      params.get("videoId") ||
      params.get("id");

    if (queryVideoId) {
      localStorage.setItem(
        "currentVideoId",
        queryVideoId
      );

      setVideoId(queryVideoId);
      return;
    }

    if (location.state?.videoId) {
      localStorage.setItem(
        "currentVideoId",
        location.state.videoId
      );

      setVideoId(location.state.videoId);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    loadStatus();

    pollingRef.current = setInterval(() => {
      loadStatus();
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadStatus]);

  const handleGenerateSummary = async () => {
    if (!videoId || summaryLoading) {
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/videos/${videoId}/summary`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Summary generation failed."
        );
      }

      setVideo(data);
      setSummaryError("");
    } catch (err) {
      console.error("Summary error:", err);

      setSummaryError(
        err.message ||
          "Unable to generate the AI summary."
      );

      // Refresh status so transcript remains visible
      await loadStatus();
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadStatus();
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInUserName");
    localStorage.removeItem("loggedInUserRole");
    localStorage.removeItem("currentVideoId");

    navigate("/login", { replace: true });
  };

  if (loading && !video) {
    return (
      <div style={styles.page}>
        <Header onLogout={handleLogout} />

        <main style={styles.center}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner}>⏳</div>

            <h2>Loading processing status...</h2>

            <p style={styles.muted}>
              Please wait while ClipMind checks your video.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !video) {
    return (
      <div style={styles.page}>
        <Header onLogout={handleLogout} />

        <main style={styles.center}>
          <div style={styles.errorCard}>
            <div style={styles.bigIcon}>⚠️</div>

            <h2>Unable to load video</h2>

            <p style={styles.errorText}>{error}</p>

            <button
              onClick={handleRefresh}
              style={styles.primaryButton}
            >
              ↻ Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
   * IMPORTANT:
   * Older completed database records may contain progress = 0
   * even though their status is "done".
   *
   * Therefore completed videos MUST display 100%.
   */
  const progress = Math.min(
    Math.max(
      video?.status === "done"
        ? 100
        : video?.progress ?? 0,
      0
    ),
    100
  );

  const isDone = video?.status === "done";
  const isFailed = video?.status === "failed";

  const transcriptReady =
    Boolean(video?.transcript?.trim());

  const summaryReady =
    Boolean(video?.summary?.trim());

  return (
    <div style={styles.page}>
      <Header onLogout={handleLogout} />

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.eyebrow}>
            PROCESSING STUDIO
          </div>

          <h1 style={styles.title}>
            {isFailed
              ? "Processing couldn't be completed."
              : isDone
              ? "Your video is ready."
              : "Your video is becoming intelligent."}
          </h1>

          <p style={styles.subtitle}>
            Track every step as ClipMind AI transforms
            your video into searchable knowledge.
          </p>
        </div>

        {/* Video information */}
        <section style={styles.videoCard}>
          <div style={styles.videoHeader}>
            <div>
              <div style={styles.videoName}>
                🎞️ {video?.filename}
              </div>

              <div style={styles.videoId}>
                Video ID: {video?.id}
              </div>
            </div>

            <div
              style={{
                ...styles.statusBadge,
                ...(isDone
                  ? styles.doneBadge
                  : isFailed
                  ? styles.failedBadge
                  : styles.processingBadge),
              }}
            >
              {isDone
                ? "✓ COMPLETE"
                : isFailed
                ? "⚠ FAILED"
                : "⏳ PROCESSING"}
            </div>
          </div>

          {/* Overall progress */}
          <div style={styles.progressSection}>
            <div style={styles.progressHeader}>
              <strong>Processing Progress</strong>

              <strong>{progress}%</strong>
            </div>

            <div style={styles.progressBackground}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progress}%`,
                }}
              />
            </div>

            <p style={styles.progressText}>
              {isDone
                ? "Your video has been fully analyzed."
                : isFailed
                ? "Something went wrong during processing."
                : "ClipMind is processing your video..."}
            </p>
          </div>

          {/* Stages */}
          <div style={styles.stages}>
            <Stage
              number="01"
              title="Uploaded"
              description="Video received"
              complete={
                (video?.upload_progress ?? 0) === 100
              }
              active={
                video?.current_stage === "upload"
              }
              failed={false}
            />

            <Stage
              number="02"
              title="Audio"
              description="Audio extracted"
              complete={
                (video?.audio_progress ?? 0) === 100
              }
              active={
                video?.current_stage === "audio"
              }
              failed={
                isFailed &&
                video?.audio_progress !== 100
              }
            />

            <Stage
              number="03"
              title="AI Processing"
              description="Transcript generated"
              complete={
                (video?.transcription_progress ?? 0) ===
                100
              }
              active={
                video?.current_stage ===
                "transcription"
              }
              failed={
                isFailed &&
                video?.transcription_progress !== 100
              }
            />

            <Stage
              number="04"
              title="Summary"
              description={
                summaryReady
                  ? "Summary ready"
                  : "AI summary"
              }
              complete={summaryReady}
              active={
                video?.current_stage === "summary"
              }
              failed={
                isFailed &&
                !summaryReady &&
                transcriptReady
              }
            />
          </div>
        </section>

        {/* Failure */}
        {isFailed && (
          <section style={styles.failureCard}>
            <div style={styles.failureIcon}>
              ⚠️
            </div>

            <div>
              <h3 style={styles.failureTitle}>
                Processing couldn't be completed
              </h3>

              <p style={styles.failureText}>
                {video?.error_message ||
                  "An unknown processing error occurred."}
              </p>

              {transcriptReady && (
                <p style={styles.failureHint}>
                  Your transcript is still available.
                  You can retry the AI summary below.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Transcript */}
        {transcriptReady && (
          <section style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <div>
                <span style={styles.resultIcon}>
                  📝
                </span>

                <span style={styles.resultTitle}>
                  Transcript
                </span>
              </div>

              <span style={styles.readyBadge}>
                READY
              </span>
            </div>

            <div style={styles.transcriptBox}>
              {video.transcript}
            </div>
          </section>
        )}

        {/* AI Summary */}
        <section style={styles.summaryCard}>
          <div style={styles.resultHeader}>
            <div>
              <span style={styles.resultIcon}>
                ✨
              </span>

              <span style={styles.resultTitle}>
                AI Summary
              </span>
            </div>

            {summaryReady && (
              <span style={styles.readyBadge}>
                READY
              </span>
            )}
          </div>

          {!summaryReady && transcriptReady && (
            <div style={styles.summaryActionArea}>
              <p style={styles.muted}>
                Your transcript is ready. Generate an
                AI-powered summary from it.
              </p>

              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                style={{
                  ...styles.primaryButton,
                  opacity: summaryLoading ? 0.65 : 1,
                  cursor: summaryLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {summaryLoading
                  ? "✨ Generating Summary..."
                  : "✨ Generate Summary"}
              </button>
            </div>
          )}

          {summaryError && (
            <div style={styles.summaryError}>
              <strong>
                Summary generation failed
              </strong>

              <p>{summaryError}</p>

              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                style={styles.retryButton}
              >
                {summaryLoading
                  ? "Retrying..."
                  : "↻ Retry Summary"}
              </button>
            </div>
          )}

          {summaryReady && (
            <div style={styles.summaryContent}>
              <div style={styles.summaryToolbar}>
                <span style={styles.summaryLabel}>
                  AI-generated summary
                </span>

                <button
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  style={{
                    ...styles.secondaryButton,
                    opacity: summaryLoading ? 0.6 : 1,
                  }}
                >
                  {summaryLoading
                    ? "Generating..."
                    : "↻ Regenerate"}
                </button>
              </div>

              <div style={styles.summaryBox}>
                {video.summary}
              </div>
            </div>
          )}
        </section>

        {/* Navigation */}
        <div style={styles.navigation}>
          <button
            onClick={() => navigate("/dashboard")}
            style={styles.secondaryButton}
          >
            ← Dashboard
          </button>

          <button
            onClick={() => navigate("/history")}
            style={styles.secondaryButton}
          >
            📁 History
          </button>

          <button
            onClick={() => navigate("/upload")}
            style={styles.primaryButton}
          >
            🎥 New Video
          </button>

          <button
            onClick={handleRefresh}
            style={styles.secondaryButton}
          >
            ↻ Refresh
          </button>
        </div>
      </main>

      <footer style={styles.footer}>
        CLIPMIND AI • VIDEO INTELLIGENCE ENGINE
      </footer>
    </div>
  );
}

function Header({ onLogout }) {
  return (
    <header style={styles.header}>
      <div>
        <div style={styles.logo}>
          🎬 ClipMind AI
        </div>

        <div style={styles.headerSubtitle}>
          VIDEO INTELLIGENCE ENGINE
        </div>
      </div>

      <div style={styles.headerActions}>
        <button
          onClick={() => {
            window.location.href = "/history";
          }}
          style={styles.headerButton}
        >
          History
        </button>

        <button
          onClick={() => {
            window.location.href = "/upload";
          }}
          style={styles.headerButton}
        >
          + Upload
        </button>

        <button
          onClick={onLogout}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function Stage({
  number,
  title,
  description,
  complete,
  active,
  failed,
}) {
  return (
    <div style={styles.stage}>
      <div
        style={{
          ...styles.stageCircle,
          ...(complete
            ? styles.stageComplete
            : failed
            ? styles.stageFailed
            : active
            ? styles.stageActive
            : {}),
        }}
      >
        {complete ? "✓" : failed ? "!" : number}
      </div>

      <div>
        <div style={styles.stageTitle}>
          {title}
        </div>

        <div style={styles.stageDescription}>
          {description}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f7ff, #eef2ff)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#111827",
  },

  header: {
    background: "white",
    padding: "18px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.08)",
  },

  logo: {
    fontSize: "24px",
    fontWeight: "700",
  },

  headerSubtitle: {
    marginTop: "3px",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#64748b",
  },

  headerActions: {
    display: "flex",
    gap: "10px",
  },

  headerButton: {
    border: "none",
    background: "transparent",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "600",
    color: "#475569",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  main: {
    width: "min(1050px, 92%)",
    margin: "0 auto",
    padding: "55px 0",
  },

  hero: {
    textAlign: "center",
    marginBottom: "35px",
  },

  eyebrow: {
    color: "#4f46e5",
    fontWeight: "700",
    fontSize: "12px",
    letterSpacing: "2px",
  },

  title: {
    fontSize: "38px",
    margin: "12px 0",
  },

  subtitle: {
    color: "#64748b",
    fontSize: "16px",
    lineHeight: "1.6",
  },

  videoCard: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    boxShadow:
      "0 15px 45px rgba(30,41,59,0.09)",
  },

  videoHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
  },

  videoName: {
    fontSize: "21px",
    fontWeight: "700",
  },

  videoId: {
    marginTop: "7px",
    fontSize: "12px",
    color: "#94a3b8",
    wordBreak: "break-all",
  },

  statusBadge: {
    padding: "8px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  doneBadge: {
    background: "#dcfce7",
    color: "#166534",
  },

  failedBadge: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  processingBadge: {
    background: "#e0e7ff",
    color: "#3730a3",
  },

  progressSection: {
    marginTop: "30px",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },

  progressBackground: {
    width: "100%",
    height: "12px",
    borderRadius: "99px",
    background: "#e2e8f0",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: "99px",
    background:
      "linear-gradient(90deg, #4f46e5, #a855f7)",
    transition: "width 0.5s ease",
  },

  progressText: {
    color: "#64748b",
    fontSize: "14px",
  },

  stages: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
    marginTop: "35px",
  },

  stage: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  stageCircle: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  stageComplete: {
    background: "#dcfce7",
    color: "#166534",
  },

  stageActive: {
    background: "#e0e7ff",
    color: "#3730a3",
  },

  stageFailed: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  stageTitle: {
    fontWeight: "700",
  },

  stageDescription: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "3px",
  },

  failureCard: {
    marginTop: "25px",
    padding: "22px",
    borderRadius: "16px",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    display: "flex",
    gap: "15px",
  },

  failureIcon: {
    fontSize: "25px",
  },

  failureTitle: {
    margin: "0 0 8px",
    color: "#991b1b",
  },

  failureText: {
    color: "#7f1d1d",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  failureHint: {
    color: "#9f1239",
    fontWeight: "600",
  },

  resultCard: {
    marginTop: "25px",
    background: "white",
    borderRadius: "20px",
    padding: "28px",
    boxShadow:
      "0 10px 35px rgba(30,41,59,0.07)",
  },

  summaryCard: {
    marginTop: "25px",
    background: "white",
    borderRadius: "20px",
    padding: "28px",
    boxShadow:
      "0 10px 35px rgba(30,41,59,0.07)",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  resultIcon: {
    fontSize: "22px",
    marginRight: "9px",
  },

  resultTitle: {
    fontSize: "20px",
    fontWeight: "700",
  },

  readyBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: "15px",
    fontSize: "11px",
    fontWeight: "700",
  },

  transcriptBox: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "20px",
    lineHeight: "1.7",
    color: "#334155",
    whiteSpace: "pre-wrap",
  },

  summaryActionArea: {
    textAlign: "center",
    padding: "20px 10px 10px",
  },

  summaryContent: {
    marginTop: "10px",
  },

  summaryToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    gap: "15px",
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "13px",
  },

  summaryBox: {
    background:
      "linear-gradient(135deg, #f8fafc, #f5f3ff)",
    borderRadius: "14px",
    padding: "22px",
    lineHeight: "1.75",
    color: "#334155",
    whiteSpace: "pre-wrap",
  },

  summaryError: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    padding: "18px",
    color: "#9a3412",
  },

  navigation: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "35px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 18px",
    background:
      "linear-gradient(135deg, #3157d5, #4f46e5)",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "11px 18px",
    background: "white",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "600",
  },

  retryButton: {
    border: "none",
    borderRadius: "8px",
    padding: "9px 15px",
    background: "#ea580c",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
  },

  muted: {
    color: "#64748b",
    lineHeight: "1.6",
  },

  center: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingCard: {
    background: "white",
    borderRadius: "20px",
    padding: "50px",
    textAlign: "center",
    boxShadow:
      "0 15px 45px rgba(30,41,59,0.09)",
  },

  spinner: {
    fontSize: "45px",
  },

  errorCard: {
    width: "min(500px, 90%)",
    background: "white",
    borderRadius: "20px",
    padding: "45px",
    textAlign: "center",
    boxShadow:
      "0 15px 45px rgba(30,41,59,0.09)",
  },

  bigIcon: {
    fontSize: "50px",
  },

  errorText: {
    color: "#991b1b",
    marginBottom: "20px",
  },

  footer: {
    textAlign: "center",
    padding: "30px",
    color: "#94a3b8",
    fontSize: "11px",
    letterSpacing: "1px",
  },
};

export default ProcessingStatus;