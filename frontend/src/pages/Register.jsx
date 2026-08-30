import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword || !role) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setRegistering(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      // Registration successful → redirect to login
      navigate("/login");
    } catch (err) {
      setError(err.message || "Unable to register. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Registration</h1>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Role</option>
            <option value="content_creator">Content Creator</option>
            <option value="learner">Learner</option>
            <option value="educator">Educator</option>
            <option value="administrator">Administrator</option>
          </select>

          {error && <p style={styles.error}>❌ {error}</p>}

          <button
            type="submit"
            disabled={registering}
            style={styles.button}
          >
            {registering ? "Registering..." : "Register"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <span
            style={styles.link}
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
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fb" },
  card: { width: "420px", backgroundColor: "white", padding: "35px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" },
  subtitle: { textAlign: "center", color: "#666", marginBottom: "25px" },
  input: { width: "100%", padding: "12px", marginBottom: "18px", border: "1px solid #ccc", borderRadius: "6px" },
  error: { color: "#dc2626", marginBottom: "15px" },
  button: { width: "100%", padding: "12px", backgroundColor: "#3157d5", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" },
  link: { color: "#3157d5", cursor: "pointer", fontWeight: "bold" },
};

export default Register;
