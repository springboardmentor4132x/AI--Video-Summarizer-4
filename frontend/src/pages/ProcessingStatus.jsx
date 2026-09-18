import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProcessingStatus() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);

  const loggedInUser = localStorage.getItem("loggedInUser");

  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login");
      return;
    }

    const currentVideoKey = `currentVideo_${loggedInUser}`;
    const storedVideo = localStorage.getItem(currentVideoKey);

    if (storedVideo) {
      try {
        setVideo(JSON.parse(storedVideo));
      } catch (error) {
        console.error("Unable to read current video:", error);
      }
    }
  }, [loggedInUser, navigate]);

  if (!video) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "50px",
              marginBottom: "15px",
            }}
          >
            🎬
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              color: "#111827",
            }}
          >
            No Video Selected
          </h2>

          <p
            style={{
              margin: "0 0 25px",
              color: "#6b7280",
            }}
          >
            Upload a video to view its processing status.
          </p>

          <button
            onClick={() => navigate("/upload")}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Upload Video
          </button>
        </div>
      </div>
    );
  }

  const status = video.status || "Uploaded";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "25px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "30px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "50px",
                marginBottom: "10px",
              }}
            >
              ⚙️
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                color: "#111827",
              }}
            >
              Processing Status
            </h1>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Current status from the uploaded video record.
            </p>
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              background: "#f9fafb",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                color: "#6b7280",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              VIDEO FILE
            </p>

            <h3
              style={{
                margin: "0 0 12px",
                color: "#111827",
                wordBreak: "break-word",
              }}
            >
              {video.filename || "Uploaded video"}
            </h3>

            {video.video_id && (
              <p
                style={{
                  margin: "0 0 12px",
                  color: "#9ca3af",
                  fontSize: "13px",
                  wordBreak: "break-word",
                }}
              >
                Video ID: {video.video_id}
              </p>
            )}

            <div
              style={{
                display: "inline-block",
                padding: "8px 15px",
                borderRadius: "20px",
                background: "#eef2ff",
                color: "#4338ca",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              {status}
            </div>
          </div>

          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                color: "#111827",
              }}
            >
              Processing Information
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                lineHeight: "1.6",
              }}
            >
              The current backend upload endpoint stores the uploaded video
              and its status. AI transcription, summarization, keyword
              extraction, and key-moment processing will appear here after
              those backend services provide the corresponding data.
            </p>
          </div>

          <div
            style={{
              marginTop: "30px",
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <button
              onClick={() => navigate("/results")}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "10px",
                background: "#4f46e5",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              View Results
            </button>

            <button
              onClick={() => navigate("/history")}
              style={{
                padding: "12px 20px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Upload History
            </button>

            <button
              onClick={() => navigate("/analytics")}
              style={{
                padding: "12px 20px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Analytics
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "12px 20px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}