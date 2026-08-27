import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function VideoUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const selected = e.target.files[0];

    setError("");
    setUploaded(false);

    if (!selected) {
      setFile(null);
      return;
    }

    if (!selected.type.startsWith("video/")) {
      setError("Please select a video file.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleUpload = () => {
    const email = localStorage.getItem("loggedInUser");

    if (!email) {
      setError("Please login first.");
      return;
    }

    if (!file) {
      setError("Please select a video.");
      return;
    }

    setUploading(true);
    setError("");

    setTimeout(() => {
      const video = {
        id: Date.now(),
        filename: file.name,
        uploadDate: new Date().toLocaleDateString("en-IN"),
        status: "Processing",
      };

      localStorage.setItem(
        `currentVideo_${email}`,
        JSON.stringify(video)
      );

      const key = `uploadHistory_${email}`;

      const oldHistory = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      localStorage.setItem(
        key,
        JSON.stringify([video, ...oldHistory])
      );

      setUploading(false);
      setUploaded(true);
    }, 1000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.icon}>🎥</div>

        <h1>Upload Video</h1>

        <p style={styles.subtitle}>
          Upload your video for AI processing
        </p>

        {!uploaded ? (
          <>
            <div style={styles.uploadBox}>

              <div style={styles.folder}>📁</div>

              <h3>Select a video</h3>

              <p style={styles.text}>
                MP4, MOV, AVI and other video formats
              </p>

              <label style={styles.chooseButton}>
                🎬 Choose Video

                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  style={{ display: "none" }}
                />
              </label>

              {file && (
                <div style={styles.fileBox}>
                  🎞️
                  <span>{file.name}</span>
                </div>
              )}

              {error && (
                <div style={styles.error}>
                  ❌ {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                style={styles.uploadButton}
              >
                {uploading
                  ? "⏳ Uploading..."
                  : "⬆️ Upload Video"}
              </button>

            </div>
          </>
        ) : (
          <div style={styles.successBox}>

            <div style={styles.successIcon}>✓</div>

            <h2>Video Uploaded Successfully!</h2>

            <p style={styles.text}>
              Your video is now being processed.
            </p>

            <div style={styles.fileBox}>
              🎬
              <span>{file.name}</span>
            </div>

            <div style={styles.buttons}>

              <button
                onClick={() => navigate("/history")}
                style={styles.historyButton}
              >
                📁 View History
              </button>

              <button
                onClick={() => navigate("/processing")}
                style={styles.statusButton}
              >
                ⚙️ View Status
              </button>

            </div>

            <button
              onClick={() => navigate("/dashboard")}
              style={styles.dashboardButton}
            >
              ← Back to Dashboard
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    fontFamily: "Arial",
  },

  card: {
    width: "650px",
    maxWidth: "95%",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  icon: {
    fontSize: "45px",
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "30px",
  },

  uploadBox: {
    border: "2px dashed #cbd5e1",
    padding: "35px",
    borderRadius: "15px",
  },

  folder: {
    fontSize: "50px",
  },

  text: {
    color: "#64748b",
  },

  chooseButton: {
    display: "inline-block",
    padding: "12px 20px",
    marginTop: "15px",
    background: "#e0e7ff",
    color: "#3157d5",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  fileBox: {
    marginTop: "20px",
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },

  error: {
    marginTop: "15px",
    padding: "12px",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: "8px",
  },

  uploadButton: {
    width: "100%",
    marginTop: "20px",
    padding: "13px",
    background: "#3157d5",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  successBox: {
    padding: "20px",
  },

  successIcon: {
    width: "70px",
    height: "70px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "40px",
    fontWeight: "bold",
  },

  buttons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginTop: "25px",
  },

  historyButton: {
    padding: "12px 20px",
    background: "#3157d5",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  statusButton: {
    padding: "12px 20px",
    background: "#f59e0b",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  dashboardButton: {
    marginTop: "20px",
    padding: "11px 20px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default VideoUpload;