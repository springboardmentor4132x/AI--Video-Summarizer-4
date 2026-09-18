import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const name =
    localStorage.getItem("loggedInUserName") || "User";

  const role =
    localStorage.getItem("loggedInUserRole") || "User";

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInUserName");
    localStorage.removeItem("loggedInUserRole");

    navigate("/login");
  };

  return (
    <div style={styles.page}>

      <header style={styles.header}>
        <div>
          <h2 style={styles.logo}>
            ClipMind AI
          </h2>

          <p style={styles.logoSubtitle}>
            AI Video Summarization Platform
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </button>
      </header>

      <main style={styles.main}>

        <section style={styles.welcomeSection}>
          <h1 style={styles.heading}>
            Welcome, {name}!
          </h1>

          <p style={styles.role}>
            Role: {role}
          </p>

          <p style={styles.description}>
            Manage your videos, view processing status, and
            explore AI-generated results from one place.
          </p>
        </section>

        <section style={styles.grid}>

          <div
            style={styles.card}
            onClick={() => navigate("/upload")}
          >
            <div style={styles.icon}>
              🎥
            </div>

            <h2 style={styles.cardHeading}>
              Upload Video
            </h2>

            <p style={styles.cardText}>
              Upload a video and send it to the backend for
              processing.
            </p>

            <button style={styles.primaryButton}>
              Upload Video
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/history")}
          >
            <div style={styles.icon}>
              📁
            </div>

            <h2 style={styles.cardHeading}>
              Upload History
            </h2>

            <p style={styles.cardText}>
              View the videos you have previously uploaded.
            </p>

            <button style={styles.primaryButton}>
              View History
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/processing")}
          >
            <div style={styles.icon}>
              ⚙️
            </div>

            <h2 style={styles.cardHeading}>
              Processing Status
            </h2>

            <p style={styles.cardText}>
              Check the current processing status of your
              uploaded video.
            </p>

            <button style={styles.primaryButton}>
              View Status
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/results")}
          >
            <div style={styles.icon}>
              📊
            </div>

            <h2 style={styles.cardHeading}>
              Video Results
            </h2>

            <p style={styles.cardText}>
              View the summary, transcript, and other
              results for your video.
            </p>

            <button style={styles.primaryButton}>
              View Results
            </button>
          </div>

        </section>

      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    backgroundColor: "#ffffff",
    padding: "18px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  logo: {
    margin: 0,
    color: "#3157d5",
    fontSize: "24px",
  },

  logoSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },

  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  main: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "50px 25px",
  },

  welcomeSection: {
    textAlign: "center",
    marginBottom: "40px",
  },

  heading: {
    margin: 0,
    fontSize: "34px",
    color: "#1e293b",
  },

  role: {
    margin: "10px 0",
    color: "#3157d5",
    fontWeight: "bold",
  },

  description: {
    maxWidth: "650px",
    margin: "0 auto",
    color: "#64748b",
    lineHeight: "1.7",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "22px",
  },

  card: {
    padding: "28px",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    cursor: "pointer",
    textAlign: "center",
    border: "1px solid #e2e8f0",
    transition: "transform 0.2s ease",
  },

  icon: {
    fontSize: "40px",
    marginBottom: "12px",
  },

  cardHeading: {
    margin: "0 0 10px",
    color: "#1e293b",
    fontSize: "21px",
  },

  cardText: {
    minHeight: "55px",
    margin: "0 0 20px",
    color: "#64748b",
    lineHeight: "1.6",
  },

  primaryButton: {
    padding: "10px 18px",
    backgroundColor: "#3157d5",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Dashboard;