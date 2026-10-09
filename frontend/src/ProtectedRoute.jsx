import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
  // Must match the key api.js's getToken()/setToken() use, or a
  // logged-in user would be bounced straight back to /login.
  const token = localStorage.getItem("authToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;