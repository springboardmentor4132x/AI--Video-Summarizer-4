import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import VideoUpload from "./pages/VideoUpload";
import UploadHistory from "./pages/UploadHistory";
import ProcessingStatus from "./pages/ProcessingStatus";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Registration */}
        <Route path="/register" element={<Register />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Video Upload */}
        <Route path="/upload" element={<VideoUpload />} />

        {/* Upload History */}
        <Route path="/history" element={<UploadHistory />} />

        {/* Processing Status */}
        <Route path="/processing" element={<ProcessingStatus />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;