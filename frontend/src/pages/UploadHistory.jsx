import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend note: GET /api/videos/history returns List[VideoOut] for the
// current authenticated user, sorted newest first. History must come
// from the backend; localStorage is only used here to remember which
// video is currently selected when navigating to another page.
//
// UPDATE (video library improvement): search/filter/sort are all
// client-side over the already-fetched list -- no new backend
// endpoint, no repeated network calls per keystroke. Deletion was
// deliberately NOT added: the backend has no delete-video route today,
// and adding destructive deletion (video + associated DB records +
// on-disk file) safely is real work that wasn't in scope for this pass.

const STATUS_OPTIONS = ["all", "uploaded", "processing", "done", "failed"];

function UploadHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }

    api
      .getHistory()
      .then(setHistory)
      .catch((err) => setError(err.message || "Unable to load upload history."))
      .finally(() => setLoading(false));
  }, [navigate]);

  const viewResults = (video) => {
    localStorage.setItem("currentVideoId", video.id);
    navigate("/results");
  };

  const openStory = (video) => {
    localStorage.setItem("currentVideoId", video.id);
    navigate(`/story/${video.id}`);
  };

  const visibleHistory = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    let filtered = history.filter((video) => {
      const matchesQuery = trimmedQuery
        ? video.filename.toLowerCase().includes(trimmedQuery)
        : true;
      const matchesStatus = statusFilter === "all" ? true : video.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.uploaded_at).getTime();
      const dateB = new Date(b.uploaded_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [history, query, statusFilter, sortOrder]);

  if (loading) return <div className="page-state">Loading history...</div>;
  if (error) return <div className="page-state error">{error}</div>;

  if (history.length === 0) {
    return (
      <div className="page-state">
        <p>No videos yet.</p>
        <p>Upload your first video to start building your library.</p>
        <button onClick={() => navigate("/upload")}>Upload a video</button>
      </div>
    );
  }

  return (
    <div className="upload-history-page">
      <h2>Video Library</h2>

      <div className="library-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          aria-label="Search videos by title"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          aria-label="Sort order"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {visibleHistory.length === 0 ? (
        <p className="page-state">No videos match your search/filter.</p>
      ) : (
        <ul className="history-list">
          {visibleHistory.map((video) => (
            <li key={video.id} className="history-item">
              <div className="history-filename">{video.filename}</div>
              <div className="history-status">{video.status}</div>
              <div className="history-date">
                {video.uploaded_at ? new Date(video.uploaded_at).toLocaleString() : ""}
              </div>
              <button onClick={() => viewResults(video)}>View results</button>
              {video.status === "done" && (
                <button onClick={() => openStory(video)}>ClipMind Story</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UploadHistory;
