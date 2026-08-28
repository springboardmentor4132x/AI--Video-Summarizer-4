import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoUpload from "./pages/VideoUpload";
import UploadHistory from "./pages/UploadHistory";
import ProcessingStatus from "./pages/ProcessingStatus";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Video Upload */}
          <Route
            path="/upload"
            element={<VideoUpload />}
          />

          {/* Upload History */}
          <Route
            path="/history"
            element={<UploadHistory />}
          />

          {/* Processing Status */}
          <Route
            path="/processing"
            element={<ProcessingStatus />}
          />

        </Route>

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;