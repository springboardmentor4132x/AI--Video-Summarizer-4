import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ThemeToggle from "../components/ThemeToggle";

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
      // Real JWT login against /api/auth/login. On success this stores
      // authToken in localStorage via api.login() so every subsequent
      // request automatically sends Authorization: Bearer <token>.
      await api.login({ email: email.trim().toLowerCase(), password });

      // Fetch the real profile from the backend rather than trusting
      // anything the client typed in.
      const user = await api.getCurrentUser();
      localStorage.setItem("currentUser", JSON.stringify(user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ThemeToggle className="theme-toggle-floating" />
    <div className="auth-page">
      <form onSubmit={handleLogin}>
        <h2>Log in to ClipMind AI</h2>

        {error && <div className="error-banner">{error}</div>}

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
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
    </>
  );
}

export default Login;
