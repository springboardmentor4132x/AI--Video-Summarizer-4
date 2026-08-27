import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProcessingStatus() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);

  const email = localStorage.getItem("loggedInUser");

  useEffect(() => {
    // If user is not logged in
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    // Get current uploaded video
    const savedVideo = localStorage.getItem(
      `currentVideo_${email}`
    );

    if (savedVideo) {
      setVideo(JSON.parse(savedVideo));
    }
  }, [email, navigate]);

  if (!video) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Processing Status</h1>

          <p>
            No video is currently being processed.
          </p>

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

  const status = video.status || "Processing";

  let progress = 50;

  if (status === "Completed") {
    progress = 100;
  }

  if (status === "Failed") {
    progress = 75;
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={icon}>
          🎬
        </div>

        <center><h1>Processing Status</h1></center>

        <p style={subtitle}>
          Track your video processing progress
        </p>

        {/* Video */}
        <div style={videoBox}>
          <div>
            <small>VIDEO</small>

            <h2>
              {video.filename}
            </h2>
          </div>

          <div style={statusBadge(status)}>
            {status === "Completed"
              ? "✓ Completed"
              : status === "Failed"
              ? "✕ Failed"
              : "⏳ Processing"}
          </div>
        </div>

        {/* Progress */}
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

        {/* Horizontal steps */}
        <div style={steps}>

          <Step
            symbol="✓"
            title="Uploaded"
            text="Video received"
            type="completed"
          />

          <div style={line("completed")} />

          <Step
            symbol="✓"
            title="Audio"
            text="Audio extracted"
            type="completed"
          />

          <div
            style={line(
              status === "Completed"
                ? "completed"
                : "active"
            )}
          />

          <Step
            symbol={
              status === "Completed"
                ? "✓"
                : status === "Failed"
                ? "✕"
                : "⏳"
            }
            title="AI Processing"
            text={
              status === "Completed"
                ? "Completed"
                : status === "Failed"
                ? "Failed"
                : "In progress"
            }
            type={
              status === "Completed"
                ? "completed"
                : status === "Failed"
                ? "failed"
                : "active"
            }
          />

          <div
            style={line(
              status === "Completed"
                ? "completed"
                : "pending"
            )}
          />

          <Step
            symbol={status === "Completed" ? "✓" : "○"}
            title="Summary"
            text={
              status === "Completed"
                ? "Ready"
                : "Waiting"
            }
            type={
              status === "Completed"
                ? "completed"
                : "pending"
            }
          />

        </div>

        {/* Message */}
        <div style={messageBox(status)}>

          {status === "Processing" && (
            <>
              <span>⚙️</span>

              <div>
                <strong>
                  Your video is being processed
                </strong>

                <p>
                  Please wait while your video is
                  analyzed and summarized.
                </p>
              </div>
            </>
          )}

          {status === "Completed" && (
            <>
              <span>🎉</span>

              <div>
                <strong>
                  Processing completed!
                </strong>

                <p>
                  Your video summary is ready.
                </p>
              </div>
            </>
          )}

          {status === "Failed" && (
            <>
              <span>⚠️</span>

              <div>
                <strong>
                  Processing failed
                </strong>

                <p>
                  Something went wrong while processing
                  the video.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Buttons */}
        <div style={buttonRow}>

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

/* Step Component */

function Step({ symbol, title, text, type }) {
  return (
    <div style={stepItem}>

      <div style={stepCircle(type)}>
        {symbol}
      </div>

      <strong>{title}</strong>

      <small>{text}</small>

    </div>
  );
}

/* Styles */

const pageStyle = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #eef2ff, #f8fafc)",
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

const statusBadge = (status) => ({
  padding: "9px 15px",
  borderRadius: "20px",
  fontWeight: "bold",
  background:
    status === "Completed"
      ? "#dcfce7"
      : status === "Failed"
      ? "#fee2e2"
      : "#fef3c7",
  color:
    status === "Completed"
      ? "#15803d"
      : status === "Failed"
      ? "#dc2626"
      : "#b45309",
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
  transition: "width 0.5s",
};

const steps = {
  display: "flex",
  alignItems: "flex-start",
  marginTop: "40px",
  overflowX: "auto",
};

const stepItem = {
  minWidth: "130px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const stepCircle = (type) => ({
  width: "45px",
  height: "45px",
  borderRadius: "50%",
  margin: "0 auto 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: "18px",
  background:
    type === "completed"
      ? "#3157d5"
      : type === "active"
      ? "#f59e0b"
      : type === "failed"
      ? "#dc2626"
      : "#e2e8f0",
  color:
    type === "pending"
      ? "#64748b"
      : "white",
});

const line = (type) => ({
  flex: 1,
  minWidth: "30px",
  height: "4px",
  marginTop: "21px",
  borderRadius: "10px",
  background:
    type === "completed"
      ? "#3157d5"
      : type === "active"
      ? "#f59e0b"
      : "#e2e8f0",
});

const messageBox = (status) => ({
  display: "flex",
  alignItems: "center",
  gap: "15px",
  marginTop: "35px",
  padding: "18px",
  borderRadius: "12px",
  background:
    status === "Completed"
      ? "#f0fdf4"
      : status === "Failed"
      ? "#fef2f2"
      : "#fffbeb",
});

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginTop: "30px",
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

const buttonStyle = {
  padding: "11px 20px",
  border: "none",
  borderRadius: "8px",
  background: "#3157d5",
  color: "white",
  cursor: "pointer",
};

export default ProcessingStatus;