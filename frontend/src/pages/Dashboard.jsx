import { useNavigate } from "react-router-dom";
import api from "../api";

// currentUser is the real backend profile (GET /api/users/me), stored by
// Login.jsx/Register.jsx right after authenticating — not a value the
// client invented. loggedInUserName/loggedInUserRole never came from an
// authenticated source in the old code.
// Learning features integrated into ClipMind 2.0. Pages that need a video
// show a picker first, so every card works from the dashboard.
const LEARNING_CARDS = [
  { path: "/memory-deck", icon: "🧠", title: "Memory Deck", text: "Review timestamped flashcards built from your videos.", action: "Open deck" },
  { path: "/video-dna", icon: "🧬", title: "Video DNA", text: "See a video's structure, topics and information density.", action: "Explore DNA" },
  { path: "/evidence", icon: "🔎", title: "Evidence Lens", text: "Ask a question and see the transcript evidence behind the answer.", action: "Find evidence" },
  { path: "/revision", icon: "⚡", title: "5-Minute Revision", text: "A quick revision sheet of definitions, formulas and key moments.", action: "Start revising" },
  { path: "/live-summaries", icon: "📡", title: "Real-Time Workspace", text: "Live transcript and rolling summary for a public live stream.", action: "Open workspace" },
];

function Dashboard() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const name = currentUser?.name || "User";
  const role = currentUser?.role || "";

  const handleLogout = () => {
    api.logout();
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

          <div
            style={styles.card}
            onClick={() => navigate("/story")}
          >
            <div style={styles.icon}>
              🎨
            </div>

            <h2 style={styles.cardHeading}>
              ClipMind Story
            </h2>

            <p style={styles.cardText}>
              Turn a processed video into a comic, storybook,
              study notes or storyboard.
            </p>

            <button style={styles.primaryButton}>
              Open Story
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/timemachine")}
          >
            <div style={styles.icon}>
              🕰️
            </div>

            <h2 style={styles.cardHeading}>
              Time Machine
            </h2>

            <p style={styles.cardText}>
              Search any concept across all your videos and see how your learning progressed.
            </p>

            <button style={styles.primaryButton}>
              Open Time Machine
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/daily")}
          >
            <div style={styles.icon}>
              📅
            </div>

            <h2 style={styles.cardHeading}>
              ClipMind Daily
            </h2>

            <p style={styles.cardText}>
              A study session sized to the time you have, from your own videos and bookmarks.
            </p>

            <button style={styles.primaryButton}>
              Plan my day
            </button>
          </div>

          <div
            style={styles.card}
            onClick={() => navigate("/compare")}
          >
            <div style={styles.icon}>
              🔀
            </div>

            <h2 style={styles.cardHeading}>
              Compare versions
            </h2>

            <p style={styles.cardText}>
              See what is new, removed or changed between two videos.
            </p>

            <button style={styles.primaryButton}>
              Compare videos
            </button>
          </div>

          {LEARNING_CARDS.map((card) => (
            <div key={card.path} style={styles.card} onClick={() => navigate(card.path)}>
              <div style={styles.icon}>{card.icon}</div>
              <h2 style={styles.cardHeading}>{card.title}</h2>
              <p style={styles.cardText}>{card.text}</p>
              <button style={styles.primaryButton}>{card.action}</button>
            </div>
          ))}

        </section>

      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-page)",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    backgroundColor: "var(--bg-card)",
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
    color: "var(--brand-text)",
    fontSize: "24px",
  },

  logoSubtitle: {
    margin: "4px 0 0",
    color: "var(--fg-soft)",
    fontSize: "13px",
  },

  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "var(--danger)",
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
    color: "var(--fg-strong)",
  },

  role: {
    margin: "10px 0",
    color: "var(--brand-text)",
    fontWeight: "bold",
  },

  description: {
    maxWidth: "650px",
    margin: "0 auto",
    color: "var(--fg-soft)",
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
    backgroundColor: "var(--bg-card)",
    borderRadius: "14px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
    cursor: "pointer",
    textAlign: "center",
    border: "1px solid var(--line)",
    transition: "transform 0.2s ease",
  },

  icon: {
    fontSize: "40px",
    marginBottom: "12px",
  },

  cardHeading: {
    margin: "0 0 10px",
    color: "var(--fg-strong)",
    fontSize: "21px",
  },

  cardText: {
    minHeight: "55px",
    margin: "0 0 20px",
    color: "var(--fg-soft)",
    lineHeight: "1.6",
  },

  primaryButton: {
    padding: "10px 18px",
    backgroundColor: "var(--brand-bg)",
    color: "#ffffff",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Dashboard;