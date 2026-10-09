import { NavLink, useNavigate } from "react-router-dom";
import api from "../api";
import ThemeToggle from "./ThemeToggle";

// Primary links stay visible; related features are grouped so the bar is not
// a wall of 15 links. Groups use native <details> (keyboard + screen-reader
// friendly, no extra state).
const NAV_PRIMARY = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/history", label: "Videos" },
  { to: "/upload", label: "Upload" },
];

const NAV_GROUPS = [
  {
    label: "Learn",
    links: [
      { to: "/story", label: "Story" },
      { to: "/memory-deck", label: "Memory Deck" },
      { to: "/revision", label: "5-Minute Revision" },
      { to: "/daily", label: "Daily" },
      { to: "/timemachine", label: "Time Machine" },
    ],
  },
  {
    label: "Explore",
    links: [
      { to: "/video-dna", label: "Video DNA" },
      { to: "/evidence", label: "Evidence Lens" },
      { to: "/compare", label: "Compare" },
      { to: "/live-summaries", label: "Real-Time Workspace" },
    ],
  },
  {
    label: "Analytics",
    links: [
      { to: "/analytics", label: "Analytics" },
      { to: "/content-insights", label: "Content Insights" },
      { to: "/usage-reports", label: "Usage Reports" },
    ],
  },
];

const linkClass = ({ isActive }) => "app-nav-link" + (isActive ? " active" : "");

export default function NavBar() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const handleLogout = () => {
    api.logout();
    navigate("/login");
  };

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <button
          className="app-nav-brand"
          onClick={() => navigate("/dashboard")}
          aria-label="Go to dashboard"
        >
          ClipMind AI
        </button>

        <nav className="app-nav-links" aria-label="Main navigation">
          {NAV_PRIMARY.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {NAV_GROUPS.map((group) => (
            <details
              key={group.label}
              className="app-nav-group"
              onToggle={(e) => {
                // Close the other groups when one opens.
                if (e.currentTarget.open) {
                  document.querySelectorAll(".app-nav-group[open]").forEach((d) => {
                    if (d !== e.currentTarget) d.removeAttribute("open");
                  });
                }
              }}
            >
              <summary className="app-nav-link">{group.label}</summary>
              <div className="app-nav-menu">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={linkClass}
                    onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </details>
          ))}
        </nav>

        <div className="app-nav-user">
          <ThemeToggle />
          {currentUser?.name && <span className="app-nav-username">{currentUser.name}</span>}
          <button className="app-nav-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
