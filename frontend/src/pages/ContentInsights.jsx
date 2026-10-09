import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend schema, verified from app/schemas/content_insights.py
// (GET /api/analytics/content-insights, one call, no per-field endpoints):
//   total_videos_analyzed
//   top_topics: [{word, frequency}]
//   average_key_moments_per_minute
//   average_keywords_per_video
//   length_distribution: {short, medium, long}   // second boundaries: <60 / 60-300 / >300
//   generated_at
//
// The old page's four/five separate fetches (analytics/{id},
// transcripts/{id}, summaries/{id}, keywords/{id}, key-moments/{id}) are
// replaced by this single call — the backend already aggregates across
// all of the user's videos server-side.

function ContentInsights() {
  const navigate = useNavigate();

  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    api
      .getContentInsights()
      .then(setInsights)
      .catch((err) => setError(err.message || "Unable to load content insights."))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="page-state">Loading content insights...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!insights) return null;

  if (insights.total_videos_analyzed === 0) {
    return <div className="page-state">No processed videos yet — upload one to see content insights.</div>;
  }

  return (
    <div className="content-insights-page">
      <h2>Content Insights</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{insights.total_videos_analyzed}</span>
          <span className="stat-label">Videos analyzed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{insights.average_key_moments_per_minute.toFixed(2)}</span>
          <span className="stat-label">Avg key moments / minute</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{insights.average_keywords_per_video.toFixed(1)}</span>
          <span className="stat-label">Avg keywords / video</span>
        </div>
      </div>

      <div className="length-distribution">
        <h3>Video length distribution</h3>
        <ul>
          <li>Short (&lt;60s): {insights.length_distribution.short}</li>
          <li>Medium (60–300s): {insights.length_distribution.medium}</li>
          <li>Long (&gt;300s): {insights.length_distribution.long}</li>
        </ul>
      </div>

      {insights.top_topics.length > 0 && (
        <div className="top-topics">
          <h3>Top topics</h3>
          <ul>
            {insights.top_topics.map((t, i) => (
              <li key={i}>
                #{t.word} — appears in {t.frequency} video{t.frequency === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="generated-at">
        Generated: {new Date(insights.generated_at).toLocaleString()}
      </p>
    </div>
  );
}

export default ContentInsights;
