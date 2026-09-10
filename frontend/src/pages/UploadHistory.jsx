import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UploadHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Get logged-in user email
    const email =
      localStorage.getItem("loggedInUser") ||
      localStorage.getItem("loggedInUserEmail");

    // If user is not logged in
    if (!email) {
      navigate("/login");
      return;
    }

    // Get history for this user
    const key = `uploadHistory_${email}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (error) {
        console.error("Error reading upload history:", error);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [navigate]);

  // Open Results page
  const viewResults = (video) => {
    navigate("/results", {
      state: {
        videoName: video.filename,
        transcript:
          "This is the transcript generated from the uploaded video using Whisper.",
        shortSummary:
          "The video explains the main concepts discussed in the uploaded content.",
        detailedSummary:
          "The detailed AI-generated summary of the uploaded video will appear here after backend processing.",
      },
    });
  };

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
            {history.map((video, index) => (
              <div
                key={video.id || index}
                style={styles.video}
              >
                <div style={styles.videoName}>
                  🎥 {video.filename}
                </div>

                <div>
                  Upload Date:{" "}
                  {video.uploadDate || "Not available"}
                </div>

                <div style={styles.status}>
                  {video.status === "Completed"
                    ? "✓ Completed"
                    : video.status === "Failed"
                    ? "✕ Failed"
                    : "⏳ Processing"}
                </div>

                {video.status === "Completed" && (
                  <button
                    onClick={() => viewResults(video)}
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
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "white",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.08)",
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "30px",
  },

  empty: {
    textAlign: "center",
    padding: "50px 20px",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
  },

  bigIcon: {
    fontSize: "50px",
  },

  video: {
    padding: "20px",
    marginBottom: "15px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
  },

  videoName: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
  },

  status: {
    marginTop: "10px",
    fontWeight: "bold",
  },

  resultsButton: {
    marginTop: "15px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  buttons: {
    display: "flex",
    gap: "15px",
    marginTop: "30px",
  },

  dashboardButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#e2e8f0",
    cursor: "pointer",
  },

  uploadButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#3157d5",
    color: "white",
    cursor: "pointer",
  },
};

export default UploadHistory;