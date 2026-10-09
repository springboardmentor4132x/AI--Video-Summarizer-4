import { Link } from "react-router-dom";
import api from "../api";

const links = [
  ["home", "Home", "#home"],
  ["features", "Features", "#features"],
  ["how", "How It Works", "#how-it-works"],
];

export default function PublicNav({ active = "home" }) {
  const authenticated = api.isAuthed();
  const currentUser = authenticated
    ? JSON.parse(localStorage.getItem("currentUser") || "null")
    : null;
  const sectionTarget = (hash) => active === "home" ? hash : `/${hash}`;

  return (
    <header className={`home-nav${authenticated ? " is-authenticated" : ""}`}>
      <Link to="/" className="home-brand" aria-label="ClipMind AI home">
        ClipMind <span>AI</span>
      </Link>
      <nav className="home-nav-links" aria-label="Main navigation">
        {links.map(([id, label, target]) => (
          <a className={active === id ? "active" : ""} href={sectionTarget(target)} key={id}>
            {label}
          </a>
        ))}
      </nav>
      <div className="home-nav-actions">
        {authenticated ? (
          <Link to="/dashboard" className="home-welcome-user">
            Welcome back, <strong>{currentUser?.name?.split(" ")[0] || "there"}</strong>
          </Link>
        ) : (
          <>
            <Link to="/login" className={`home-login ${active === "login" ? "active" : ""}`}>Login</Link>
            <Link to="/register" className="home-nav-cta">Get Started</Link>
          </>
        )}
      </div>
    </header>
  );
}