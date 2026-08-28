import React from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const name =
    localStorage.getItem("loggedInUserName") || "User";

  const role =
    localStorage.getItem("loggedInUserRole") || "learner";

  const roleNames = {
    learner: "Learner",
    educator: "Educator",
    content_creator: "Content Creator",
    administrator: "Administrator",
  };

  const displayRole =
    roleNames[role] || role;

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loggedInUserName");
    localStorage.removeItem("loggedInUserRole");

    navigate("/login");
  };

  const cards = [
    {
      title: "🎥 Upload Video",
      description:
        "Upload a video for AI processing.",
      button: "Upload Video",
      path: "/upload",
      visible: true,
    },
    {
      title: "📋 Upload History",
      description:
        "View your previously uploaded videos.",
      button: "View History",
      path: "/history",
      visible: true,
    },
    {
      title: "⚙️ Processing Status",
      description:
        "Check the processing status of your videos.",
      button: "View Status",
      path: "/processing",
      visible: true,
    },
  ];

  return (
    <div style={styles.page}>

      {/* Header */}
      <header style={styles.header}>

        <div>
          <h2 style={styles.logo}>
            🎬 ClipMind AI
          </h2>

          <span style={styles.headerSubtitle}>
            VIDEO INTELLIGENCE ENGINE
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </button>

      </header>

      {/* Main */}
      <main style={styles.main}>

        <div style={styles.welcomeSection}>

          <div style={styles.welcomeIcon}>
            👋
          </div>

          <h1 style={styles.heading}>
            Welcome, {name}!
          </h1>

          <div style={styles.roleBadge}>
            Role: {displayRole}
          </div>

          <p style={styles.description}>
            Welcome to your AI Video
            Summarization Dashboard.
          </p>

        </div>

        {/* Feature cards */}
        <div style={styles.grid}>

          {cards
            .filter((card) => card.visible)
            .map((card) => (
              <div
                key={card.path}
                style={styles.card}
                onClick={() =>
                  navigate(card.path)
                }
              >
                <div style={styles.cardIcon}>
                  {card.title.split(" ")[0]}
                </div>

                <h2 style={styles.cardTitle}>
                  {card.title.substring(
                    card.title.indexOf(" ") + 1
                  )}
                </h2>

                <p style={styles.cardDescription}>
                  {card.description}
                </p>

                <button
                  style={styles.button}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(card.path);
                  }}
                >
                  {card.button}
                </button>
              </div>
            ))}

        </div>

        {/* Role information */}
        <div style={styles.roleInfo}>

          <h3>
            🔐 Your Access
          </h3>

          <p>
            You are signed in as a{" "}
            <strong>{displayRole}</strong>.
          </p>

          <p style={styles.smallText}>
            ClipMind AI uses role-based access
            control to protect application
            functionality.
          </p>

        </div>

      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        CLIPMIND AI • VIDEO INTELLIGENCE ENGINE
      </footer>

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
    margin: 0,
    fontSize: "24px",
  },

  headerSubtitle: {
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#64748b",
  },

  logoutButton: {
    padding: "10px 20px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  main: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "60px 25px",
  },

  welcomeSection: {
    textAlign: "center",
    marginBottom: "45px",
  },

  welcomeIcon: {
    fontSize: "45px",
  },

  heading: {
    fontSize: "38px",
    margin: "10px 0",
  },

  roleBadge: {
    display: "inline-block",
    padding: "8px 18px",
    borderRadius: "30px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontWeight: "bold",
    marginTop: "5px",
  },

  description: {
    color: "#64748b",
    fontSize: "17px",
    marginTop: "15px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "25px",
  },

  card: {
    background: "white",
    borderRadius: "18px",
    padding: "30px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(30,41,59,0.08)",
    cursor: "pointer",
    transition:
      "transform 0.2s ease",
  },

  cardIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  cardTitle: {
    margin: "10px 0",
    fontSize: "21px",
  },

  cardDescription: {
    color: "#64748b",
    lineHeight: "1.5",
    minHeight: "48px",
  },

  button: {
    marginTop: "15px",
    padding: "11px 20px",
    background:
      "linear-gradient(135deg, #3157d5, #4f46e5)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  roleInfo: {
    marginTop: "40px",
    padding: "25px",
    background: "white",
    borderRadius: "15px",
    textAlign: "center",
    boxShadow:
      "0 5px 20px rgba(30,41,59,0.06)",
  },

  smallText: {
    color: "#64748b",
    fontSize: "14px",
  },

  footer: {
    textAlign: "center",
    padding: "25px",
    color: "#94a3b8",
    fontSize: "11px",
    letterSpacing: "1px",
  },
};

export default Dashboard;