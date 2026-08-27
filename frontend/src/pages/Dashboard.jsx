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
    <div style={pageStyle}>

      {/* Header */}
      <header style={headerStyle}>
        <h2>AI Video Summarizer</h2>

        <button
          onClick={handleLogout}
          style={logoutButton}
        >
          Logout
        </button>
      </header>

      {/* Main */}
      <main style={mainStyle}>

        <h1>Welcome, {name}!</h1>

        <p style={roleStyle}>
          Role: {role}
        </p>

        <p>
          Welcome to your AI Video Summarization Dashboard.
        </p>

        {/* Navigation Cards */}
        <div style={gridStyle}>

          <div
            style={cardStyle}
            onClick={() => navigate("/upload")}
          >
            <h2>🎥 Upload Video</h2>
            <p>
              Upload a video for AI processing.
            </p>

            <button style={buttonStyle}>
              Upload Video
            </button>
          </div>

          <div
            style={cardStyle}
            onClick={() => navigate("/history")}
          >
            <h2>📁 Upload History</h2>
            <p>
              View your previously uploaded videos.
            </p>

            <button style={buttonStyle}>
              View History
            </button>
          </div>

          <div
            style={cardStyle}
            onClick={() => navigate("/processing")}
          >
            <h2>⚙️ Processing Status</h2>
            <p>
              Check the processing status of your video.
            </p>

            <button style={buttonStyle}>
              View Status
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}

/* ---------- STYLES ---------- */

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  fontFamily: "Arial, sans-serif",
};

const headerStyle = {
  backgroundColor: "white",
  padding: "20px 40px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const logoutButton = {
  padding: "10px 20px",
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const mainStyle = {
  padding: "50px",
  textAlign: "center",
};

const roleStyle = {
  color: "#3157d5",
  fontWeight: "bold",
};

const gridStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "25px",
  marginTop: "40px",
  flexWrap: "wrap",
};

const cardStyle = {
  width: "250px",
  padding: "30px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  cursor: "pointer",
};

const buttonStyle = {
  padding: "10px 20px",
  backgroundColor: "#3157d5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Dashboard;