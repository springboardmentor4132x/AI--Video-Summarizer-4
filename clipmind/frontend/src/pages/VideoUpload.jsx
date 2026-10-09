import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend note: POST /api/videos/upload returns VideoOut, whose ID field
// is `id` (not `video_id` — the old page assumed a field the backend
// doesn't return). No `email` field is sent; the user is identified by
// the JWT bearer token attached automatically by api.js.

function VideoUpload() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("auto");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedVideo, setUploadedVideo] = useState(null);

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

    if (!api.isAuthed()) {
      setErrorMessage("Please log in before uploading a video.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setErrorMessage("");
    setUploadedVideo(null);

    try {
      // Real backend call: POST /api/videos/upload, multipart FormData,
      // field name "file", JWT sent automatically by api.js.
      const video = await api.uploadVideo(selectedFile, transcriptionLanguage);

      // The backend/database is the source of truth for results.
      // localStorage only remembers WHICH video is currently selected —
      // it never stores fake result data.
      localStorage.setItem("currentVideoId", video.id);

      setUploadedVideo(video);
      setUploadMessage(
        "Video uploaded successfully. Processing has started in the background."
      );
      setSelectedFile(null);

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

  const goToHistory = () => navigate("/history");
  const goToDashboard = () => navigate("/dashboard");

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Upload Video</h1>
          <p style={styles.subtitle}>
            Upload your video and view the processing results.
          </p>
        </div>

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

          <div style={styles.languageField}>
            <label htmlFor="transcription-language" style={styles.languageLabel}>
              Spoken language
            </label>
            <select
              id="transcription-language"
              value={transcriptionLanguage}
              onChange={(event) => setTranscriptionLanguage(event.target.value)}
              disabled={uploading}
              style={styles.languageSelect}
            >
              <option value="auto">Auto-detect</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="en">English</option>
            </select>
            <p style={styles.languageHint}>
              Choose Hindi for Hindi speech. It uses a more accurate model and writes the transcript in Devanagari.
            </p>
          </div>

          {selectedFile && (
            <div style={styles.filePreview}>
              <div style={styles.fileIcon}>🎥</div>
              <div style={styles.fileInformation}>
                <strong style={styles.fileName}>{selectedFile.name}</strong>
                <span style={styles.fileSize}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={styles.errorBox}>
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {uploadMessage && (
            <div style={styles.successBox}>
              <span>✅</span>
              <span>{uploadMessage}</span>
            </div>
          )}

          {!uploadedVideo && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              style={{
                ...styles.uploadButton,
                ...(uploading || !selectedFile ? styles.disabledButton : {}),
              }}
            >
              {uploading ? "Uploading..." : "⬆️ Upload Video"}
            </button>
          )}

          {uploadedVideo && (
            <div style={styles.uploadedSection}>
              <div style={styles.completedIcon}>✓</div>
              <h2 style={styles.completedTitle}>Upload Completed</h2>
              <p style={styles.completedText}>
                Your video has been uploaded successfully.
              </p>

              <div style={styles.videoInfoCard}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Video</span>
                  <span style={styles.infoValue}>{uploadedVideo.filename}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Video ID</span>
                  <span style={styles.infoValue}>{uploadedVideo.id}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Status</span>
                  <span style={styles.statusBadge}>{uploadedVideo.status}</span>
                </div>
              </div>

              <button type="button" onClick={goToResults} style={styles.resultsButton}>
                📊 View Results
              </button>

              <div style={styles.secondaryButtons}>
                <button type="button" onClick={goToProcessing} style={styles.secondaryButton}>
                  ⚙️ Processing Status
                </button>
                <button type="button" onClick={goToHistory} style={styles.secondaryButton}>
                  📚 Upload History
                </button>
                <button type="button" onClick={goToDashboard} style={styles.secondaryButton}>
                  🏠 Dashboard
                </button>
              </div>

              <div style={styles.noteBox}>
                <strong>Note:</strong>
                <span>
                  The Results page displays transcript, summary, key moments,
                  highlights and keywords only once the backend processing
                  pipeline has actually generated each of them.
                </span>
              </div>
            </div>
          )}
        </div>

        {!uploadedVideo && (
          <div style={styles.bottomNavigation}>
            <button type="button" onClick={goToDashboard} style={styles.navButton}>
              🏠 Dashboard
            </button>
            <button type="button" onClick={goToHistory} style={styles.navButton}>
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
    background: "var(--bg-grad)",
    padding: "40px 20px",
    boxSizing: "border-box",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  container: { width: "100%", maxWidth: "900px", margin: "0 auto" },
  header: { textAlign: "center", marginBottom: "30px" },
  title: { margin: "0 0 10px", fontSize: "34px", fontWeight: "800", color: "var(--fg-title)" },
  subtitle: { margin: 0, color: "var(--fg-soft)", fontSize: "16px" },
  card: {
    backgroundColor: "var(--bg-card)",
    borderRadius: "20px",
    padding: "35px",
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.10)",
    textAlign: "center",
  },
  uploadIcon: {
    width: "75px", height: "75px", margin: "0 auto 20px", borderRadius: "50%",
    backgroundColor: "var(--tint-blue-bg)", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "34px",
  },
  cardTitle: { margin: "0 0 10px", color: "var(--fg-strong)", fontSize: "24px" },
  cardText: { margin: "0 auto 25px", maxWidth: "600px", color: "var(--fg-soft)", lineHeight: "1.6" },
  fileInput: {
    width: "100%", maxWidth: "500px", padding: "12px", border: "1px solid var(--line-strong)",
    borderRadius: "10px", backgroundColor: "var(--bg-soft)", boxSizing: "border-box", cursor: "pointer",
  },
  languageField: {
    display: "grid",
    gap: "8px",
    maxWidth: "500px",
    margin: "18px auto 0",
    textAlign: "left",
  },
  languageLabel: { color: "var(--fg-strong)", fontWeight: "600" },
  languageSelect: {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid var(--line-strong)",
    borderRadius: "10px",
    backgroundColor: "var(--bg-soft)",
    color: "var(--fg-strong)",
    font: "inherit",
  },
  languageHint: { margin: 0, color: "var(--fg-soft)", fontSize: "13px", lineHeight: "1.5" },
  filePreview: {
    display: "flex", alignItems: "center", gap: "15px", maxWidth: "600px",
    margin: "25px auto 0", padding: "15px", backgroundColor: "var(--bg-soft)",
    border: "1px solid var(--line)", borderRadius: "12px", textAlign: "left",
  },
  fileIcon: {
    width: "45px", height: "45px", borderRadius: "10px", backgroundColor: "var(--tint-blue-bg)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0,
  },
  fileInformation: { minWidth: 0, display: "flex", flexDirection: "column", gap: "5px" },
  fileName: { color: "var(--fg-strong)", overflowWrap: "anywhere" },
  fileSize: { color: "var(--fg-soft)", fontSize: "13px" },
  uploadButton: {
    marginTop: "25px", padding: "13px 30px", border: "none", borderRadius: "10px",
    backgroundColor: "#2563eb", color: "#ffffff", fontSize: "16px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 5px 15px rgba(37, 99, 235, 0.25)",
  },
  disabledButton: { backgroundColor: "#94a3b8", cursor: "not-allowed", boxShadow: "none" },
  errorBox: {
    maxWidth: "600px", margin: "20px auto 0", padding: "13px 16px", backgroundColor: "var(--err-bg)",
    border: "1px solid var(--err-line)", color: "var(--err-fg)", borderRadius: "10px", display: "flex",
    gap: "10px", alignItems: "center", textAlign: "left",
  },
  successBox: {
    maxWidth: "600px", margin: "20px auto 0", padding: "13px 16px", backgroundColor: "var(--ok-bg)",
    border: "1px solid var(--ok-line)", color: "var(--ok-fg)", borderRadius: "10px", display: "flex",
    gap: "10px", alignItems: "center", textAlign: "left",
  },
  uploadedSection: { marginTop: "30px", paddingTop: "30px", borderTop: "1px solid var(--line)" },
  completedIcon: {
    width: "60px", height: "60px", margin: "0 auto 15px", borderRadius: "50%",
    backgroundColor: "var(--ok-icon-bg)", color: "var(--ok-icon-fg)", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "32px", fontWeight: "800",
  },
  completedTitle: { margin: "0 0 8px", color: "var(--ok-fg)", fontSize: "24px" },
  completedText: { margin: "0 0 22px", color: "var(--fg-soft)" },
  videoInfoCard: {
    maxWidth: "650px", margin: "0 auto 25px", padding: "18px", backgroundColor: "var(--bg-soft)",
    border: "1px solid var(--line)", borderRadius: "12px", textAlign: "left",
  },
  infoRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: "20px", padding: "12px 0", borderBottom: "1px solid var(--line)",
  },
  infoLabel: { color: "var(--fg-soft)", fontWeight: "600", flexShrink: 0 },
  infoValue: { color: "var(--fg-strong)", fontWeight: "600", textAlign: "right", overflowWrap: "anywhere" },
  statusBadge: {
    padding: "5px 10px", borderRadius: "20px", backgroundColor: "var(--tint-blue-bg)",
    color: "var(--tint-blue-fg)", fontWeight: "700", fontSize: "13px",
  },
  resultsButton: {
    width: "100%", maxWidth: "500px", padding: "15px 24px", border: "none", borderRadius: "10px",
    backgroundColor: "#7c3aed", color: "#ffffff", fontSize: "17px", fontWeight: "800",
    cursor: "pointer", boxShadow: "0 6px 18px rgba(124, 58, 237, 0.25)",
  },
  secondaryButtons: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "15px" },
  secondaryButton: {
    padding: "11px 16px", border: "1px solid var(--line-strong)", borderRadius: "9px",
    backgroundColor: "var(--bg-card)", color: "var(--fg-btn)", fontSize: "14px", fontWeight: "700", cursor: "pointer",
  },
  noteBox: {
    maxWidth: "650px", margin: "22px auto 0", padding: "14px 16px", borderRadius: "10px",
    backgroundColor: "var(--warn-bg)", border: "1px solid var(--warn-line)", color: "var(--warn-fg)", display: "flex",
    gap: "8px", textAlign: "left", lineHeight: "1.5", fontSize: "14px",
  },
  bottomNavigation: { display: "flex", justifyContent: "center", gap: "12px", marginTop: "25px" },
  navButton: {
    padding: "11px 18px", border: "1px solid var(--line-strong)", borderRadius: "9px",
    backgroundColor: "var(--bg-card)", color: "var(--fg-btn)", fontWeight: "700", cursor: "pointer",
  },
};

export default VideoUpload;
