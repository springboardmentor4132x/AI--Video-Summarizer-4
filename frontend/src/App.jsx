import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

// --------------------------------------------------
// Pages
// --------------------------------------------------

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoUpload from "./pages/VideoUpload";
import UploadHistory from "./pages/UploadHistory";
import ProcessingStatus from "./pages/ProcessingStatus";
import Results from "./pages/Results";
import KeyMoments from "./pages/KeyMoments";
import Transcript from "./pages/Transcript";
import Summary from "./pages/Summary";
import VideoDNA from "./pages/VideoDNA";

// --------------------------------------------------
// App
// --------------------------------------------------

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ---------------------------------------- */}
        {/* Default route */}
        {/* ---------------------------------------- */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* ---------------------------------------- */}
        {/* Authentication */}
        {/* ---------------------------------------- */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ---------------------------------------- */}
        {/* Dashboard */}
        {/* ---------------------------------------- */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* ---------------------------------------- */}
        {/* Video Upload */}
        {/* ---------------------------------------- */}

        <Route
          path="/upload"
          element={<VideoUpload />}
        />

        {/* ---------------------------------------- */}
        {/* Processing */}
        {/* ---------------------------------------- */}

        <Route
          path="/processing"
          element={<ProcessingStatus />}
        />

        {/* ---------------------------------------- */}
        {/* Results */}
        {/* ---------------------------------------- */}

        <Route
          path="/results"
          element={<Results />}
        />

        {/* ---------------------------------------- */}
        {/* Transcript */}
        {/* ---------------------------------------- */}

        <Route
          path="/transcript"
          element={<Transcript />}
        />

        {/* ---------------------------------------- */}
        {/* Summary */}
        {/* ---------------------------------------- */}

        <Route
          path="/summary"
          element={<Summary />}
        />

        {/* ---------------------------------------- */}
        {/* Key Moments */}
        {/* ---------------------------------------- */}

        <Route
          path="/key-moments"
          element={<KeyMoments />}
        />

        {/* ---------------------------------------- */}
        {/* Upload History */}
        {/* ---------------------------------------- */}

        <Route
          path="/history"
          element={<UploadHistory />}
        />

        {/* ---------------------------------------- */}
        {/* Video DNA */}
        {/* ---------------------------------------- */}

        <Route
          path="/video-dna"
          element={<VideoDNA />}
        />

        {/* ---------------------------------------- */}
        {/* Fallback */}
        {/* ---------------------------------------- */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;