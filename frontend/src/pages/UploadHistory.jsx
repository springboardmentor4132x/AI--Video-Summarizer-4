import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UploadHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const email = localStorage.getItem("loggedInUser");

    if (!email) {
      navigate("/login");
      return;
    }

    const key = `uploadHistory_${email}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      setHistory([]);
    }
  }, [navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1>📁 Upload History</h1>

        <p style={styles.subtitle}>
          Your uploaded videos
        </p>

        {history.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.bigIcon}>🎬</div>

            <h2>No videos uploaded yet</h2>

            <p>
              Your uploaded videos will appear here.
            </p>
          </div>
        ) : (
          <div>
            {history.map((video) => (
              <div
                key={video.id}
                style={styles.video}
              >
                <div style={styles.videoName}>
                  🎥 {video.filename}
                </div>

                <div>
                  Upload Date: {video.uploadDate}
                </div>

                <div style={styles.status}>
                  {video.status === "Completed"
                    ? "✓ Completed"
                    : video.status === "Failed"
                    ? "✕ Failed"
                    : "⏳ Processing"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.buttons}>

          <button
            onClick={() => navigate("/dashboard")}
            style={styles.dashboardButton}
          >
            ← Dashboard
          </button>

          <button
            onClick={() => navigate("/upload")}
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
    padding: "40px",
    fontFamily: "Arial, sans-serif"
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "white",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.08)"
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "30px"
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px"
  },

  bigIcon: {
    fontSize: "50px"
  },

  video: {
    padding: "20px",
    marginBottom: "15px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0"
  },

  videoName: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px"
  },

  status: {
    marginTop: "10px",
    fontWeight: "bold"
  },

  buttons: {
    display: "flex",
    gap: "15px",
    marginTop: "30px"
  },

  dashboardButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#e2e8f0",
    cursor: "pointer"
  },

  uploadButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#3157d5",
    color: "white",
    cursor: "pointer"
  }
};

export default UploadHistory;