import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function ContentInsights() {
  const navigate = useNavigate();

  const [currentVideo, setCurrentVideo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [summary, setSummary] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [keyMoments, setKeyMoments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContentInsights();
  }, []);

  const loadContentInsights = async () => {
    try {
      setLoading(true);
      setError("");

      const email = localStorage.getItem("loggedInUser");

      if (!email) {
        setError("Please login to view content insights.");
        setLoading(false);
        return;
      }

      const storedVideo = localStorage.getItem(
        `currentVideo_${email}`
      );

      if (!storedVideo) {
        setError("No current video found.");
        setLoading(false);
        return;
      }

      const video = JSON.parse(storedVideo);
      setCurrentVideo(video);

      const videoId = video.video_id || video.id;

      if (!videoId) {
        setError("Video ID not found.");
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        fetch(`${API_BASE_URL}/analytics/${videoId}`),
        fetch(`${API_BASE_URL}/transcripts/${videoId}`),
        fetch(`${API_BASE_URL}/summaries/${videoId}`),
        fetch(`${API_BASE_URL}/keywords/${videoId}`),
        fetch(`${API_BASE_URL}/key-moments/${videoId}`),
      ]);

      const [
        analyticsResult,
        transcriptResult,
        summaryResult,
        keywordsResult,
        keyMomentsResult,
      ] = results;

      if (
        analyticsResult.status === "fulfilled" &&
        analyticsResult.value.ok
      ) {
        const data = await analyticsResult.value.json();
        setAnalytics(data);
      }

      if (
        transcriptResult.status === "fulfilled" &&
        transcriptResult.value.ok
      ) {
        const data = await transcriptResult.value.json();

        if (data && data.transcript) {
          setTranscript(data);
        }
      }

      if (
        summaryResult.status === "fulfilled" &&
        summaryResult.value.ok
      ) {
        const data = await summaryResult.value.json();

        if (
          data &&
          (data.short_summary || data.detailed_summary)
        ) {
          setSummary(data);
        }
      }

      if (
        keywordsResult.status === "fulfilled" &&
        keywordsResult.value.ok
      ) {
        const data = await keywordsResult.value.json();

        if (Array.isArray(data)) {
          setKeywords(data);
        } else if (Array.isArray(data?.keywords)) {
          setKeywords(data.keywords);
        }
      }

      if (
        keyMomentsResult.status === "fulfilled" &&
        keyMomentsResult.value.ok
      ) {
        const data = await keyMomentsResult.value.json();

        if (Array.isArray(data)) {
          setKeyMoments(data);
        } else if (Array.isArray(data?.key_moments)) {
          setKeyMoments(data.key_moments);
        }
      }
    } catch (err) {
      console.error("Content Insights error:", err);
      setError("Unable to load content insights.");
    } finally {
      setLoading(false);
    }
  };

  const getAnalyticsValue = (keys, fallback = 0) => {
    if (!analytics) {
      return fallback;
    }

    for (const key of keys) {
      if (
        analytics[key] !== undefined &&
        analytics[key] !== null
      ) {
        return analytics[key];
      }
    }

    return fallback;
  };

  const transcriptText =
    transcript?.transcript ||
    transcript?.text ||
    "";

  const calculatedWordCount = transcriptText
    ? transcriptText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const duration = getAnalyticsValue(
    ["duration_seconds", "duration"],
    0
  );

  const processingTime = getAnalyticsValue(
    [
      "processing_time_seconds",
      "processing_time",
      "average_processing_time",
    ],
    0
  );

  const wordCount = getAnalyticsValue(
    ["word_count", "total_words"],
    calculatedWordCount
  );

  const keywordCount = getAnalyticsValue(
    ["keyword_count", "total_keywords"],
    keywords.length
  );

  const keyMomentCount = getAnalyticsValue(
    ["key_moment_count", "total_key_moments"],
    keyMoments.length
  );

  const formatDuration = (seconds) => {
    if (!seconds || Number(seconds) <= 0) {
      return "Not available";
    }

    const totalSeconds = Math.round(Number(seconds));

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
      padding: "30px",
      fontFamily: "Arial, sans-serif",
      boxSizing: "border-box",
    },

    container: {
      maxWidth: "1200px",
      margin: "0 auto",
    },

    header: {
      background: "#ffffff",
      borderRadius: "16px",
      padding: "25px",
      marginBottom: "25px",
      boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
    },

    title: {
      margin: "0 0 8px",
      color: "#1e293b",
      fontSize: "30px",
    },

    subtitle: {
      margin: 0,
      color: "#64748b",
      fontSize: "15px",
    },

    videoCard: {
      background: "#ffffff",
      borderRadius: "16px",
      padding: "25px",
      marginBottom: "25px",
      boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
    },

    videoTitle: {
      margin: "0 0 12px",
      color: "#1e293b",
      fontSize: "20px",
      wordBreak: "break-word",
    },

    videoId: {
      margin: 0,
      color: "#64748b",
      fontSize: "13px",
      wordBreak: "break-all",
    },

    statsGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "18px",
      marginBottom: "25px",
    },

    statCard: {
      background: "#ffffff",
      borderRadius: "14px",
      padding: "22px",
      boxShadow: "0 5px 18px rgba(0,0,0,0.07)",
    },

    statTitle: {
      margin: "0 0 10px",
      color: "#64748b",
      fontSize: "14px",
      fontWeight: "600",
    },

    statValue: {
      margin: 0,
      color: "#1e293b",
      fontSize: "28px",
      fontWeight: "bold",
    },

    section: {
      background: "#ffffff",
      borderRadius: "16px",
      padding: "25px",
      marginBottom: "25px",
      boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
    },

    sectionTitle: {
      margin: "0 0 18px",
      color: "#1e293b",
      fontSize: "21px",
    },

    summaryBox: {
      background: "#f8fafc",
      borderRadius: "10px",
      padding: "18px",
      lineHeight: "1.7",
      color: "#334155",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },

    transcriptBox: {
      background: "#f8fafc",
      borderRadius: "10px",
      padding: "18px",
      lineHeight: "1.7",
      color: "#334155",
      maxHeight: "300px",
      overflowY: "auto",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },

    keywordContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
    },

    keyword: {
      background: "#eef2ff",
      color: "#4338ca",
      padding: "9px 13px",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: "600",
    },

    momentCard: {
      background: "#f8fafc",
      borderRadius: "10px",
      padding: "18px",
      marginBottom: "12px",
      border: "1px solid #e2e8f0",
    },

    momentTimestamp: {
      color: "#4f46e5",
      fontWeight: "bold",
      marginBottom: "8px",
    },

    momentText: {
      margin: "5px 0",
      color: "#334155",
      lineHeight: "1.5",
    },

    empty: {
      padding: "20px",
      textAlign: "center",
      background: "#f8fafc",
      borderRadius: "10px",
      color: "#64748b",
    },

    error: {
      background: "#fee2e2",
      color: "#991b1b",
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "20px",
    },

    buttons: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      marginTop: "25px",
    },

    button: {
      border: "none",
      borderRadius: "9px",
      padding: "12px 18px",
      background: "#4f46e5",
      color: "#ffffff",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
    },

    insightsButton: {
      border: "none",
      borderRadius: "9px",
      padding: "12px 18px",
      background: "#7c3aed",
      color: "#ffffff",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
    },

    secondaryButton: {
      border: "none",
      borderRadius: "9px",
      padding: "12px 18px",
      background: "#64748b",
      color: "#ffffff",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>
              💡 Content Insights
            </h1>

            <p style={styles.subtitle}>
              Loading real content information...
            </p>
          </div>

          <div style={styles.empty}>
            Loading data from the backend...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <h1 style={styles.title}>
            💡 Content Insights
          </h1>

          <p style={styles.subtitle}>
            Detailed insights generated from the selected video.
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {currentVideo && (
          <div style={styles.videoCard}>
            <h2 style={styles.videoTitle}>
              🎥{" "}
              {currentVideo.filename ||
                currentVideo.file_name ||
                "Uploaded Video"}
            </h2>

            <p style={styles.videoId}>
              Video ID:{" "}
              {currentVideo.video_id ||
                currentVideo.id ||
                "Not available"}
            </p>
          </div>
        )}

        <div style={styles.statsGrid}>

          <div style={styles.statCard}>
            <p style={styles.statTitle}>
              ⏱️ Video Duration
            </p>

            <p style={styles.statValue}>
              {formatDuration(duration)}
            </p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statTitle}>
              ⚙️ Processing Time
            </p>

            <p style={styles.statValue}>
              {processingTime
                ? `${Number(processingTime).toFixed(1)}s`
                : "N/A"}
            </p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statTitle}>
              📝 Word Count
            </p>

            <p style={styles.statValue}>
              {wordCount}
            </p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statTitle}>
              🔑 Keywords
            </p>

            <p style={styles.statValue}>
              {keywordCount}
            </p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statTitle}>
              ⭐ Key Moments
            </p>

            <p style={styles.statValue}>
              {keyMomentCount}
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            📄 Summary
          </h2>

          {summary ? (
            <>
              {summary.short_summary && (
                <div style={{ marginBottom: "15px" }}>
                  <strong>Short Summary</strong>

                  <div style={styles.summaryBox}>
                    {summary.short_summary}
                  </div>
                </div>
              )}

              {summary.detailed_summary && (
                <div>
                  <strong>Detailed Summary</strong>

                  <div style={styles.summaryBox}>
                    {summary.detailed_summary}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.empty}>
              No summary is available yet.
              <br />
              The backend must complete AI processing first.
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            📝 Transcript
          </h2>

          {transcriptText ? (
            <div style={styles.transcriptBox}>
              {transcriptText}
            </div>
          ) : (
            <div style={styles.empty}>
              No transcript is available yet.
              <br />
              The backend must complete transcription first.
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            🔑 Keywords
          </h2>

          {keywords.length > 0 ? (
            <div style={styles.keywordContainer}>
              {keywords.map((item, index) => {
                const keyword =
                  typeof item === "string"
                    ? item
                    : item.keyword ||
                      item.name ||
                      item.word ||
                      item.text ||
                      "";

                if (!keyword) {
                  return null;
                }

                return (
                  <span
                    key={item.id || index}
                    style={styles.keyword}
                  >
                    {keyword}
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={styles.empty}>
              No keywords are available yet.
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            ⭐ Key Moments
          </h2>

          {keyMoments.length > 0 ? (
            keyMoments.map((moment, index) => (
              <div
                key={moment.id || index}
                style={styles.momentCard}
              >
                <div style={styles.momentTimestamp}>
                  ⏱️ {moment.timestamp || "Timestamp unavailable"}
                </div>

                {moment.segment && (
                  <p style={styles.momentText}>
                    <strong>Segment:</strong>{" "}
                    {moment.segment}
                  </p>
                )}

                {moment.highlight && (
                  <p style={styles.momentText}>
                    <strong>Highlight:</strong>{" "}
                    {moment.highlight}
                  </p>
                )}

                {moment.importance && (
                  <p style={styles.momentText}>
                    <strong>Importance:</strong>{" "}
                    {moment.importance}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div style={styles.empty}>
              No key moments are available yet.
            </div>
          )}
        </div>

        <div style={styles.buttons}>

          <button
            style={styles.button}
            onClick={() => navigate("/results")}
          >
            📄 Results
          </button>

          <button
            style={styles.button}
            onClick={() => navigate("/analytics")}
          >
            📈 Analytics
          </button>

          <button
            style={styles.insightsButton}
            onClick={() => navigate("/usage-reports")}
          >
            📊 Usage Reports
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => navigate("/dashboard")}
          >
            🏠 Dashboard
          </button>

        </div>
      </div>
    </div>
  );
}