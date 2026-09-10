import { useRef, useState } from "react";

function KeyMoments() {
  const videoRef = useRef(null);

  const [selectedMoment, setSelectedMoment] = useState(null);

  const keyMoments = [
    {
      id: 1,
      topic: "Introduction",
      startTime: 0,
      endTime: 45,
      transcript: "Introduction to the project and its main purpose.",
      importanceScore: 0.95,
    },
    {
      id: 2,
      topic: "Problem Statement",
      startTime: 80,
      endTime: 130,
      transcript: "Explanation of the problem addressed by the project.",
      importanceScore: 0.90,
    },
    {
      id: 3,
      topic: "Proposed Solution",
      startTime: 180,
      endTime: 240,
      transcript: "Explanation of the proposed AI-based solution.",
      importanceScore: 0.98,
    },
  ];

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const handleSeek = (startTime, moment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }

    setSelectedMoment(moment);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Key Moments</h1>

      <p style={styles.description}>
        Watch the important moments detected from your video.
      </p>

      <div style={styles.videoSection}>
        <h2 style={styles.sectionHeading}>Video Player</h2>

        <video
          ref={videoRef}
          controls
          width="100%"
          style={styles.video}
        >
          <source src="/sample-video.mp4" type="video/mp4" />
          Your browser does not support the video player.
        </video>
      </div>

      <div style={styles.topicSection}>
        <h2 style={styles.sectionHeading}>Detected Topics</h2>

        <div style={styles.topicContainer}>
          {keyMoments.map((moment) => (
            <span key={moment.id} style={styles.topic}>
              {moment.topic}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.momentsSection}>
        <h2 style={styles.sectionHeading}>Important Moments</h2>

        {keyMoments.map((moment) => (
          <div
            key={moment.id}
            style={{
              ...styles.momentCard,
              border:
                selectedMoment?.id === moment.id
                  ? "2px solid #2563eb"
                  : "1px solid #ddd",
            }}
          >
            <div style={styles.cardHeader}>
              <h3 style={styles.topicTitle}>{moment.topic}</h3>

              <span style={styles.score}>
                Score: {moment.importanceScore}
              </span>
            </div>

            <p style={styles.time}>
              {formatTime(moment.startTime)} - {formatTime(moment.endTime)}
            </p>

            <p style={styles.transcript}>{moment.transcript}</p>

            <button
              style={styles.watchButton}
              onClick={() => handleSeek(moment.startTime, moment)}
            >
              Watch Moment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },

  heading: {
    fontSize: "32px",
    marginBottom: "8px",
  },

  description: {
    color: "#666",
    marginBottom: "24px",
  },

  videoSection: {
    marginBottom: "30px",
  },

  sectionHeading: {
    fontSize: "22px",
    marginBottom: "16px",
  },

  video: {
    width: "100%",
    borderRadius: "10px",
    backgroundColor: "#000",
  },

  topicSection: {
    marginBottom: "30px",
  },

  topicContainer: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  topic: {
    backgroundColor: "#e0ecff",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "20px",
  },

  momentsSection: {
    marginBottom: "30px",
  },

  momentCard: {
    padding: "18px",
    marginBottom: "16px",
    borderRadius: "10px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  topicTitle: {
    margin: 0,
    fontSize: "20px",
  },

  score: {
    color: "#15803d",
    fontWeight: "bold",
  },

  time: {
    color: "#2563eb",
    fontWeight: "bold",
  },

  transcript: {
    color: "#555",
    lineHeight: "1.5",
  },

  watchButton: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default KeyMoments;