import { useNavigate } from "react-router-dom";

function UploadHistory() {
  const navigate = useNavigate();

  const videos = [
    {
      name: "Lecture.mp4",
      date: "25 Aug 2026",
      status: "Completed",
    },
    {
      name: "Project Meeting.mp4",
      date: "24 Aug 2026",
      status: "Processing",
    },
    {
      name: "Tutorial.mp4",
      date: "23 Aug 2026",
      status: "Completed",
    },
  ];

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

      {/* PAGE TITLE */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2>Upload History</h2>

        <p style={{ color: "#666" }}>
          View your previously uploaded videos and their status.
        </p>
      </div>

      {/* HISTORY TABLE */}
      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
          background: "white",
          borderRadius: "15px",
          padding: "25px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "15px",
                  borderBottom: "2px solid #eee",
                }}
              >
                Video Name
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "15px",
                  borderBottom: "2px solid #eee",
                }}
              >
                Upload Date
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "15px",
                  borderBottom: "2px solid #eee",
                }}
              >
                Status
              </th>

              <th
                style={{
                  textAlign: "left",
                  padding: "15px",
                  borderBottom: "2px solid #eee",
                }}
              >
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {videos.map((video, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  🎥 {video.name}
                </td>

                <td
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {video.date}
                </td>

                <td
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {video.status === "Completed" ? (
                    <span style={{ color: "green" }}>
                      ✓ Completed
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b" }}>
                      ⏳ Processing
                    </span>
                  )}
                </td>

                <td
                  style={{
                    padding: "15px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <button
                    onClick={() => navigate("/processing")}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "6px",
                      background: "#2563eb",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BACK BUTTON */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "12px 25px",
            border: "1px solid #2563eb",
            borderRadius: "8px",
            background: "white",
            color: "#2563eb",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default UploadHistory;