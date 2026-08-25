import { useState } from "react";
import { useNavigate } from "react-router-dom";

function VideoUpload() {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      setVideo(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!video) {
      alert("Please select a video first.");
      return;
    }

    alert("Video uploaded successfully!");

    navigate("/processing");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
        padding: "30px",
      }}
    >

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <h1>🎬 ClipMind</h1>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Dashboard
        </button>
      </div>

      {/* UPLOAD BOX */}
      <div
        style={{
          maxWidth: "650px",
          margin: "auto",
          background: "white",
          padding: "50px",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        }}
      >
        <h2>Upload Your Video</h2>

        <p style={{ color: "#666" }}>
          Upload a video and let ClipMind create an AI summary.
        </p>

        <div
          style={{
            border: "2px dashed #2563eb",
            borderRadius: "15px",
            padding: "50px 20px",
            marginTop: "30px",
          }}
        >
          <div style={{ fontSize: "50px" }}>📹</div>

          <h3>
            {video ? video.name : "Choose a video"}
          </h3>

          <p style={{ color: "#777" }}>
            Supported formats: MP4, AVI, MOV, MKV
          </p>

          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
          />
        </div>

        {video && (
          <p style={{ marginTop: "20px" }}>
            Selected: <strong>{video.name}</strong>
          </p>
        )}

        <button
          onClick={handleUpload}
          style={{
            marginTop: "25px",
            width: "100%",
            padding: "14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Upload & Summarize
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "12px",
            background: "white",
            color: "#2563eb",
            border: "1px solid #2563eb",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default VideoUpload;