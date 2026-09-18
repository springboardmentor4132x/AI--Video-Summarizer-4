import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoUpload from "./pages/VideoUpload";
import UploadHistory from "./pages/UploadHistory";
import ProcessingStatus from "./pages/ProcessingStatus";
import Results from "./pages/Results";
import KeyMoments from "./pages/KeyMoments";
import Summary from "./pages/Summary";
import Transcript from "./pages/Transcript";
import Keywords from "./pages/Keywords";
import Analytics from "./pages/Analytics";
import ContentInsights from "./pages/ContentInsights";
import UsageReports from "./pages/UsageReports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
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

        {/* Processing */}
        <Route
          path="/processing"
          element={<ProcessingStatus />}
        />

        {/* Results */}
        <Route
          path="/results"
          element={<Results />}
        />

        {/* Transcript */}
        <Route
          path="/transcript"
          element={<Transcript />}
        />

        {/* Summary */}
        <Route
          path="/summary"
          element={<Summary />}
        />

        {/* Key Moments */}
        <Route
          path="/key-moments"
          element={<KeyMoments />}
        />

        {/* Keywords */}
        <Route
          path="/keywords"
          element={<Keywords />}
        />

        {/* Analytics */}
        <Route
          path="/analytics"
          element={<Analytics />}
        />

        {/* Content Insights */}
        <Route
          path="/content-insights"
          element={<ContentInsights />}
        />

        {/* Usage Reports */}
        <Route
          path="/usage-reports"
          element={<UsageReports />}
        />

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;