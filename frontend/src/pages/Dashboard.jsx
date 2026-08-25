import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "white",
          padding: "18px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0 }}>
          🎬 ClipMind
        </h2>

        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#ef4444",
            color: "white",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "auto",
          padding: "40px 25px",
        }}
      >

        {/* WELCOME */}
        <div>
          <h1>Welcome to ClipMind 👋</h1>

          <p style={{ color: "#666", fontSize: "17px" }}>
            Your AI-powered video summarization workspace.
          </p>
        </div>

        {/* STAT CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginTop: "35px",
          }}
        >

          {/* TOTAL VIDEOS */}
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "15px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "30px" }}>🎥</div>

            <h3>Total Videos</h3>

            <h2>12</h2>

            <p style={{ color: "#777" }}>
              Videos uploaded
            </p>
          </div>

          {/* COMPLETED */}
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "15px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "30px" }}>✅</div>

            <h3>Completed</h3>

            <h2>9</h2>

            <p style={{ color: "#777" }}>
              Summaries generated
            </p>
          </div>

          {/* PROCESSING */}
          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "15px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "30px" }}>⏳</div>

            <h3>Processing</h3>

            <h2>3</h2>

            <p style={{ color: "#777" }}>
              Videos being processed
            </p>
          </div>

        </div>

        {/* QUICK ACTIONS */}
        <h2 style={{ marginTop: "45px" }}>
          Quick Actions
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginTop: "20px",
          }}
        >

          {/* UPLOAD */}
          <div
            onClick={() => navigate("/upload")}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "30px",
              borderRadius: "15px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px" }}>
              📤
            </div>

            <h3>Upload Video</h3>

            <p>
              Upload a new video for AI summarization.
            </p>
          </div>

          {/* HISTORY */}
          <div
            onClick={() => navigate("/history")}
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "15px",
              cursor: "pointer",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "40px" }}>
              📚
            </div>

            <h3>Upload History</h3>

            <p style={{ color: "#666" }}>
              View your previous uploaded videos.
            </p>
          </div>

          {/* PROCESSING */}
          <div
            onClick={() => navigate("/processing")}
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "15px",
              cursor: "pointer",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "40px" }}>
              ⚙️
            </div>

            <h3>Processing Status</h3>

            <p style={{ color: "#666" }}>
              Check the status of your videos.
            </p>
          </div>

        </div>

        {/* RECENT VIDEOS */}
        <h2 style={{ marginTop: "45px" }}>
          Recent Videos
        </h2>

        <div
          style={{
            background: "white",
            borderRadius: "15px",
            padding: "20px",
            marginTop: "20px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.08)",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "15px",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>🎥 Lecture.mp4</span>

            <span style={{ color: "green" }}>
              ✓ Completed
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "15px",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>🎥 Project Meeting.mp4</span>

            <span style={{ color: "#f59e0b" }}>
              ⏳ Processing
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "15px",
            }}
          >
            <span>🎥 Tutorial.mp4</span>

            <span style={{ color: "green" }}>
              ✓ Completed
            </span>
          </div>

        </div>

      </main>
    </div>
  );
}

export default Dashboard;