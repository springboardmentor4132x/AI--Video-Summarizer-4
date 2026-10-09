import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend schema, verified from app/schemas/usage.py
// (GET /api/analytics/usage-report, one call):
//   total_uploads, uploads_by_day: [{date, count}],
//   success_count, failed_count, in_progress_count,
//   success_rate (0.0-1.0), total_storage_bytes,
//   average_file_size_bytes, generated_at

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function UsageReports() {
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    api
      .getUsageReport()
      .then(setReport)
      .catch((err) => setError(err.message || "Unable to load usage report."))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="page-state">Loading usage report...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!report) return null;

  if (report.total_uploads === 0) {
    return <div className="page-state">No uploads yet — usage stats will appear here.</div>;
  }

  return (
    <div className="usage-reports-page">
      <h2>Usage Report</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{report.total_uploads}</span>
          <span className="stat-label">Total uploads</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{report.success_count}</span>
          <span className="stat-label">Succeeded</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{report.failed_count}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{report.in_progress_count}</span>
          <span className="stat-label">In progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{Math.round(report.success_rate * 100)}%</span>
          <span className="stat-label">Success rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatBytes(report.total_storage_bytes)}</span>
          <span className="stat-label">Storage used</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatBytes(report.average_file_size_bytes)}</span>
          <span className="stat-label">Avg file size</span>
        </div>
      </div>

      {report.uploads_by_day.length > 0 && (
        <div className="uploads-by-day">
          <h3>Uploads by day</h3>
          <ul>
            {report.uploads_by_day.map((d, i) => (
              <li key={i}>
                {d.date}: {d.count}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="generated-at">
        Generated: {new Date(report.generated_at).toLocaleString()}
      </p>
    </div>
  );
}

export default UsageReports;
