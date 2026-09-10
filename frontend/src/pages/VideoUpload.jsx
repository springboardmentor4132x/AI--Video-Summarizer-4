import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function VideoUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("Not Started");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState("");
  const [keyMoments, setKeyMoments] = useState([]);

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];

    setError("");
    setUploadedVideo(null);
    setProcessingStatus("Not Started");
    setSummary("");
    setTranscript("");
    setKeyMoments([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please select a video file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
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

    try {
      // Create form data
      const formData = new FormData();

      formData.append("file", file);
      formData.append("email", email);

      // Send video to FastAPI backend
      const response = await fetch(
        "http://127.0.0.1:8000/videos/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Video upload failed.");
        setUploading(false);
        return;
      }

      if (data.message === "User not found") {
        setError("User not found. Please login again.");
        setUploading(false);
        return;
      }

      // Video uploaded successfully
      const video = {
        id: data.video_id,
        filename: data.filename,
        uploadDate: new Date().toLocaleDateString("en-IN"),
        status: data.status,
      };

      // Save current video locally for UI/history
      localStorage.setItem(
        `currentVideo_${email}`,
        JSON.stringify(video)
      );

      // Save video in local history for now
      const historyKey = `uploadHistory_${email}`;

      const oldHistory = JSON.parse(
        localStorage.getItem(historyKey) || "[]"
      );

      localStorage.setItem(
        historyKey,
        JSON.stringify([video, ...oldHistory])
      );

      setUploadedVideo(video);
      setProcessingStatus("Uploaded");
      setUploading(false);

    } catch (error) {
      console.error("Upload error:", error);

      setError(
        "Unable to connect to the backend. Please make sure the server is running."
      );

      setUploading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.icon}>🎥</div>

        <h1>AI Video Summarizer</h1>

        <p style={styles.subtitle}>
          Upload your video and view all results on this page
        </p>

        {/* 1. Upload Video Section */}
        <section style={styles.section}>

          <h2 style={styles.sectionTitle}>
            1. Upload Video
          </h2>

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
                🎞️ <span>{file.name}</span>
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
              style={{
                ...styles.uploadButton,
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading
                ? "⏳ Uploading..."
                : "⬆️ Upload Video"}
            </button>

          </div>

        </section>

        {/* 2. Processing Status Section */}
        {uploadedVideo && (
          <section style={styles.section}>

            <h2 style={styles.sectionTitle}>
              2. Processing Status
            </h2>

            <div style={styles.statusBox}>

              <div style={styles.statusIcon}>
                {processingStatus === "Completed"
                  ? "✓"
                  : "⬆️"}
              </div>

              <h3
                style={{
                  color:
                    processingStatus === "Completed"
                      ? "#16a34a"
                      : "#3157d5",
                }}
              >
                {processingStatus}
              </h3>

              <p style={styles.text}>
                {processingStatus === "Uploaded"
                  ? "Your video has been uploaded successfully."
                  : "Your video is being processed."}
              </p>

              <p style={styles.fileName}>
                🎬 {uploadedVideo.filename}
              </p>

            </div>

          </section>
        )}

        {/* 3. Results Section */}
        {uploadedVideo &&
          processingStatus === "Completed" && (
            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                3. Results
              </h2>

              <div style={styles.resultBox}>

                <h3>📝 Video Summary</h3>

                <p style={styles.resultText}>
                  {summary}
                </p>

                <hr style={styles.line} />

                <h3>📄 Transcript</h3>

                <p style={styles.resultText}>
                  {transcript}
                </p>

              </div>

            </section>
          )}

        {/* 4. Key Moments Section */}
        {uploadedVideo &&
          processingStatus === "Completed" && (
            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                4. Key Moments
              </h2>

              <div style={styles.keyMomentsBox}>

                {keyMoments.map((moment, index) => (

                  <div
                    key={index}
                    style={styles.momentCard}
                  >

                    <div style={styles.timeBox}>
                      {moment.time}
                    </div>

                    <div>

                      <h3 style={styles.momentTitle}>
                        {moment.title}
                      </h3>

                      <p style={styles.resultText}>
                        {moment.description}
                      </p>

                    </div>

                  </div>

                ))}

              </div>

            </section>
          )}

        {/* Bottom Buttons */}
        <div style={styles.bottomButtons}>

          <button
            onClick={() => navigate("/history")}
            style={styles.historyButton}
          >
            📁 View History
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            style={styles.dashboardButton}
          >
            ← Back to Dashboard
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
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "30px",
    fontFamily: "Arial",
  },

  card: {
    width: "750px",
    maxWidth: "100%",
    background: "#ffffff",
    padding: "35px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  icon: {
    fontSize: "45px",
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "25px",
  },

  section: {
    marginTop: "25px",
    padding: "25px",
    border: "1px solid #e2e8f0",
    borderRadius: "15px",
  },

  sectionTitle: {
    marginBottom: "20px",
    color: "#1e293b",
  },

  uploadBox: {
    border: "2px dashed #cbd5e1",
    padding: "30px",
    borderRadius: "15px",
  },

  folder: {
    fontSize: "50px",
  },

  text: {
    color: "#64748b",
    lineHeight: "1.6",
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
    overflowWrap: "anywhere",
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

  statusBox: {
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
  },

  statusIcon: {
    width: "65px",
    height: "65px",
    margin: "0 auto 15px",
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#3157d5",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "32px",
    fontWeight: "bold",
  },

  fileName: {
    fontWeight: "bold",
    color: "#334155",
    overflowWrap: "anywhere",
  },

  resultBox: {
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    textAlign: "left",
  },

  resultText: {
    color: "#475569",
    lineHeight: "1.7",
  },

  line: {
    border: "none",
    borderTop: "1px solid #e2e8f0",
    margin: "20px 0",
  },

  keyMomentsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  momentCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "10px",
    textAlign: "left",
  },

  timeBox: {
    minWidth: "70px",
    padding: "8px",
    background: "#3157d5",
    color: "#ffffff",
    borderRadius: "6px",
    textAlign: "center",
    fontWeight: "bold",
  },

  momentTitle: {
    margin: "0 0 8px",
    color: "#1e293b",
  },

  bottomButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    flexWrap: "wrap",
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

  dashboardButton: {
    padding: "12px 20px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default VideoUpload;