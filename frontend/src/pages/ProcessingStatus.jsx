import { useNavigate } from "react-router-dom";

function ProcessingStatus() {
  const navigate = useNavigate();

  const progress = 75;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
        padding: "30px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <h1>🎬 ClipMind</h1>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Dashboard
        </button>
      </div>

      {/* PROCESSING CARD */}
      <div
        style={{
          maxWidth: "650px",
          margin: "auto",
          background: "white",
          padding: "50px",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{ fontSize: "60px" }}>
          ⚙️
        </div>

        <h2>Processing Your Video</h2>

        <p style={{ color: "#666" }}>
          ClipMind AI is analyzing your video and preparing
          your summary.
        </p>

        {/* VIDEO NAME */}
        <div
          style={{
            marginTop: "30px",
            padding: "15px",
            background: "#f4f7fb",
            borderRadius: "10px",
          }}
        >
          🎥 <strong>Lecture.mp4</strong>
        </div>

        {/* PROGRESS */}
        <div style={{ marginTop: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span>Processing</span>
            <strong>{progress}%</strong>
          </div>

          <div
            style={{
              width: "100%",
              height: "15px",
              background: "#e5e7eb",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#2563eb",
                borderRadius: "10px",
              }}
            />
          </div>
        </div>

        {/* STATUS */}
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#eff6ff",
            color: "#2563eb",
            borderRadius: "10px",
          }}
        >
          ⏳ Your video is being processed...
        </div>

        <p
          style={{
            color: "#777",
            fontSize: "14px",
            marginTop: "20px",
          }}
        >
          Please wait while ClipMind generates your summary.
        </p>

        {/* BUTTONS */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            marginTop: "20px",
            padding: "12px 25px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>

        <button
          onClick={() => navigate("/history")}
          style={{
            marginTop: "15px",
            marginLeft: "10px",
            padding: "12px 25px",
            border: "1px solid #2563eb",
            borderRadius: "8px",
            background: "white",
            color: "#2563eb",
            cursor: "pointer",
          }}
        >
          Upload History
        </button>
      </div>
    </div>
  );
}

export default ProcessingStatus;