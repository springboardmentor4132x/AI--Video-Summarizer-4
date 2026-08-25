import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (email && password) {
      navigate("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "900px",
          maxWidth: "100%",
          display: "flex",
          background: "white",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >

        {/* LEFT SIDE */}
        <div
          style={{
            width: "45%",
            background: "#2563eb",
            color: "white",
            padding: "50px",
          }}
        >
          <h1>🎬 ClipMind</h1>

          <h2 style={{ marginTop: "50px" }}>
            Turn Videos Into Smart Summaries
          </h2>

          <p style={{ lineHeight: "1.7" }}>
            Upload your videos and let AI create concise
            and useful summaries in seconds.
          </p>

          <div
            style={{
              marginTop: "40px",
              lineHeight: "2",
            }}
          >
            <p>✓ AI-powered summarization</p>
            <p>✓ Save time</p>
            <p>✓ Easy to use</p>
            <p>✓ Quick results</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div
          style={{
            width: "55%",
            padding: "50px",
          }}
        >
          <h2>Welcome Back! 👋</h2>

          <p style={{ color: "#666" }}>
            Login to continue to ClipMind
          </p>

          <form onSubmit={handleLogin}>

            {/* EMAIL */}
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                marginBottom: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />

            {/* PASSWORD */}
            <label>Password</label>

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  paddingRight: "70px",
                  marginTop: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "15px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#2563eb",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* REMEMBER + FORGOT PASSWORD */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "15px",
                marginBottom: "25px",
                fontSize: "14px",
              }}
            >
              <label>
                <input
                  type="checkbox"
                  style={{
                    marginRight: "6px",
                  }}
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={() => alert("Forgot password feature coming soon!")}
                style={{
                  border: "none",
                  background: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "13px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </form>

          {/* DIVIDER */}
          <div
            style={{
              textAlign: "center",
              margin: "25px 0",
              color: "#999",
            }}
          >
            ───── OR ─────
          </div>

          {/* GOOGLE BUTTON */}
          <button
            type="button"
            onClick={() => alert("Google login coming soon!")}
            style={{
              width: "100%",
              padding: "12px",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            🔵 Continue with Google
          </button>

          {/* CREATE ACCOUNT */}
          <p
            style={{
              textAlign: "center",
              marginTop: "25px",
            }}
          >
            Don't have an account?{" "}

            <button
              type="button"
              onClick={() => navigate("/register")}
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Create Account
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;