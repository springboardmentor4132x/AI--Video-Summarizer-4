import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { hasApi, postJson } from "../api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (email.trim() === "" || password.trim() === "") {
      setError("Please enter email and password.");
      return;
    }

    if (hasApi) {
      try {
        const data = await postJson("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
        });
        const user = data.user || data;
        const token = data.token || data.accessToken;

        if (!token) throw new Error("Login succeeded but no access token was returned.");
        localStorage.setItem("authToken", token);
        localStorage.setItem("loggedInUser", user.email || email.trim().toLowerCase());
        localStorage.setItem("loggedInUserName", user.fullName || user.name || "User");
        localStorage.setItem("loggedInUserRole", user.role || "User");
        navigate("/dashboard");
      } catch (requestError) {
        setError(requestError.message);
      }
      return;
    }

    const storedUsers = localStorage.getItem("registeredUsers");

    const users = storedUsers
      ? JSON.parse(storedUsers)
      : [];

    const user = users.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      setError("This email is not registered.");
      return;
    }

    if (user.password !== password) {
      setError("Incorrect password.");
      return;
    }

    localStorage.setItem(
      "loggedInUser",
      user.email
    );
    localStorage.setItem("loggedInUserName", user.fullName);
    localStorage.setItem("loggedInUserRole", user.role);

    navigate("/dashboard");
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

          {error && (
            <div style={styles.error}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            style={styles.loginButton}
          >
            Login
          </button>

        </form>

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
    fontFamily: "Arial, sans-serif"
  },

  card: {
    width: "420px",
    maxWidth: "95%",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.10)"
  },

  logo: {
    textAlign: "center",
    fontSize: "50px"
  },

  title: {
    textAlign: "center",
    margin: "18px 0 5px",
    color: "#3157d5",
    fontSize: "32px"
  },

  tagline: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: "30px"
  },

  loginTitle: {
    textAlign: "center",
    marginBottom: "25px"
  },

  field: {
    marginBottom: "20px"
  },

  label: {
    fontWeight: "bold"
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginTop: "7px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px"
  },

  error: {
    padding: "12px",
    marginBottom: "15px",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: "8px"
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
    fontSize: "16px"
  },

  registerText: {
    textAlign: "center",
    color: "#64748b",
    marginTop: "25px",
    marginBottom: "10px"
  },

  registerButton: {
    width: "100%",
    padding: "12px",
    background: "#e0e7ff",
    color: "#3157d5",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  }
};

export default Login;
