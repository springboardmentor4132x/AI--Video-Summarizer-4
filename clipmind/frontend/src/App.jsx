import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import Layout from "./components/Layout";
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
import Story from "./pages/Story";
import Revision from "./pages/Revision";
import VideoDNA from "./pages/VideoDNA";
import EvidenceLens from "./pages/EvidenceLens";
import MemoryDeck from "./pages/MemoryDeck";
import LiveSummaries from "./pages/LiveSummaries";
import Home from "./pages/Home";
import VideoPicker from "./components/VideoPicker";
import RoleRoute from "./components/RoleRoute";
import AdminDashboard from "./pages/AdminDashboard";
import EducatorDashboard from "./pages/EducatorDashboard";
import SharedWithMe from "./pages/SharedWithMe";
import TimeMachine from "./pages/TimeMachine";
import Daily from "./pages/Daily";
import Compare from "./pages/Compare";

// Every authenticated page is wrapped in Layout (adds the shared NavBar)
// AND sits behind <ProtectedRoute/>, which bounces anyone without a
// stored auth token back to /login. Login/Register stay outside the
// guard since there's nothing to navigate to before authenticating.
// Old /insights URLs now live under /revision (Video DNA and Evidence Lens
// became their own pages).
function InsightsRedirect() {
  const { videoId } = useParams();
  return <Navigate to={videoId ? `/revision/${videoId}` : "/revision"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<Home />} />

        {/* Authentication (public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Everything below requires a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Layout><VideoUpload /></Layout>} />
          <Route path="/history" element={<Layout><UploadHistory /></Layout>} />
          <Route path="/processing" element={<Layout><ProcessingStatus /></Layout>} />
          <Route path="/results" element={<Layout><Results /></Layout>} />
          {/* Deep link to a video; ?t=SECONDS seeks the player (used by ClipMind Story). */}
          <Route path="/video/:videoId" element={<Layout><Results /></Layout>} />
          <Route path="/insights" element={<InsightsRedirect />} />
          <Route path="/insights/:videoId" element={<InsightsRedirect />} />
          <Route path="/revision" element={<Layout><Revision /></Layout>} />
          <Route path="/revision/:videoId" element={<Layout><Revision /></Layout>} />
          <Route
            path="/video-dna"
            element={<Layout><VideoPicker title="Video DNA" basePath="/video-dna" blurb="See how a video is structured: topics, information density and its most important moments." /></Layout>}
          />
          <Route path="/video-dna/:videoId" element={<Layout><VideoDNA /></Layout>} />
          <Route
            path="/evidence"
            element={<Layout><VideoPicker title="Evidence Lens" basePath="/evidence" blurb="Ask a question and see the exact transcript evidence behind every answer." /></Layout>}
          />
          <Route path="/evidence/:videoId" element={<Layout><EvidenceLens /></Layout>} />
          <Route path="/shared" element={<Layout><SharedWithMe /></Layout>} />
          <Route
            path="/educator"
            element={<Layout><RoleRoute roles={["educator", "administrator"]}><EducatorDashboard /></RoleRoute></Layout>}
          />
          <Route
            path="/admin"
            element={<Layout><RoleRoute roles={["administrator"]}><AdminDashboard /></RoleRoute></Layout>}
          />
          <Route path="/memory-deck" element={<Layout><MemoryDeck /></Layout>} />
          <Route path="/live-summaries" element={<Layout><LiveSummaries /></Layout>} />
          <Route path="/timemachine" element={<Layout><TimeMachine /></Layout>} />
          <Route path="/daily" element={<Layout><Daily /></Layout>} />
          <Route path="/compare" element={<Layout><Compare /></Layout>} />
          <Route path="/compare/:comparisonId" element={<Layout><Compare /></Layout>} />
          <Route path="/story" element={<Layout><Story /></Layout>} />
          <Route path="/story/:videoId" element={<Layout><Story /></Layout>} />
          <Route path="/transcript" element={<Layout><Transcript /></Layout>} />
          <Route path="/summary" element={<Layout><Summary /></Layout>} />
          <Route path="/key-moments" element={<Layout><KeyMoments /></Layout>} />
          <Route path="/keywords" element={<Layout><Keywords /></Layout>} />
          <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
          <Route path="/content-insights" element={<Layout><ContentInsights /></Layout>} />
          <Route path="/usage-reports" element={<Layout><UsageReports /></Layout>} />
        </Route>

        {/* Unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
