import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Transcript() {
  const navigate = useNavigate();

  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("loggedInUser");

    if (!email) {
      navigate("/login");
      return;
    }

    const storedVideo = localStorage.getItem(
      `currentVideo_${email}`
    );

    if (!storedVideo) {
      setError("No uploaded video found.");
      setLoading(false);
      return;
    }

    let video;

    try {
      video = JSON.parse(storedVideo);
    } catch (err) {
      console.error("Invalid video data:", err);
      setError("Unable to read the uploaded video information.");
      setLoading(false);
      return;
    }

    const videoId = video?.id;

    if (!videoId) {
      setError("Video ID is missing.");
      setLoading(false);
      return;
    }

    const fetchTranscript = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/transcripts/${videoId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to fetch transcript."
          );
        }

        if (!data.transcript) {
          setError(
            "A transcript has not been generated for this video yet."
          );
          return;
        }

        setTranscript(data.transcript);
      } catch (err) {
        console.error("Transcript error:", err);

        setError(
          err.message || "Failed to load transcript."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.headerTop}>
          <button
            onClick={() => navigate("/results")}
            style={styles.backButton}
          >
            ← Back to Results
          </button>

          <button
            onClick={() => navigate("/summary")}
            style={styles.summaryButton}
          >
            View Summary
          </button>
        </div>

        <div style={styles.titleSection}>
          <h1 style={styles.title}>
            Video Transcript
          </h1>

          <p style={styles.subtitle}>
            View the transcript retrieved from the backend
            for your uploaded video.
          </p>
        </div>

        {loading && (
          <div style={styles.message}>
            <div style={styles.loader}>
              ⏳
            </div>

            <h3 style={styles.messageHeading}>
              Loading Transcript
            </h3>

            <p style={styles.messageText}>
              Please wait while we retrieve the transcript.
            </p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>
              !
            </div>

            <h3 style={styles.errorHeading}>
              Unable to Load Transcript
            </h3>

            <p style={styles.errorText}>
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={styles.primaryButton}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && transcript && (
          <div style={styles.transcriptBox}>

            <div style={styles.transcriptHeader}>
              <h2 style={styles.transcriptHeading}>
                Transcript
              </h2>

              <span style={styles.statusBadge}>
                Available
              </span>
            </div>

            <div style={styles.transcriptContent}>
              {transcript}
            </div>

          </div>
        )}

        <div style={styles.buttonRow}>

          <button
            onClick={() => navigate("/results")}
            style={styles.resultsButton}
          >
            ← Results
          </button>

          <button
            onClick={() => navigate("/summary")}
            style={styles.summaryButton}
          >
            📝 Summary
          </button>

          <button
            onClick={() => navigate("/key-moments")}
            style={styles.keyMomentsButton}
          >
            ⭐ Key Moments
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            style={styles.dashboardButton}
          >
            Dashboard
          </button>

        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: "40px 20px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: "1000px",
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "35px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  backButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#3157d5",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  titleSection: {
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    color: "#1e293b",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "8px",
    lineHeight: "1.6",
  },

  message: {
    textAlign: "center",
    padding: "60px 20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    color: "#475569",
  },

  loader: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  messageHeading: {
    margin: "0 0 8px",
    color: "#334155",
  },

  messageText: {
    margin: 0,
    color: "#64748b",
  },

  errorBox: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "14px",
    padding: "35px 25px",
    textAlign: "center",
  },

  errorIcon: {
    width: "45px",
    height: "45px",
    margin: "0 auto 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    fontSize: "24px",
    fontWeight: "bold",
  },

  errorHeading: {
    margin: "0 0 8px",
    color: "#9f1239",
  },

  errorText: {
    margin: "0 0 18px",
    color: "#be123c",
    lineHeight: "1.6",
  },

  primaryButton: {
    padding: "11px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#3157d5",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  transcriptBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#ffffff",
  },

  transcriptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "18px 22px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },

  transcriptHeading: {
    margin: 0,
    color: "#1e293b",
    fontSize: "22px",
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: "15px",
    background: "#dcfce7",
    color: "#15803d",
    fontSize: "13px",
    fontWeight: "bold",
  },

  transcriptContent: {
    padding: "25px",
    lineHeight: "1.8",
    color: "#334155",
    whiteSpace: "pre-wrap",
    fontSize: "16px",
    minHeight: "250px",
    maxHeight: "600px",
    overflowY: "auto",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "30px",
    flexWrap: "wrap",
  },

  resultsButton: {
    padding: "11px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "bold",
  },

  summaryButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  keyMomentsButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#7c3aed",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  dashboardButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#e2e8f0",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Transcript;