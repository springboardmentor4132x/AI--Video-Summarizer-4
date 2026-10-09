import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "../api";

// Gate a page by role. The role is asked of the SERVER (GET /users/me), never
// trusted from localStorage -- that copy can be edited in dev tools. This is
// only a courtesy so people don't land on a page of 403 errors: the backend
// independently refuses every admin/educator request from the wrong role.
export default function RoleRoute({ roles, children }) {
  const [state, setState] = useState({ loading: true, role: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    api
      .getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        localStorage.setItem("currentUser", JSON.stringify(user));
        setState({ loading: false, role: user.role, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, role: null, error: err.message || "Unable to verify your access." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!api.isAuthed()) return <Navigate to="/login" replace />;
  if (state.loading) return <p className="page-state">Checking your access...</p>;
  if (state.error) return <p className="page-state error">{state.error}</p>;
  if (!roles.includes(state.role)) {
    return (
      <div className="page-state error" role="alert">
        <h2>Access denied</h2>
        <p>Your account type doesn&apos;t include this area.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }
  return children;
}
