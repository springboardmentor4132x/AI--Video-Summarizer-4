import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProcessingStatus() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);

  const email = localStorage.getItem("loggedInUser");

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    const savedVideo = localStorage.getItem(`currentVideo_${email}`);

    if (savedVideo) {
      setVideo(JSON.parse(savedVideo));
    }
  }, [email, navigate]);

  if (!video) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Processing Status</h1>
          <p>No video is currently being processed.</p>

          <button
            onClick={() => navigate("/dashboard")}
            style={buttonStyle}
          >
            ← Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Temporary test: change this to video.status after testing
  const status = "Completed";

  const progress = status === "Completed" ? 100 : 50;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={icon}>🎬</div>

        <h1 style={{ textAlign: "center" }}>Processing Status</h1>

        <p style={subtitle}>
          Track your video processing progress
        </p>

        <div style={videoBox}>
          <div>
            <small>VIDEO</small>
            <h2>{video.filename}</h2>
          </div>

          <div style={statusBadge(status)}>
            ✓ Completed
          </div>
        </div>

        <div style={progressHeader}>
          <span>Processing Progress</span>
          <strong>{progress}%</strong>
        </div>

        <div style={progressBackground}>
          <div
            style={{
              ...progressBar,
              width: `${progress}%`,
            }}
          />
        </div>

        <div style={messageBox}>
          <span>🎉</span>

          <div>
            <strong>Processing completed!</strong>
            <p>Your video summary is ready.</p>
          </div>
        </div>

        <div style={buttonRow}>
          <button
            onClick={() => navigate("/results")}
            style={resultsButton}
          >
            View Results
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            style={dashboardButton}
          >
            ← Dashboard
          </button>

          <button
            onClick={() => navigate("/history")}
            style={historyButton}
          >
            📁 History
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const cardStyle = {
  width: "950px",
  maxWidth: "95%",
  background: "white",
  padding: "40px",
  borderRadius: "20px",
  boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
};

const icon = {
  fontSize: "40px",
  textAlign: "center",
};

const subtitle = {
  textAlign: "center",
  color: "#64748b",
  marginBottom: "30px",
};

const videoBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8fafc",
  padding: "20px",
  borderRadius: "12px",
};

const statusBadge = () => ({
  padding: "9px 15px",
  borderRadius: "20px",
  fontWeight: "bold",
  background: "#dcfce7",
  color: "#15803d",
});

const progressHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "30px",
  marginBottom: "8px",
};

const progressBackground = {
  height: "9px",
  background: "#e2e8f0",
  borderRadius: "20px",
  overflow: "hidden",
};

const progressBar = {
  height: "100%",
  background: "#3157d5",
  borderRadius: "20px",
};

const messageBox = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
  marginTop: "35px",
  padding: "18px",
  borderRadius: "12px",
  background: "#f0fdf4",
};

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginTop: "30px",
  flexWrap: "wrap",
};

const dashboardButton = {
  padding: "11px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#e2e8f0",
  cursor: "pointer",
};

const historyButton = {
  padding: "11px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#3157d5",
  color: "white",
  cursor: "pointer",
};

const resultsButton = {
  padding: "11px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
};

const buttonStyle = {
  padding: "11px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#3157d5",
  color: "white",
  cursor: "pointer",
};

export default ProcessingStatus;