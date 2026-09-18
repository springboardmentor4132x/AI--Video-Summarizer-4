import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Summary() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
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

    const fetchSummary = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/summaries/${videoId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to fetch summary."
          );
        }

        if (
          !data.short_summary &&
          !data.detailed_summary
        ) {
          setSummary(null);
          setError(
            "A summary has not been generated for this video yet."
          );
          return;
        }

        setSummary(data);
      } catch (err) {
        console.error("Summary error:", err);

        setError(
          err.message || "Failed to load summary."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.header}>
          <button
            onClick={() => navigate("/results")}
            style={styles.backButton}
          >
            ← Back to Results
          </button>

          <h1 style={styles.heading}>
            AI Generated Summary
          </h1>

          <p style={styles.description}>
            View the summary retrieved from the backend for
            your uploaded video.
          </p>
        </div>

        {loading && (
          <div style={styles.loadingBox}>
            <div style={styles.loadingIcon}>
              ⏳
            </div>

            <h3 style={styles.loadingHeading}>
              Loading Summary
            </h3>

            <p style={styles.loadingText}>
              Please wait while we retrieve the AI-generated
              summary.
            </p>
          </div>
        )}

        {!loading && error && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>
              !
            </div>

            <h3 style={styles.errorHeading}>
              Unable to Load Summary
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

        {!loading && !error && summary && (
          <div style={styles.summaryBox}>

            {summary.short_summary && (
              <section style={styles.summarySection}>
                <h2 style={styles.sectionHeading}>
                  Short Summary
                </h2>

                <p style={styles.summaryContent}>
                  {summary.short_summary}
                </p>
              </section>
            )}

            {summary.detailed_summary && (
              <section style={styles.summarySection}>
                <h2 style={styles.sectionHeading}>
                  Detailed Summary
                </h2>

                <p style={styles.summaryContent}>
                  {summary.detailed_summary}
                </p>
              </section>
            )}

          </div>
        )}

        <div style={styles.buttonRow}>

          <button
            onClick={() => navigate("/transcript")}
            style={styles.transcriptButton}
          >
            📄 Transcript
          </button>

          <button
            onClick={() => navigate("/key-moments")}
            style={styles.keyMomentsButton}
          >
            ⭐ Key Moments
          </button>

          <button
            onClick={() => navigate("/results")}
            style={styles.resultsButton}
          >
            ← Results
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
    background: "#f1f5f9",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#ffffff",
    padding: "35px",
    borderRadius: "16px",
    boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
  },

  header: {
    marginBottom: "30px",
  },

  backButton: {
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "20px",
  },

  heading: {
    margin: 0,
    fontSize: "32px",
    color: "#1e293b",
  },

  description: {
    marginTop: "8px",
    color: "#64748b",
    lineHeight: "1.6",
  },

  loadingBox: {
    padding: "50px 25px",
    textAlign: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
  },

  loadingIcon: {
    fontSize: "35px",
    marginBottom: "12px",
  },

  loadingHeading: {
    margin: "0 0 8px",
    color: "#334155",
    fontSize: "20px",
  },

  loadingText: {
    margin: 0,
    color: "#64748b",
    lineHeight: "1.6",
  },

  errorBox: {
    padding: "35px 25px",
    textAlign: "center",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "14px",
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
    color: "#b91c1c",
  },

  errorText: {
    margin: "0 0 18px",
    color: "#dc2626",
    lineHeight: "1.6",
  },

  primaryButton: {
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  summaryBox: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  summarySection: {
    padding: "24px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
  },

  sectionHeading: {
    margin: "0 0 12px",
    fontSize: "21px",
    color: "#1e293b",
  },

  summaryContent: {
    margin: 0,
    color: "#475569",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "30px",
    flexWrap: "wrap",
  },

  transcriptButton: {
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

  resultsButton: {
    padding: "11px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#334155",
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

export default Summary;