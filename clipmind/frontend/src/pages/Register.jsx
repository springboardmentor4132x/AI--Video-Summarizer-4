import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ThemeToggle from "../components/ThemeToggle";

// Matches app.core.roles.VALID_ROLES exactly.
const ROLES = [
  { value: "content_creator", label: "Content Creator" },
  { value: "learner", label: "Learner" },
  { value: "educator", label: "Educator" },
];

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await api.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      // Registration succeeded; log the user straight in.
      await api.login({ email: email.trim().toLowerCase(), password });
      const user = await api.getCurrentUser();
      localStorage.setItem("currentUser", JSON.stringify(user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ThemeToggle className="theme-toggle-floating" />
    <div className="auth-page">
      <form onSubmit={handleRegister}>
        <h2>Create your ClipMind AI account</h2>

        {error && <div className="error-banner">{error}</div>}

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </div>
    </>
  );
}

export default Register;
