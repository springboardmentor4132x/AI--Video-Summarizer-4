import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function VideoUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const selected = e.target.files[0];

    setError("");
    setUploadedVideo(null);

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

  const handleUpload = async () => {
    setError("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please login first.");
      navigate("/login");
      return;
    }

    if (!file) {
      setError("Please select a video.");
      return;
    }

    setUploading(true);

    try {
      // ------------------------------------
      // 1. Create multipart form data
      // ------------------------------------
      const formData = new FormData();

      formData.append("file", file);

      // ------------------------------------
      // 2. Upload to FastAPI backend
      // ------------------------------------
      const response = await fetch(
        "http://127.0.0.1:8000/api/videos/upload",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data = await response.json();

      // ------------------------------------
      // 3. Handle backend errors
      // ------------------------------------
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("loggedInUser");
          localStorage.removeItem("loggedInUserName");
          localStorage.removeItem("loggedInUserRole");

          navigate("/login");

          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        throw new Error(
          data.detail || "Video upload failed."
        );
      }

      // ------------------------------------
      // 4. Backend successfully created video
      // ------------------------------------
      setUploadedVideo(data);

      // ------------------------------------
      // 5. Save only the backend video reference
      //    for frontend navigation/state
      // ------------------------------------
      const email =
        localStorage.getItem("loggedInUser");

      if (email) {
        localStorage.setItem(
          `currentVideo_${email}`,
          JSON.stringify(data)
        );
      }

      // ------------------------------------
      // 6. Upload successful
      // ------------------------------------
      setFile(null);

    } catch (err) {
      console.error("Video upload error:", err);

      setError(
        err.message ||
          "Unable to upload video. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.icon}>
          🎬
        </div>

        <h1 style={styles.title}>
          Upload Video
        </h1>

        <p style={styles.subtitle}>
          Upload your video for AI processing
        </p>

        {!uploadedVideo ? (
          <>
            {/* Upload box */}
            <div style={styles.uploadBox}>

              <div style={styles.folder}>
                📁
              </div>

              <h3 style={styles.selectTitle}>
                Select a video
              </h3>

              <p style={styles.text}>
                MP4, MOV, AVI and MKV formats
              </p>

              {/* Choose video */}
              <label style={styles.chooseButton}>
                🎬 Choose Video

                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFile}
                  style={{
                    display: "none",
                  }}
                  disabled={uploading}
                />
              </label>

              {/* Selected file */}
              {file && (
                <div style={styles.fileBox}>
                  <span style={styles.fileIcon}>
                    🎞️
                  </span>

                  <span style={styles.fileName}>
                    {file.name}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={styles.error}>
                  ⚠️ {error}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                style={{
                  ...styles.uploadButton,
                  opacity:
                    uploading || !file ? 0.6 : 1,
                  cursor:
                    uploading || !file
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {uploading
                  ? "Uploading..."
                  : "⬆️ Upload Video"}
              </button>

            </div>
          </>
        ) : (
          /* SUCCESS */
          <div style={styles.successBox}>

            <div style={styles.successIcon}>
              ✓
            </div>

            <h2 style={styles.successTitle}>
              Video Uploaded Successfully!
            </h2>

            <p style={styles.text}>
              Your video has been sent to the
              processing engine.
            </p>

            <div style={styles.fileBox}>
              <span style={styles.fileIcon}>
                🎬
              </span>

              <span style={styles.fileName}>
                {uploadedVideo.filename}
              </span>
            </div>

            <div style={styles.statusBox}>
              <strong>
                Status:
              </strong>{" "}
              {uploadedVideo.status}
            </div>

            <div style={styles.buttons}>

              <button
                onClick={() =>
                  navigate(
                    `/processing?videoId=${uploadedVideo.id}`
                  )
                }
                style={styles.statusButton}
              >
                ⚙️ View Processing Status
              </button>

              <button
                onClick={() =>
                  navigate("/history")
                }
                style={styles.historyButton}
              >
                📋 View History
              </button>

            </div>

            <button
              onClick={() =>
                navigate("/dashboard")
              }
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

/* =========================================
   STYLES
========================================= */

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f7ff, #eef2ff)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  card: {
    width: "min(650px, 95%)",
    padding: "45px",
    background: "white",
    borderRadius: "25px",
    boxShadow:
      "0 25px 70px rgba(30,41,59,0.12)",
    textAlign: "center",
  },

  icon: {
    fontSize: "55px",
    marginBottom: "10px",
  },

  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    color: "#111827",
  },

  subtitle: {
    color: "#64748b",
    marginBottom: "35px",
    fontSize: "16px",
  },

  uploadBox: {
    border:
      "2px dashed #c7d2fe",
    borderRadius: "20px",
    padding: "45px 30px",
    background: "#f8faff",
  },

  folder: {
    fontSize: "55px",
    marginBottom: "15px",
  },

  selectTitle: {
    margin: "0 0 8px",
    color: "#1e293b",
    fontSize: "21px",
  },

  text: {
    color: "#64748b",
    lineHeight: "1.6",
  },

  chooseButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "13px 25px",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "white",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  fileBox: {
    marginTop: "25px",
    padding: "15px",
    background: "#f1f5f9",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    wordBreak: "break-word",
  },

  fileIcon: {
    fontSize: "22px",
  },

  fileName: {
    color: "#334155",
    fontWeight: "500",
  },

  error: {
    marginTop: "18px",
    padding: "12px",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: "10px",
    fontSize: "14px",
  },

  uploadButton: {
    width: "100%",
    marginTop: "25px",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, #3157d5, #4f46e5)",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
  },

  successBox: {
    padding: "20px 10px",
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

  successTitle: {
    color: "#166534",
    marginBottom: "10px",
  },

  statusBox: {
    marginTop: "18px",
    padding: "12px",
    borderRadius: "10px",
    background: "#eef2ff",
    color: "#3730a3",
  },

  buttons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "25px",
  },

  statusButton: {
    padding: "13px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#4f46e5",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  historyButton: {
    padding: "13px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#7c3aed",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  dashboardButton: {
    marginTop: "18px",
    padding: "11px 20px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "white",
    color: "#475569",
    cursor: "pointer",
  },
};

export default VideoUpload;