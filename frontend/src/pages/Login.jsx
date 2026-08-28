import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoggingIn(true);

    try {
      // 1. Send login request to FastAPI
      const formData = new URLSearchParams();

      formData.append("username", email.trim());
      formData.append("password", password);

      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Incorrect email or password."
        );
      }

      // 2. Make sure backend returned a token
      if (!data.access_token) {
        throw new Error(
          "Login succeeded, but no access token was returned."
        );
      }

      // 3. Save JWT
      localStorage.setItem(
        "accessToken",
        data.access_token
      );

      // 4. Get current user's details
      const userResponse = await fetch(
        "http://127.0.0.1:8000/api/users/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        }
      );

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(
          userData.detail || "Could not load user details."
        );
      }

      // 5. Save user information
      localStorage.setItem(
        "loggedInUser",
        userData.email || ""
      );

      localStorage.setItem(
        "loggedInUserName",
        userData.name || ""
      );

      localStorage.setItem(
        "loggedInUserRole",
        userData.role || ""
      );

      // 6. Login successful
      navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);

      // Remove invalid token
      localStorage.removeItem("accessToken");

      setError(
        err.message || "Unable to login. Please try again."
      );
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>
          🎬
        </div>

        {/* Application title */}
        <h1 style={styles.title}>
          ClipMind AI
        </h1>

        <p style={styles.tagline}>
          AI-Powered Video Summarization
        </p>

        {/* Login heading */}
        <h2 style={styles.loginTitle}>
          Login
        </h2>

        {/* Login form */}
        <form onSubmit={handleLogin}>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loggingIn}
            />
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label}>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={loggingIn}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loggingIn}
            style={{
              ...styles.button,
              opacity: loggingIn ? 0.7 : 1,
              cursor: loggingIn
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loggingIn
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        {/* Register link */}
        <p style={styles.registerText}>
          Don't have an account?{" "}

          <span
            style={styles.registerLink}
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}

/* ==============================
   STYLES
============================== */

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "400px",
    padding: "40px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
  },

  logo: {
    fontSize: "50px",
    marginBottom: "10px",
  },

  title: {
    marginBottom: "5px",
  },

  tagline: {
    color: "#666",
    marginBottom: "30px",
  },

  loginTitle: {
    marginBottom: "25px",
  },

  field: {
    textAlign: "left",
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },

  error: {
    color: "#dc2626",
    marginBottom: "15px",
    fontSize: "14px",
    textAlign: "left",
  },

  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#3157d5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
  },

  registerText: {
    marginTop: "20px",
    color: "#666",
  },

  registerLink: {
    color: "#3157d5",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Login;