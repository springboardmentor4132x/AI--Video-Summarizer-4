import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

function VideoDNA() {
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [videoName, setVideoName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);

  // --------------------------------------------------
  // Get current video
  // --------------------------------------------------

  useEffect(() => {
    loadCurrentVideo();
  }, []);

  const loadCurrentVideo = () => {
    try {
      const loggedInUser = localStorage.getItem("loggedInUser");

      if (!loggedInUser) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const currentVideoKey = `currentVideo_${loggedInUser}`;

      const storedVideo =
        localStorage.getItem(currentVideoKey);

      if (!storedVideo) {
        setError("No current video found.");
        setLoading(false);
        return;
      }

      const video = JSON.parse(storedVideo);

      const id =
        video.video_id ||
        video.id ||
        video._id;

      if (!id) {
        setError("Video ID not found.");
        setLoading(false);
        return;
      }

      setVideoId(id);

      setVideoName(
        video.filename ||
        video.name ||
        "Current Video"
      );

      fetchVideoDNA(id);

    } catch (err) {
      console.error(err);
      setError("Unable to load video information.");
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Fetch Video DNA
  // --------------------------------------------------

  const fetchVideoDNA = async (id) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/video-dna/${id}`
      );

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Video DNA response:", data);

      setSections(
        Array.isArray(data.sections)
          ? data.sections
          : []
      );

    } catch (err) {
      console.error(
        "Video DNA fetch error:",
        err
      );

      setError(
        "Unable to load Video DNA data from the backend."
      );

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Convert timestamp to seconds
  // --------------------------------------------------

  const timestampToSeconds = (value) => {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === "number") {
      return value;
    }

    const text = String(value).trim();

    if (!text) {
      return 0;
    }

    // Plain number
    if (!Number.isNaN(Number(text))) {
      return Number(text);
    }

    const parts = text.split(":");

    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);

      return (
        minutes * 60 +
        seconds
      );
    }

    if (parts.length === 3) {
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      const seconds = Number(parts[2]);

      return (
        hours * 3600 +
        minutes * 60 +
        seconds
      );
    }

    return 0;
  };

  // --------------------------------------------------
  // Format seconds
  // --------------------------------------------------

  const formatTime = (seconds) => {
    const totalSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const secs =
      totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  // --------------------------------------------------
  // Topic distribution
  // --------------------------------------------------

  const topicDistribution = useMemo(() => {
    const topics = {};

    sections.forEach((section) => {
      const topic =
        section.topic ||
        section.segment ||
        section.title ||
        "Other";

      topics[topic] =
        (topics[topic] || 0) + 1;
    });

    return Object.entries(topics)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage:
          sections.length > 0
            ? Math.round(
                (count /
                  sections.length) *
                  100
              )
            : 0
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );
  }, [sections]);

  // --------------------------------------------------
  // Information density
  // --------------------------------------------------

  const getInformationDensity = (
    section
  ) => {
    const value = Number(
      section.information_density
    );

    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, value)
    );
  };

  // --------------------------------------------------
  // Important moment
  // --------------------------------------------------

  const isImportant = (section) => {
    const importance =
      String(
        section.importance || ""
      ).toLowerCase();

    return (
      importance === "high" ||
      importance === "critical" ||
      importance === "important"
    );
  };

  // --------------------------------------------------
  // Click timestamp
  // --------------------------------------------------

  const handleTimestampClick = (
    section
  ) => {
    const timestamp =
      section.start ||
      section.timestamp;

    const seconds =
      timestampToSeconds(timestamp);

    setSelectedSection(section);

    // Look for video element
    const videoElement =
      document.querySelector("video");

    if (videoElement) {
      videoElement.currentTime =
        seconds;

      videoElement
        .play()
        .catch(() => {});

      return;
    }

    // Store timestamp for Results page
    localStorage.setItem(
      "videoDNASelectedTimestamp",
      String(seconds)
    );

    localStorage.setItem(
      "videoDNASelectedSection",
      JSON.stringify(section)
    );

    navigate("/results");
  };

  // --------------------------------------------------
  // Refresh
  // --------------------------------------------------

  const handleRefresh = () => {
    if (videoId) {
      fetchVideoDNA(videoId);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loadingBox}>
            <div style={styles.icon}>
              🧬
            </div>

            <h2>
              Loading Video DNA...
            </h2>

            <p>
              Analyzing your video's
              visual structure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}

        <div style={styles.header}>

          <div>
            <h1 style={styles.title}>
              🧬 ClipMind Video DNA
            </h1>

            <p style={styles.subtitle}>
              A visual fingerprint showing
              how your video is structured.
            </p>

            {videoId && (
              <p style={styles.videoInfo}>
                Video ID: {videoId}
              </p>
            )}

            {videoName && (
              <p style={styles.videoName}>
                Video: {videoName}
              </p>
            )}
          </div>

          <button
            onClick={handleRefresh}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>

        </div>

        {/* Error */}

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}

        {!error &&
          sections.length === 0 && (
            <div style={styles.emptyBox}>

              <div style={styles.emptyIcon}>
                🧬
              </div>

              <h2>
                No Video DNA data available
              </h2>

              <p>
                Video DNA will appear here
                after the video has been
                processed and the backend
                provides its transcript,
                topics, information density,
                and important moments.
              </p>

            </div>
          )}

        {/* DATA */}

        {sections.length > 0 && (
          <>

            {/* Overview */}

            <div style={styles.statsGrid}>

              <div style={styles.statCard}>
                <span style={styles.statIcon}>
                  🎬
                </span>

                <div>
                  <div style={styles.statNumber}>
                    {sections.length}
                  </div>

                  <div style={styles.statLabel}>
                    Video Sections
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statIcon}>
                  🏷️
                </span>

                <div>
                  <div style={styles.statNumber}>
                    {topicDistribution.length}
                  </div>

                  <div style={styles.statLabel}>
                    Topics
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statIcon}>
                  ⭐
                </span>

                <div>
                  <div style={styles.statNumber}>
                    {
                      sections.filter(
                        isImportant
                      ).length
                    }
                  </div>

                  <div style={styles.statLabel}>
                    Important Moments
                  </div>
                </div>
              </div>

            </div>

            {/* Video Structure */}

            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                🎬 Video Structure
              </h2>

              <p style={styles.sectionDescription}>
                Visual representation of how
                the video is organized.
              </p>

              <div style={styles.structure}>

                {sections.map(
                  (section, index) => {

                    const density =
                      getInformationDensity(
                        section
                      );

                    const important =
                      isImportant(section);

                    return (
                      <div
                        key={
                          section.id ||
                          index
                        }
                        onClick={() =>
                          handleTimestampClick(
                            section
                          )
                        }
                        style={{
                          ...styles.structureCard,
                          borderTop:
                            important
                              ? "4px solid #f59e0b"
                              : "4px solid #6366f1"
                        }}
                      >

                        <div style={styles.number}>
                          {index + 1}
                        </div>

                        <div
                          style={
                            styles.structureContent
                          }
                        >

                          <h3>
                            {section.title ||
                              section.segment ||
                              section.topic ||
                              "Untitled Section"}
                          </h3>

                          {section.topic && (
                            <span
                              style={
                                styles.topicBadge
                              }
                            >
                              {section.topic}
                            </span>
                          )}

                          <p>
                            {section.highlight ||
                              section.segment ||
                              "No description available."}
                          </p>

                          <div
                            style={
                              styles.cardFooter
                            }
                          >
                            <span>
                              ⏱️{" "}
                              {section.timestamp ||
                                section.start ||
                                "--:--"}
                            </span>

                            <span>
                              📊 {density}%
                            </span>
                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* Topic Distribution */}

            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                🏷️ Topic Distribution
              </h2>

              <p style={styles.sectionDescription}>
                Distribution of topics across
                the video.
              </p>

              <div style={styles.topicList}>

                {topicDistribution.map(
                  (item) => (
                    <div
                      key={item.topic}
                      style={styles.topicRow}
                    >

                      <div style={styles.topicHeader}>

                        <span>
                          {item.topic}
                        </span>

                        <span>
                          {item.percentage}%
                        </span>

                      </div>

                      <div
                        style={
                          styles.progressBackground
                        }
                      >
                        <div
                          style={{
                            ...styles.progressBar,
                            width: `${item.percentage}%`
                          }}
                        />
                      </div>

                    </div>
                  )
                )}

              </div>

            </section>

            {/* Information Density */}

            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                📊 Information Density
              </h2>

              <p style={styles.sectionDescription}>
                Shows how much information is
                present in each section.
              </p>

              <div style={styles.densityList}>

                {sections.map(
                  (section, index) => {

                    const density =
                      getInformationDensity(
                        section
                      );

                    return (
                      <div
                        key={
                          section.id ||
                          index
                        }
                        style={styles.densityRow}
                      >

                        <div
                          style={
                            styles.densityHeader
                          }
                        >
                          <span>
                            {section.title ||
                              section.segment ||
                              `Section ${
                                index + 1
                              }`}
                          </span>

                          <strong>
                            {density}%
                          </strong>
                        </div>

                        <div
                          style={
                            styles.progressBackground
                          }
                        >
                          <div
                            style={{
                              ...styles.densityBar,
                              width: `${density}%`
                            }}
                          />
                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

            {/* Important Moments */}

            <section style={styles.section}>

              <h2 style={styles.sectionTitle}>
                ⭐ Important-Moment Density
              </h2>

              <p style={styles.sectionDescription}>
                Important sections are highlighted
                for quick navigation.
              </p>

              <div style={styles.timeline}>

                {sections.map(
                  (section, index) => {

                    const important =
                      isImportant(section);

                    return (
                      <button
                        key={
                          section.id ||
                          index
                        }
                        onClick={() =>
                          handleTimestampClick(
                            section
                          )
                        }
                        style={{
                          ...styles.timelineItem,
                          background:
                            important
                              ? "#fff7ed"
                              : "#f8fafc",
                          border:
                            important
                              ? "2px solid #f59e0b"
                              : "1px solid #e2e8f0"
                        }}
                      >

                        <span
                          style={
                            styles.timelineNumber
                          }
                        >
                          {index + 1}
                        </span>

                        <span
                          style={
                            styles.timelineText
                          }
                        >
                          <strong>
                            {section.title ||
                              section.segment ||
                              section.topic ||
                              "Section"}
                          </strong>

                          <small>
                            ⏱️{" "}
                            {section.timestamp ||
                              section.start ||
                              "--:--"}
                          </small>
                        </span>

                        <span>
                          {important
                            ? "⭐"
                            : "▶️"}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </section>

            {/* Selected Section */}

            {selectedSection && (
              <div style={styles.selectedBox}>

                <h3>
                  Selected Section
                </h3>

                <p>
                  <strong>
                    {selectedSection.title ||
                      selectedSection.segment ||
                      selectedSection.topic}
                  </strong>
                </p>

                <p>
                  Timestamp:{" "}
                  {selectedSection.timestamp ||
                    selectedSection.start}
                </p>

                {selectedSection.highlight && (
                  <p>
                    {selectedSection.highlight}
                  </p>
                )}

              </div>
            )}

          </>
        )}

        {/* Navigation */}

        <div style={styles.navigation}>

          <button
            onClick={() =>
              navigate("/key-moments")
            }
            style={styles.navButton}
          >
            ⭐ Key Moments
          </button>

          <button
            onClick={() =>
              navigate("/results")
            }
            style={styles.navButton}
          >
            📄 Results
          </button>

          <button
            onClick={() =>
              navigate("/dashboard")
            }
            style={styles.navButton}
          >
            🏠 Dashboard
          </button>

        </div>

      </div>
    </div>
  );
}


// ==================================================
// Styles
// ==================================================

const styles = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc, #eef2ff)",
    padding: "30px",
    boxSizing: "border-box"
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px"
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700"
  },

  subtitle: {
    marginTop: "8px",
    color: "#64748b"
  },

  videoInfo: {
    fontSize: "13px",
    color: "#64748b"
  },

  videoName: {
    fontSize: "14px",
    fontWeight: "600"
  },

  refreshButton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    cursor: "pointer",
    background: "#4f46e5",
    color: "white",
    fontWeight: "600"
  },

  loadingBox: {
    textAlign: "center",
    padding: "100px 20px"
  },

  icon: {
    fontSize: "60px"
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px"
  },

  emptyBox: {
    background: "white",
    borderRadius: "16px",
    padding: "60px 30px",
    textAlign: "center",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)"
  },

  emptyIcon: {
    fontSize: "70px",
    marginBottom: "15px"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "20px",
    marginBottom: "30px"
  },

  statCard: {
    background: "white",
    borderRadius: "14px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)"
  },

  statIcon: {
    fontSize: "30px"
  },

  statNumber: {
    fontSize: "25px",
    fontWeight: "700"
  },

  statLabel: {
    color: "#64748b",
    fontSize: "14px"
  },

  section: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)"
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px"
  },

  sectionDescription: {
    color: "#64748b",
    marginBottom: "25px"
  },

  structure: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "18px"
  },

  structureCard: {
    display: "flex",
    gap: "15px",
    padding: "18px",
    borderRadius: "12px",
    background: "#f8fafc",
    cursor: "pointer",
    transition: "0.2s"
  },

  number: {
    minWidth: "35px",
    height: "35px",
    borderRadius: "50%",
    background: "#4f46e5",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700"
  },

  structureContent: {
    flex: 1
  },

  topicBadge: {
    display: "inline-block",
    background: "#eef2ff",
    color: "#4338ca",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    marginBottom: "8px"
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#64748b"
  },

  topicList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },

  topicHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "7px",
    fontWeight: "600"
  },

  progressBackground: {
    height: "10px",
    background: "#e2e8f0",
    borderRadius: "10px",
    overflow: "hidden"
  },

  progressBar: {
    height: "100%",
    background: "#6366f1",
    borderRadius: "10px"
  },

  densityList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },

  densityHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "7px"
  },

  densityBar: {
    height: "100%",
    background: "#0ea5e9",
    borderRadius: "10px"
  },

  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  timelineItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "14px",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "left"
  },

  timelineNumber: {
    minWidth: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700"
  },

  timelineText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },

  selectedBox: {
    background: "#eef2ff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "25px"
  },

  navigation: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    marginTop: "30px"
  },

  navButton: {
    border: "none",
    background: "#1e293b",
    color: "white",
    padding: "12px 18px",
    borderRadius: "9px",
    cursor: "pointer"
  }

};

export default VideoDNA;