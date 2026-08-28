import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

function UploadHistory() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/videos/history`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load history."
        );
      }

      setVideos(data);
      setError("");
    } catch (err) {
      console.error("History error:", err);
      setError(
        err.message || "Unable to load upload history."
      );
    } finally {
      setLoading(false);
    }
  };

  const openVideo = (video) => {
    if (!video?.id) {
      setError("This video does not have a valid ID.");
      return;
    }

    // Save the exact MongoDB video ID.
    localStorage.setItem(
      "currentVideoId",
      video.id
    );

    // Pass the exact ID to ProcessingStatus.
    navigate("/processing", {
      state: {
        videoId: video.id,
      },
    });
  };

  const getStatus = (video) => {
    if (video.status === "done") {
      return {
        text: "✅ Completed",
        className: "completed",
      };
    }

    if (video.status === "failed") {
      return {
        text: "❌ Failed",
        className: "failed",
      };
    }

    return {
      text: "📤 Uploaded",
      className: "uploaded",
    };
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <Header navigate={navigate} />

        <main style={styles.center}>
          <h2>Loading upload history...</h2>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Header navigate={navigate} />

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.icon}>📁</div>

          <h1 style={styles.title}>
            Upload History
          </h1>

          <p style={styles.subtitle}>
            Your uploaded videos
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {!error && videos.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🎥</div>

            <h2>No videos yet</h2>

            <p>
              Upload your first video to get started.
            </p>

            <button
              onClick={() => navigate("/upload")}
              style={styles.primaryButton}
            >
              🎥 Upload Video
            </button>
          </div>
        )}

        <div style={styles.list}>
          {videos.map((video) => {
            const status = getStatus(video);

            return (
              <button
                key={video.id}
                type="button"
                onClick={() => openVideo(video)}
                style={styles.card}
              >
                <div style={styles.cardTop}>
                  <div style={styles.filename}>
                    🎥 {video.filename}
                  </div>

                  <div
                    style={{
                      ...styles.status,
                      ...(status.className ===
                      "completed"
                        ? styles.completed
                        : status.className ===
                          "failed"
                        ? styles.failed
                        : styles.uploaded),
                    }}
                  >
                    {status.text}
                  </div>
                </div>

                <div style={styles.details}>
                  <span>
                    Upload Date:{" "}
                    {video.uploaded_at
                      ? new Date(
                          video.uploaded_at
                        ).toLocaleDateString()
                      : "Unknown"}
                  </span>

                  <span>
                    Progress: {video.progress ?? 0}%
                  </span>
                </div>

                <div style={styles.cardFooter}>
                  <span>
                    Click to view processing status →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={styles.navigation}>
          <button
            onClick={() =>
              navigate("/dashboard")
            }
            style={styles.secondaryButton}
          >
            ← Dashboard
          </button>

          <button
            onClick={() => navigate("/upload")}
            style={styles.primaryButton}
          >
            🎥 Upload Video
          </button>
        </div>
      </main>
    </div>
  );
}

function Header({ navigate }) {
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInUserName");
    localStorage.removeItem("loggedInUserRole");
    localStorage.removeItem("currentVideoId");

    navigate("/login", { replace: true });
  };

  return (
    <header style={styles.header}>
      <div
        style={styles.logo}
        onClick={() => navigate("/dashboard")}
      >
        🎬 ClipMind AI
      </div>

      <div style={styles.headerRight}>
        <button
          onClick={() => navigate("/history")}
          style={styles.headerButton}
        >
          History
        </button>

        <button
          onClick={() => navigate("/upload")}
          style={styles.headerButton}
        >
          + Upload
        </button>

        <button
          onClick={logout}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f7ff, #eef2ff)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#111827",
  },

  header: {
    background: "white",
    padding: "18px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.08)",
  },

  logo: {
    fontSize: "24px",
    fontWeight: "700",
    cursor: "pointer",
  },

  headerRight: {
    display: "flex",
    gap: "10px",
  },

  headerButton: {
    border: "none",
    background: "transparent",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "600",
    color: "#475569",
  },

  logoutButton: {
    border: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  main: {
    width: "min(1000px, 92%)",
    margin: "0 auto",
    padding: "55px 0",
  },

  hero: {
    textAlign: "center",
    marginBottom: "35px",
  },

  icon: {
    fontSize: "40px",
  },

  title: {
    margin: "10px 0 5px",
    fontSize: "38px",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "17px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  card: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "white",
    borderRadius: "16px",
    padding: "22px",
    cursor: "pointer",
    boxShadow:
      "0 8px 25px rgba(30,41,59,0.08)",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  filename: {
    fontSize: "17px",
    fontWeight: "700",
    wordBreak: "break-word",
  },

  status: {
    padding: "7px 11px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  completed: {
    background: "#dcfce7",
    color: "#166534",
  },

  failed: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  uploaded: {
    background: "#e0e7ff",
    color: "#3730a3",
  },

  details: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    marginTop: "14px",
    color: "#64748b",
    fontSize: "13px",
  },

  cardFooter: {
    marginTop: "15px",
    color: "#4f46e5",
    fontSize: "13px",
    fontWeight: "600",
  },

  navigation: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "35px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 18px",
    background:
      "linear-gradient(135deg, #3157d5, #4f46e5)",
    color: "white",
    cursor: "pointer",
    fontWeight: "700",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    padding: "11px 18px",
    background: "white",
    color: "#334155",
    cursor: "pointer",
    fontWeight: "600",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
    textAlign: "center",
  },

  empty: {
    background: "white",
    padding: "50px",
    borderRadius: "18px",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  center: {
    minHeight: "70vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default UploadHistory;