import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoUpload from "./pages/VideoUpload";
import UploadHistory from "./pages/UploadHistory";
import ProcessingStatus from "./pages/ProcessingStatus";
import Results from "./pages/Results";
import KeyMoments from "./pages/KeyMoments";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/upload"
          element={<VideoUpload />}
        />

        <Route
          path="/history"
          element={<UploadHistory />}
        />

        <Route
          path="/processing"
          element={<ProcessingStatus />}
        />

        <Route
          path="/results"
          element={<Results />}
        />

        <Route
          path="/key-moments"
          element={<KeyMoments />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;