import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function VideoUpload() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedVideo, setUploadedVideo] = useState(null);

  const loggedInUser = localStorage.getItem("loggedInUser");

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    setErrorMessage("");
    setUploadMessage("");
    setUploadedVideo(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("video/")) {
      setSelectedFile(null);
      setErrorMessage("Please select a valid video file.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a video before uploading.");
      return;
    }

    if (!loggedInUser) {
      setErrorMessage("Please login before uploading a video.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setErrorMessage("");
    setUploadedVideo(null);

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("email", loggedInUser);

      const response = await fetch(`${API_BASE_URL}/videos/upload`, {
        method: "POST",
        body: formData,
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Upload failed with status ${response.status}.`
        );
      }

      if (!data.video_id) {
        throw new Error(
          data.message || "Video uploaded, but no video ID was returned."
        );
      }

      const videoData = {
        video_id: data.video_id,
        filename: data.filename || selectedFile.name,
        status: data.status || "Uploaded",
        uploaded_at: new Date().toISOString(),
      };

      // Save the current uploaded video.
      localStorage.setItem(
        `currentVideo_${loggedInUser}`,
        JSON.stringify(videoData)
      );

      // Save the upload in the user's history.
      const historyKey = `uploadHistory_${loggedInUser}`;

      const existingHistory = JSON.parse(
        localStorage.getItem(historyKey) || "[]"
      );

      const updatedHistory = [
        videoData,
        ...existingHistory.filter(
          (item) => item.video_id !== videoData.video_id
        ),
      ];

      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

      setUploadedVideo(videoData);
      setUploadMessage(
        "Video uploaded successfully. You can now view the results."
      );
      setSelectedFile(null);

      // Reset file input.
      const fileInput = document.getElementById("video-file-input");

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Video upload error:", error);

      setErrorMessage(
        error.message || "Something went wrong while uploading the video."
      );
    } finally {
      setUploading(false);
    }
  };

  const goToResults = () => {
    if (!uploadedVideo) {
      setErrorMessage("Please upload a video first.");
      return;
    }

    navigate("/results");
  };

  const goToProcessing = () => {
    if (!uploadedVideo) {
      setErrorMessage("Please upload a video first.");
      return;
    }

    navigate("/processing");
  };

  const goToHistory = () => {
    navigate("/history");
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Upload Video</h1>

          <p style={styles.subtitle}>
            Upload your video and view the processing results.
          </p>
        </div>

        {/* Upload Card */}
        <div style={styles.card}>
          <div style={styles.uploadIcon}>🎬</div>

          <h2 style={styles.cardTitle}>Choose a Video</h2>

          <p style={styles.cardText}>
            Select a video file from your computer to upload to ClipMind AI.
          </p>

          <input
            id="video-file-input"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={styles.fileInput}
          />

          {/* Selected File */}
          {selectedFile && (
            <div style={styles.filePreview}>
              <div style={styles.fileIcon}>🎥</div>

              <div style={styles.fileInformation}>
                <strong style={styles.fileName}>
                  {selectedFile.name}
                </strong>

                <span style={styles.fileSize}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div style={styles.errorBox}>
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success */}
          {uploadMessage && (
            <div style={styles.successBox}>
              <span>✅</span>
              <span>{uploadMessage}</span>
            </div>
          )}

          {/* Upload Button */}
          {!uploadedVideo && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              style={{
                ...styles.uploadButton,
                ...(uploading || !selectedFile
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {uploading ? "Uploading..." : "⬆️ Upload Video"}
            </button>
          )}

          {/* Successful Upload Section */}
          {uploadedVideo && (
            <div style={styles.uploadedSection}>
              <div style={styles.completedIcon}>✓</div>

              <h2 style={styles.completedTitle}>
                Upload Completed
              </h2>

              <p style={styles.completedText}>
                Your video has been uploaded successfully.
              </p>

              {/* Video Information */}
              <div style={styles.videoInfoCard}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Video</span>

                  <span style={styles.infoValue}>
                    {uploadedVideo.filename}
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Video ID</span>

                  <span style={styles.infoValue}>
                    {uploadedVideo.video_id}
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Status</span>

                  <span style={styles.statusBadge}>
                    {uploadedVideo.status}
                  </span>
                </div>
              </div>

              {/* Main Results Button */}
              <button
                type="button"
                onClick={goToResults}
                style={styles.resultsButton}
              >
                📊 View Results
              </button>

              {/* Other Navigation Buttons */}
              <div style={styles.secondaryButtons}>
                <button
                  type="button"
                  onClick={goToProcessing}
                  style={styles.secondaryButton}
                >
                  ⚙️ Processing Status
                </button>

                <button
                  type="button"
                  onClick={goToHistory}
                  style={styles.secondaryButton}
                >
                  📚 Upload History
                </button>

                <button
                  type="button"
                  onClick={goToDashboard}
                  style={styles.secondaryButton}
                >
                  🏠 Dashboard
                </button>
              </div>

              {/* Backend Processing Note */}
              <div style={styles.noteBox}>
                <strong>Note:</strong>

                <span>
                  The Results page displays transcript, summary, key
                  moments and keywords only when the backend processing
                  pipeline has generated the corresponding data.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!uploadedVideo && (
          <div style={styles.bottomNavigation}>
            <button
              type="button"
              onClick={goToDashboard}
              style={styles.navButton}
            >
              🏠 Dashboard
            </button>

            <button
              type="button"
              onClick={goToHistory}
              style={styles.navButton}
            >
              📚 History
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
    background:
      "linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #eef2ff 100%)",
    padding: "40px 20px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "30px",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "34px",
    fontWeight: "800",
    color: "#172554",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "16px",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "35px",
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.10)",
    textAlign: "center",
  },

  uploadIcon: {
    width: "75px",
    height: "75px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    backgroundColor: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "34px",
  },

  cardTitle: {
    margin: "0 0 10px",
    color: "#1e293b",
    fontSize: "24px",
  },

  cardText: {
    margin: "0 auto 25px",
    maxWidth: "600px",
    color: "#64748b",
    lineHeight: "1.6",
  },

  fileInput: {
    width: "100%",
    maxWidth: "500px",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    maxWidth: "600px",
    margin: "25px auto 0",
    padding: "15px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    textAlign: "left",
  },

  fileIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "10px",
    backgroundColor: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  fileInformation: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  fileName: {
    color: "#1e293b",
    overflowWrap: "anywhere",
  },

  fileSize: {
    color: "#64748b",
    fontSize: "13px",
  },

  uploadButton: {
    marginTop: "25px",
    padding: "13px 30px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 5px 15px rgba(37, 99, 235, 0.25)",
  },

  disabledButton: {
    backgroundColor: "#94a3b8",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  errorBox: {
    maxWidth: "600px",
    margin: "20px auto 0",
    padding: "13px 16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "10px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    textAlign: "left",
  },

  successBox: {
    maxWidth: "600px",
    margin: "20px auto 0",
    padding: "13px 16px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: "10px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    textAlign: "left",
  },

  uploadedSection: {
    marginTop: "30px",
    paddingTop: "30px",
    borderTop: "1px solid #e2e8f0",
  },

  completedIcon: {
    width: "60px",
    height: "60px",
    margin: "0 auto 15px",
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "800",
  },

  completedTitle: {
    margin: "0 0 8px",
    color: "#166534",
    fontSize: "24px",
  },

  completedText: {
    margin: "0 0 22px",
    color: "#64748b",
  },

  videoInfoCard: {
    maxWidth: "650px",
    margin: "0 auto 25px",
    padding: "18px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    textAlign: "left",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    padding: "12px 0",
    borderBottom: "1px solid #e2e8f0",
  },

  infoLabel: {
    color: "#64748b",
    fontWeight: "600",
    flexShrink: 0,
  },

  infoValue: {
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "right",
    overflowWrap: "anywhere",
  },

  statusBadge: {
    padding: "5px 10px",
    borderRadius: "20px",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: "13px",
  },

  resultsButton: {
    width: "100%",
    maxWidth: "500px",
    padding: "15px 24px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#7c3aed",
    color: "#ffffff",
    fontSize: "17px",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(124, 58, 237, 0.25)",
  },

  secondaryButtons: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "10px",
    marginTop: "15px",
  },

  secondaryButton: {
    padding: "11px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  noteBox: {
    maxWidth: "650px",
    margin: "22px auto 0",
    padding: "14px 16px",
    borderRadius: "10px",
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    display: "flex",
    gap: "8px",
    textAlign: "left",
    lineHeight: "1.5",
    fontSize: "14px",
  },

  bottomNavigation: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "25px",
  },

  navButton: {
    padding: "11px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default VideoUpload;