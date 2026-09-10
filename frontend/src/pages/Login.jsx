import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (email.trim() === "" || password === "") {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed.");
        return;
      }

      if (data.message === "This email is not registered.") {
        setError("This email is not registered.");
        return;
      }

      if (data.message === "Incorrect password.") {
        setError("Incorrect password.");
        return;
      }

      if (data.message === "Login successful") {
        // Clear old login information
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("loggedInUserEmail");
        localStorage.removeItem("loggedInUserName");
        localStorage.removeItem("loggedInUserRole");
        localStorage.removeItem("loggedInUserId");

        // Store current logged-in user information
        localStorage.setItem("loggedInUser", data.email);
        localStorage.setItem("loggedInUserEmail", data.email);
        localStorage.setItem("loggedInUserName", data.name);
        localStorage.setItem("loggedInUserRole", data.role || "learner");
        localStorage.setItem("loggedInUserId", data.user_id);

        // Go to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      setError(
        "Unable to connect to the backend. Please make sure the server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>
          🎬
        </div>

        <h1 style={styles.title}>
          ClipMind AI
        </h1>

        <p style={styles.tagline}>
          AI-Powered Video Summarization
        </p>

        <h2 style={styles.loginTitle}>
          Login
        </h2>

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            style={styles.loginButton}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* Register */}
        <p style={styles.registerText}>
          Don't have an account?
        </p>

        <button
          type="button"
          onClick={() => navigate("/register")}
          style={styles.registerButton}
        >
          Create Account
        </button>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "420px",
    maxWidth: "95%",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
  },

  logo: {
    textAlign: "center",
    fontSize: "50px",
  },

  title: {
    textAlign: "center",
    margin: "5px 0",
    color: "#3157d5",
    fontSize: "32px",
  },

  tagline: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "30px",
  },

  loginTitle: {
    textAlign: "center",
    marginBottom: "25px",
  },

  field: {
    marginBottom: "20px",
  },

  label: {
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginTop: "7px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
  },

  error: {
    padding: "12px",
    marginBottom: "15px",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: "8px",
  },

  loginButton: {
    width: "100%",
    padding: "13px",
    background: "#3157d5",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },

  registerText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "25px",
    marginBottom: "10px",
  },

  registerButton: {
    width: "100%",
    padding: "12px",
    background: "#e0e7ff",
    color: "#3157d5",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Login;