import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend schemas, verified from app/schemas/analytics.py:
//
// DashboardAnalyticsOut (GET /api/analytics/dashboard):
//   total_videos, videos_by_status {uploaded, processing, done, failed},
//   total_transcript_words, total_key_moments, total_highlights,
//   average_key_moments_per_video, most_common_keywords[], last_upload_at
//
// VideoAnalyticsOut (GET /api/analytics/videos/{id}):
//   video_id, filename, status, transcript_word_count,
//   short_summary_word_count, summary_word_count, key_moments_count,
//   highlights_count, keywords_count, top_keywords[], uploaded_at
//
// The old page's /analytics/stats/overview, /analytics/stats/processing,
// /analytics/stats/dashboard calls are removed — none of those routes
// exist on any backend branch.

function Analytics() {
  const navigate = useNavigate();

  // No initial numeric values here on purpose: an object that starts as
  // {total_videos: 0, ...} renders "0" indistinguishably from a real
  // empty account before the fetch resolves. Starting as `null` and
  // gating render on loading/error/null means the UI can never show a
  // number that didn't come from the API.
  const [dashboard, setDashboard] = useState(null);
  const [videoAnalytics, setVideoAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }

    const videoId = localStorage.getItem("currentVideoId");

    Promise.all([
      api.getDashboardAnalytics(),
      videoId ? api.getVideoAnalytics(videoId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([dashboardData, perVideoData]) => {
        setDashboard(dashboardData);
        setVideoAnalytics(perVideoData);
      })
      .catch((err) => setError(err.message || "Unable to load analytics."))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="page-state">Loading analytics...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!dashboard) return <div className="page-state">No analytics available yet.</div>;

  return (
    <div className="analytics-page">
      <h2>Analytics Dashboard</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{dashboard.total_videos}</span>
          <span className="stat-label">Total videos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.videos_by_status.done}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.videos_by_status.processing}</span>
          <span className="stat-label">Processing</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.videos_by_status.failed}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.total_key_moments}</span>
          <span className="stat-label">Total key moments</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.total_highlights}</span>
          <span className="stat-label">Total highlights</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.average_key_moments_per_video.toFixed(1)}</span>
          <span className="stat-label">Avg key moments / video</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dashboard.total_transcript_words}</span>
          <span className="stat-label">Total transcript words</span>
        </div>
      </div>

      {dashboard.most_common_keywords.length > 0 && (
        <div className="common-keywords">
          <h3>Most common keywords</h3>
          <div className="keyword-cloud">
            {dashboard.most_common_keywords.map((w, i) => (
              <span key={i} className="keyword-chip">
                #{w}
              </span>
            ))}
          </div>
        </div>
      )}

      {dashboard.last_upload_at && (
        <p className="last-upload">
          Last upload: {new Date(dashboard.last_upload_at).toLocaleString()}
        </p>
      )}

      {videoAnalytics && (
        <div className="current-video-analytics">
          <h3>Current video — {videoAnalytics.filename}</h3>
          <ul>
            <li>Status: {videoAnalytics.status}</li>
            <li>Transcript words: {videoAnalytics.transcript_word_count}</li>
            <li>Summary words: {videoAnalytics.summary_word_count}</li>
            <li>Key moments: {videoAnalytics.key_moments_count}</li>
            <li>Highlights: {videoAnalytics.highlights_count}</li>
            <li>Keywords: {videoAnalytics.keywords_count}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Analytics;
