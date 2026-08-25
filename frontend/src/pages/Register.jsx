import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    alert("Account created successfully!");

    navigate("/login");
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
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>🎬 ClipMind</h1>

        <h2>Create Account</h2>

        <p style={{ color: "#666" }}>
          Create your account to start summarizing videos.
        </p>

        <form onSubmit={handleRegister}>

          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />

          <label>Email</label>

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
              marginBottom: "18px",
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "18px",
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />

          <label>Confirm Password</label>

          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "25px",
              boxSizing: "border-box",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          />

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
            Create Account
          </button>

        </form>

        <p style={{ textAlign: "center", marginTop: "25px" }}>
          Already have an account?{" "}

          <button
            onClick={() => navigate("/login")}
            style={{
              border: "none",
              background: "none",
              color: "#2563eb",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </p>

      </div>
    </div>
  );
}

export default Register;