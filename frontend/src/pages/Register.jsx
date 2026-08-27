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
  const [success, setSuccess] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Validate full name
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    // Validate email
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate password
    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Validate role
    if (!role) {
      setError("Please select a role.");
      return;
    }

    /*
      Get existing registered users
    */
    const existingUsers = JSON.parse(
      localStorage.getItem("registeredUsers") || "[]"
    );

    /*
      Check whether email already exists
    */
    const emailExists = existingUsers.some(
      (user) =>
        user.email.toLowerCase() ===
        email.trim().toLowerCase()
    );

    if (emailExists) {
      setError(
        "This email is already registered. Please use a different email."
      );
      return;
    }

    /*
      Create new user
    */
    const newUser = {
      id: Date.now(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: role,
    };

    /*
      Add user to registered users
    */
    existingUsers.push(newUser);

    localStorage.setItem(
      "registeredUsers",
      JSON.stringify(existingUsers)
    );

    setSuccess(
      "Registration successful! Please login."
    );

    // Clear form
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("");

    // Go to login
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <h1>Registration</h1>

        <p style={subtitleStyle}>
          Create your account
        </p>

        <form onSubmit={handleRegister}>

          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter full name"
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            style={inputStyle}
          />

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            style={inputStyle}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={inputStyle}
          />

          <label>Confirm Password</label>

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            style={inputStyle}
          />

          <label>Role</label>

          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
            style={inputStyle}
          >
            <option value="">
              Select Role
            </option>

            <option value="Content Creator">
              Content Creator
            </option>

            <option value="Learner">
              Learner
            </option>

            <option value="Educator">
              Educator
            </option>

            <option value="Administrator">
              Administrator
            </option>
          </select>

          {error && (
            <p style={errorStyle}>
              ❌ {error}
            </p>
          )}

          {success && (
            <p style={successStyle}>
              ✓ {success}
            </p>
          )}

          <button
            type="submit"
            style={buttonStyle}
          >
            Register
          </button>

        </form>

        <p>
          Already have an account?
        </p>

        <button
          onClick={() => navigate("/login")}
          style={secondaryButton}
        >
          Go to Login
        </button>

      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f5f7fb",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
  fontFamily: "Arial, sans-serif",
};

const cardStyle = {
  width: "420px",
  backgroundColor: "white",
  padding: "35px",
  borderRadius: "12px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
};

const subtitleStyle = {
  textAlign: "center",
  color: "#666",
  marginBottom: "25px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "7px",
  marginBottom: "18px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  boxSizing: "border-box",
  fontSize: "15px",
};

const errorStyle = {
  color: "#dc2626",
  backgroundColor: "#fee2e2",
  padding: "10px",
  borderRadius: "6px",
};

const successStyle = {
  color: "#15803d",
  backgroundColor: "#dcfce7",
  padding: "10px",
  borderRadius: "6px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#3157d5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "16px",
};

const secondaryButton = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#eeeeee",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Register;