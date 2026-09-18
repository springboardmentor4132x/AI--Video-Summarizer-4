import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Keywords() {
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loggedInUser = localStorage.getItem("loggedInUser");

  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login");
      return;
    }

    loadKeywords();
  }, [loggedInUser, navigate]);

  const loadKeywords = async () => {
    try {
      setLoading(true);
      setError("");

      const currentVideoKey = `currentVideo_${loggedInUser}`;
      const currentVideoData = localStorage.getItem(currentVideoKey);

      if (!currentVideoData) {
        setKeywords([]);
        setLoading(false);
        return;
      }

      const currentVideo = JSON.parse(currentVideoData);

      if (!currentVideo || !currentVideo.video_id) {
        setKeywords([]);
        setLoading(false);
        return;
      }

      setVideoId(currentVideo.video_id);

      const response = await fetch(
        `${API_BASE_URL}/keywords/${currentVideo.video_id}`
      );

      if (!response.ok) {
        throw new Error("Unable to retrieve keywords.");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setKeywords(data);
      } else if (Array.isArray(data.keywords)) {
        setKeywords(data.keywords);
      } else {
        setKeywords([]);
      }
    } catch (err) {
      console.error("Keyword loading error:", err);

      setError(
        err.message ||
          "Unable to load keywords. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const getKeywordText = (item) => {
    if (typeof item === "string") {
      return item;
    }

    if (item && typeof item === "object") {
      return item.keyword || item.name || "";
    }

    return "";
  };

  if (loading) {
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
            borderRadius: "18px",
            textAlign: "center",
            boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "15px",
            }}
          >
            🔑
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              color: "#111827",
            }}
          >
            Loading Keywords
          </h2>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
            }}
          >
            Retrieving keywords from the backend...
          </p>
        </div>
      </div>
    );
  }

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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "25px",
            marginBottom: "25px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
          }}
        >
          <p
            style={{
              margin: "0 0 5px",
              color: "#6366f1",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            CLIPMIND AI
          </p>

          <h1
            style={{
              margin: 0,
              color: "#111827",
              fontSize: "30px",
            }}
          >
            Keywords
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#6b7280",
            }}
          >
            Important keywords retrieved from the processed video.
          </p>

          {videoId && (
            <p
              style={{
                margin: "12px 0 0",
                color: "#9ca3af",
                fontSize: "13px",
                wordBreak: "break-word",
              }}
            >
              Video ID: {videoId}
            </p>
          )}
        </div>

        {/* Error */}

        {error && (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Keywords */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "25px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
          }}
        >
          {keywords.length > 0 ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                    fontSize: "22px",
                  }}
                >
                  Extracted Keywords
                </h2>

                <span
                  style={{
                    background: "#eef2ff",
                    color: "#4338ca",
                    padding: "7px 12px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {keywords.length} keyword
                  {keywords.length === 1 ? "" : "s"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                {keywords.map((item, index) => {
                  const keywordText = getKeywordText(item);

                  if (!keywordText) {
                    return null;
                  }

                  return (
                    <div
                      key={item?.id || item?._id || index}
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        color: "#374151",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      #{keywordText}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "45px 20px",
              }}
            >
              <div
                style={{
                  fontSize: "45px",
                  marginBottom: "12px",
                }}
              >
                🔑
              </div>

              <h2
                style={{
                  margin: "0 0 8px",
                  color: "#111827",
                }}
              >
                No Keywords Available
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                }}
              >
                Keywords will appear here when the backend contains keyword
                data for this video.
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}

        <div
          style={{
            marginTop: "25px",
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
            Results
          </button>

          <button
            onClick={() => navigate("/key-moments")}
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
            Key Moments
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
  );
}