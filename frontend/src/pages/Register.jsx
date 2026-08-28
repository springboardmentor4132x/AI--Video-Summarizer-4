import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // =============================
    // FRONTEND VALIDATION
    // =============================

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!role) {
      setError("Please select a role.");
      return;
    }

    setRegistering(true);

    try {
      // =============================
      // REGISTER USER
      // =============================

      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            role: role,
          }),
        }
      );

      // =============================
      // READ RESPONSE
      // =============================

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // =============================
      // HANDLE BACKEND ERROR
      // =============================

      if (!response.ok) {
        let errorMessage =
          "Registration failed. Please try again.";

        if (typeof data?.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMessage = data.detail
            .map((item) => {
              if (typeof item === "string") {
                return item;
              }

              if (item?.msg) {
                return item.msg;
              }

              return JSON.stringify(item);
            })
            .join(", ");
        } else if (
          data?.detail &&
          typeof data.detail === "object"
        ) {
          errorMessage = JSON.stringify(data.detail);
        } else if (data?.message) {
          errorMessage =
            typeof data.message === "string"
              ? data.message
              : JSON.stringify(data.message);
        }

        throw new Error(errorMessage);
      }

      // =============================
      // SUCCESS
      // =============================

      setSuccess(
        "Registration successful! Redirecting to login..."
      );

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("");

      // Redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      console.error("Registration error:", err);

      let message =
        "Unable to register. Please try again.";

      if (err?.message) {
        message = err.message;
      }

      // Prevent [object Object]
      if (message === "[object Object]") {
        message =
          "Registration failed. Please check your details and try again.";
      }

      setError(message);

    } finally {
      setRegistering(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* =============================
            LOGO
        ============================= */}

        <div style={styles.logo}>
          🎬
        </div>

        <h1 style={styles.title}>
          ClipMind AI
        </h1>

        <p style={styles.tagline}>
          AI-Powered Video Summarization
        </p>

        {/* =============================
            TITLE
        ============================= */}

        <h2 style={styles.registerTitle}>
          Create Account
        </h2>

        <form onSubmit={handleRegister}>

          {/* =============================
              FULL NAME
          ============================= */}

          <div style={styles.field}>
            <label style={styles.label}>
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              style={styles.input}
              disabled={registering}
            />
          </div>

          {/* =============================
              EMAIL
          ============================= */}

          <div style={styles.field}>
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={styles.input}
              disabled={registering}
            />
          </div>

          {/* =============================
              PASSWORD
          ============================= */}

          <div style={styles.field}>
            <label style={styles.label}>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={styles.input}
              disabled={registering}
            />
          </div>

          {/* =============================
              CONFIRM PASSWORD
          ============================= */}

          <div style={styles.field}>
            <label style={styles.label}>
              Confirm Password
            </label>

            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              style={styles.input}
              disabled={registering}
            />
          </div>

          {/* =============================
              ROLE
          ============================= */}

          <div style={styles.field}>
            <label style={styles.label}>
              Role
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              style={styles.input}
              disabled={registering}
            >
              <option value="">
                Select Role
              </option>

              <option value="content_creator">
                Content Creator
              </option>

              <option value="learner">
                Learner
              </option>

              <option value="educator">
                Educator
              </option>

              <option value="administrator">
                Administrator
              </option>
            </select>
          </div>

          {/* =============================
              ERROR
          ============================= */}

          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* =============================
              SUCCESS
          ============================= */}

          {success && (
            <div style={styles.success}>
              ✓ {success}
            </div>
          )}

          {/* =============================
              REGISTER BUTTON
          ============================= */}

          <button
            type="submit"
            disabled={registering}
            style={{
              ...styles.button,
              opacity: registering ? 0.7 : 1,
              cursor: registering
                ? "not-allowed"
                : "pointer",
            }}
          >
            {registering
              ? "Creating Account..."
              : "Register"}
          </button>

        </form>

        {/* =============================
            LOGIN LINK
        ============================= */}

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
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "400px",
    maxWidth: "100%",
    padding: "40px",
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
    boxSizing: "border-box",
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

  registerTitle: {
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
    backgroundColor: "white",
  },

  error: {
    color: "#dc2626",
    marginBottom: "15px",
    fontSize: "14px",
    textAlign: "left",
    wordBreak: "break-word",
  },

  success: {
    color: "#16a34a",
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

  loginText: {
    marginTop: "20px",
    color: "#666",
  },

  loginLink: {
    color: "#3157d5",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Register;