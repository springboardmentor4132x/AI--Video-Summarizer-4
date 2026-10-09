import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import VideoPlayer from "../components/VideoPlayer";

// Video DNA -- Harika's page, integrated into the canonical app:
//  * the video comes from the route (/video-dna/:videoId), not localStorage
//  * data is fetched through the shared authenticated api client
//  * clicking a section seeks the embedded player (no off-page hacks)
//  * colors are theme tokens, so light and dark mode both work
function VideoDNA() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const playerRef = useRef(null);

  const [sections, setSections] = useState([]);
  const [topicShares, setTopicShares] = useState([]);
  const [videoName, setVideoName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);

  const fetchVideoDNA = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getVideoDna(id);
      setVideoName(data.filename || "");
      setSections(Array.isArray(data.sections) ? data.sections : []);
      setTopicShares(Array.isArray(data.topic_distribution) ? data.topic_distribution : []);
    } catch (err) {
      setSections([]);
      setTopicShares([]);
      setError(err.message || "Unable to load Video DNA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    if (!videoId) {
      setLoading(false);
      setError("Choose a video to see its Video DNA.");
      return;
    }
    fetchVideoDNA(videoId);
  }, [videoId, navigate, fetchVideoDNA]);

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
    // Real keyword-mention share across the whole transcript (from the backend).
    if (topicShares.length > 0) {
      return topicShares.map((item) => ({
        topic: item.topic,
        count: item.mentions,
        percentage: Math.round((item.share || 0) * 100),
      }));
    }
    // Fallback: share of sections per topic label.
    const topics = {};
    sections.forEach((section) => {
      const topic = section.topic || section.segment || section.title || "Other";
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: sections.length > 0 ? Math.round((count / sections.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sections, topicShares]);

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

  const handleTimestampClick = (section) => {
    const seconds = timestampToSeconds(section.start ?? section.timestamp);
    setSelectedSection(section);
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
      document.querySelector("video")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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

            {/* Player: every timestamp on this page seeks this video */}
            <div style={styles.section}>
              <VideoPlayer ref={playerRef} videoId={videoId} />
            </div>

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
                              ? "var(--warn-bg)"
                              : "var(--bg-soft)",
                          border:
                            important
                              ? "2px solid var(--warn-fg)"
                              : "1px solid var(--line)"
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
              navigate(`/video/${videoId}`)
            }
            style={styles.navButton}
          >
            🎬 Watch & Key Moments
          </button>

          <button
            onClick={() =>
              navigate(`/evidence/${videoId}`)
            }
            style={styles.navButton}
          >
            🔎 Evidence Lens
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
    
    background:
      "transparent",
    padding: "0",
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
    color: "var(--fg-soft)"
  },

  videoInfo: {
    fontSize: "13px",
    color: "var(--fg-soft)"
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
    background: "var(--accent)",
    color: "var(--on-accent)",
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
    background: "var(--err-bg)",
    color: "var(--err-fg)",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px"
  },

  emptyBox: {
    background: "var(--bg-card)",
    borderRadius: "16px",
    padding: "60px 30px",
    textAlign: "center",
    boxShadow:
      "var(--shadow)"
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
    background: "var(--bg-card)",
    borderRadius: "14px",
    padding: "22px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "var(--shadow)"
  },

  statIcon: {
    fontSize: "30px"
  },

  statNumber: {
    fontSize: "25px",
    fontWeight: "700"
  },

  statLabel: {
    color: "var(--fg-soft)",
    fontSize: "14px"
  },

  section: {
    background: "var(--bg-card)",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow:
      "var(--shadow)"
  },

  sectionTitle: {
    margin: 0,
    fontSize: "22px"
  },

  sectionDescription: {
    color: "var(--fg-soft)",
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
    background: "var(--bg-soft)",
    cursor: "pointer",
    transition: "0.2s"
  },

  number: {
    minWidth: "35px",
    height: "35px",
    borderRadius: "50%",
    background: "var(--accent)",
    color: "var(--on-accent)",
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
    background: "var(--accent-bg)",
    color: "var(--accent)",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    marginBottom: "8px"
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "var(--fg-soft)"
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
    background: "var(--line)",
    borderRadius: "10px",
    overflow: "hidden"
  },

  progressBar: {
    height: "100%",
    background: "var(--accent)",
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
    background: "var(--accent-bg)",
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
    background: "var(--accent-bg)",
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
    background: "var(--fg-btn)",
    color: "var(--bg)",
    padding: "12px 18px",
    borderRadius: "9px",
    cursor: "pointer"
  }

};

export default VideoDNA;