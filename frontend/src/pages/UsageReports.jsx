import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function UsageReports() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsageReports();
  }, []);

  const loadUsageReports = async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewResponse, processingResponse, dashboardResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/analytics/stats/overview`),
          fetch(`${API_BASE_URL}/analytics/stats/processing`),
          fetch(`${API_BASE_URL}/analytics/stats/dashboard`),
        ]);

      const overviewData = overviewResponse.ok
        ? await overviewResponse.json()
        : null;

      const processingData = processingResponse.ok
        ? await processingResponse.json()
        : null;

      const dashboardData = dashboardResponse.ok
        ? await dashboardResponse.json()
        : null;

      setOverview(overviewData);
      setProcessing(processingData);
      setDashboard(dashboardData);
    } catch (err) {
      console.error("Usage Reports error:", err);
      setError("Unable to load usage report data.");
    } finally {
      setLoading(false);
    }
  };

  const getValue = (object, keys) => {
    if (!object) return 0;

    for (const key of keys) {
      if (
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return 0;
  };

  const totalVideos = getValue(overview, [
    "total_videos",
    "totalVideos",
    "videos",
  ]);

  const totalKeywords = getValue(overview, [
    "total_keywords",
    "totalKeywords",
    "keywords",
  ]);

  const totalKeyMoments = getValue(overview, [
    "total_key_moments",
    "totalKeyMoments",
    "key_moments",
  ]);

  const totalSummaries = getValue(overview, [
    "total_summaries",
    "totalSummaries",
    "summaries",
  ]);

  const processedVideos = getValue(overview, [
    "processed_videos",
    "processedVideos",
  ]);

  const processingTime = getValue(processing, [
    "average_processing_time",
    "average_processing_time_seconds",
    "avg_processing_time",
  ]);

  const latestUpload =
    dashboard?.latest_upload ||
    dashboard?.latestUpload ||
    overview?.latest_upload ||
    overview?.latestUpload ||
    null;

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
      fontSize: "30px",
      color: "#1e293b",
    },

    subtitle: {
      margin: 0,
      color: "#64748b",
      fontSize: "15px",
    },

    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "18px",
      marginBottom: "25px",
    },

    card: {
      background: "#ffffff",
      borderRadius: "14px",
      padding: "22px",
      boxShadow: "0 5px 18px rgba(0,0,0,0.07)",
    },

    cardTitle: {
      margin: "0 0 12px",
      color: "#64748b",
      fontSize: "14px",
      fontWeight: "600",
    },

    number: {
      margin: 0,
      fontSize: "30px",
      fontWeight: "bold",
      color: "#1e293b",
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

    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "20px",
      padding: "12px 0",
      borderBottom: "1px solid #e2e8f0",
      flexWrap: "wrap",
    },

    label: {
      color: "#64748b",
      fontWeight: "600",
    },

    value: {
      color: "#1e293b",
      fontWeight: "500",
      textAlign: "right",
    },

    empty: {
      padding: "25px",
      textAlign: "center",
      color: "#64748b",
      background: "#f8fafc",
      borderRadius: "10px",
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
      marginTop: "20px",
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
            <h1 style={styles.title}>📊 Usage Reports</h1>
            <p style={styles.subtitle}>Loading usage information...</p>
          </div>

          <div style={styles.empty}>
            Loading real usage data from the backend...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Usage Reports</h1>
          <p style={styles.subtitle}>
            Overview of video processing and system usage.
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.statsGrid}>
          <div style={styles.card}>
            <p style={styles.cardTitle}>📹 Total Videos</p>
            <p style={styles.number}>{totalVideos}</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>📝 Transcripts</p>
            <p style={styles.number}>
              {getValue(overview, ["total_transcripts", "totalTranscripts"])}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>📄 Summaries</p>
            <p style={styles.number}>{totalSummaries}</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>🔑 Keywords</p>
            <p style={styles.number}>{totalKeywords}</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>⭐ Key Moments</p>
            <p style={styles.number}>{totalKeyMoments}</p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardTitle}>✅ Processed Videos</p>
            <p style={styles.number}>{processedVideos}</p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>⚙️ Processing Usage</h2>

          <div style={styles.infoRow}>
            <span style={styles.label}>Average Processing Time</span>
            <span style={styles.value}>
              {processingTime
                ? `${Number(processingTime).toFixed(1)} seconds`
                : "No data available"}
            </span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.label}>Processing Information</span>
            <span style={styles.value}>
              {processing
                ? "Backend data available"
                : "No processing data available"}
            </span>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📅 Latest Activity</h2>

          {latestUpload ? (
            <>
              <div style={styles.infoRow}>
                <span style={styles.label}>File Name</span>
                <span style={styles.value}>
                  {latestUpload.filename ||
                    latestUpload.file_name ||
                    latestUpload.name ||
                    "Not available"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.label}>Status</span>
                <span style={styles.value}>
                  {latestUpload.status || "Not available"}
                </span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.label}>Video ID</span>
                <span style={styles.value}>
                  {latestUpload.video_id ||
                    latestUpload.id ||
                    "Not available"}
                </span>
              </div>
            </>
          ) : (
            <div style={styles.empty}>
              No latest upload information is available.
            </div>
          )}
        </div>

        <div style={styles.buttons}>
          <button
            style={styles.button}
            onClick={() => navigate("/analytics")}
          >
            📈 Analytics
          </button>

          <button
            style={styles.button}
            onClick={() => navigate("/content-insights")}
          >
            💡 Content Insights
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