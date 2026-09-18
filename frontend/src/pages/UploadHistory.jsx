import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UploadHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const email =
      localStorage.getItem("loggedInUser") ||
      localStorage.getItem("loggedInUserEmail");

    if (!email) {
      navigate("/login");
      return;
    }

    const key = "uploadHistory_" + email;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved);

        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error(
          "Error reading upload history:",
          error
        );

        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [navigate]);

  const viewResults = (video) => {
    const email =
      localStorage.getItem("loggedInUser") ||
      localStorage.getItem("loggedInUserEmail");

    if (!email) {
      navigate("/login");
      return;
    }

    if (!video || !video.id) {
      console.error("Video ID is missing.");
      return;
    }

    // Store the selected video so Results.jsx
    // can fetch its real backend data.
    localStorage.setItem(
      "currentVideo_" + email,
      JSON.stringify(video)
    );

    navigate("/results");
  };

  const getStatusText = (status) => {
    if (status === "Completed") {
      return "✓ Completed";
    }

    if (status === "Failed") {
      return "✕ Failed";
    }

    if (status === "Processing") {
      return "⏳ Processing";
    }

    if (status === "Uploaded") {
      return "↑ Uploaded";
    }

    return "Not Started";
  };

  const getStatusStyle = (status) => {
    if (status === "Completed") {
      return styles.completedStatus;
    }

    if (status === "Failed") {
      return styles.failedStatus;
    }

    if (status === "Processing") {
      return styles.processingStatus;
    }

    return styles.uploadedStatus;
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1 style={styles.heading}>
          📁 Upload History
        </h1>

        <p style={styles.subtitle}>
          View your previously uploaded videos.
        </p>

        {history.length === 0 ? (
          <div style={styles.empty}>

            <div style={styles.bigIcon}>
              🎬
            </div>

            <h2 style={styles.emptyHeading}>
              No Videos Uploaded Yet
            </h2>

            <p style={styles.emptyText}>
              Your uploaded videos will appear here.
            </p>

          </div>
        ) : (
          <div style={styles.historyList}>

            {history.map((video, index) => (
              <div
                key={video.id || index}
                style={styles.video}
              >

                <div style={styles.videoHeader}>

                  <div style={styles.videoName}>
                    🎥 {video.filename || "Unnamed video"}
                  </div>

                  <div
                    style={getStatusStyle(
                      video.status
                    )}
                  >
                    {getStatusText(video.status)}
                  </div>

                </div>

                <div style={styles.details}>

                  <div style={styles.detailItem}>
                    <span style={styles.label}>
                      Upload Date
                    </span>

                    <span>
                      {video.uploadDate ||
                        "Not available"}
                    </span>
                  </div>

                  {video.id && (
                    <div style={styles.detailItem}>
                      <span style={styles.label}>
                        Video ID
                      </span>

                      <span style={styles.videoId}>
                        {video.id}
                      </span>
                    </div>
                  )}

                </div>

                {video.id && (
                  <button
                    onClick={() =>
                      viewResults(video)
                    }
                    style={styles.resultsButton}
                  >
                    📄 View Results
                  </button>
                )}

              </div>
            ))}

          </div>
        )}

        <div style={styles.buttons}>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            style={styles.dashboardButton}
          >
            ← Dashboard
          </button>

          <button
            onClick={() =>
              navigate("/upload")
            }
            style={styles.uploadButton}
          >
            🎥 Upload Video
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

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
  },

  heading: {
    margin: 0,
    fontSize: "32px",
    color: "#1e293b",
  },

  subtitle: {
    color: "#64748b",
    marginTop: "8px",
    marginBottom: "30px",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
  },

  bigIcon: {
    fontSize: "50px",
    marginBottom: "15px",
  },

  emptyHeading: {
    margin: "0 0 10px",
    color: "#334155",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  video: {
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },

  videoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  videoName: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1e293b",
    wordBreak: "break-word",
  },

  completedStatus: {
    color: "#15803d",
    fontWeight: "bold",
  },

  failedStatus: {
    color: "#dc2626",
    fontWeight: "bold",
  },

  processingStatus: {
    color: "#d97706",
    fontWeight: "bold",
  },

  uploadedStatus: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  details: {
    marginTop: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#475569",
    fontSize: "14px",
  },

  detailItem: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  label: {
    fontWeight: "bold",
    color: "#334155",
  },

  videoId: {
    color: "#64748b",
    wordBreak: "break-all",
  },

  resultsButton: {
    marginTop: "18px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },

  buttons: {
    display: "flex",
    gap: "15px",
    marginTop: "30px",
    flexWrap: "wrap",
  },

  dashboardButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#e2e8f0",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "bold",
  },

  uploadButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#3157d5",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default UploadHistory;