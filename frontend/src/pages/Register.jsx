import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("learner");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    // Check all fields
    if (!name || !email || !password || !confirmPassword || !role) {
      setError("Please fill in all fields.");
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/users/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            role: role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Registration failed.");
        return;
      }

      if (data.message === "Email already registered") {
        setError("This email is already registered.");
        return;
      }

      if (data.message === "Invalid role") {
        setError("Please select a valid role.");
        return;
      }

      setMessage("Registration successful!");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("learner");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <h1 style={styles.title}>Create Account</h1>

        <p style={styles.subtitle}>
          Register for ClipMind AI
        </p>

        <form onSubmit={handleRegister}>

          {/* Name */}
          <label style={styles.label}>Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />

          {/* Email */}
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          {/* Password */}
          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {/* Confirm Password */}
          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />

          {/* Role */}
          <label style={styles.label}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.input}
          >
            <option value="learner">Learner</option>
            <option value="content_creator">Content Creator</option>
            <option value="educator">Educator</option>
          </select>

          {/* Error */}
          {error && (
            <p style={styles.error}>
              {error}
            </p>
          )}

          {/* Success */}
          {message && (
            <p style={styles.success}>
              {message}
            </p>
          )}

          {/* Register */}
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Registering..." : "Register"}
          </button>

        </form>

        <p style={styles.loginText}>
          Already have an account?{" "}
          <span
            style={styles.loginLink}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f8",
    padding: "20px",
  },

  card: {
    width: "400px",
    maxWidth: "100%",
    background: "#ffffff",
    padding: "35px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
  },

  title: {
    textAlign: "center",
    marginBottom: "8px",
    fontSize: "28px",
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: "25px",
  },

  label: {
    display: "block",
    marginBottom: "6px",
    marginTop: "15px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "12px",
    marginTop: "22px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  error: {
    color: "#dc2626",
    marginTop: "15px",
    textAlign: "center",
  },

  success: {
    color: "#16a34a",
    marginTop: "15px",
    textAlign: "center",
  },

  loginText: {
    textAlign: "center",
    marginTop: "20px",
    color: "#555",
  },

  loginLink: {
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default Register;