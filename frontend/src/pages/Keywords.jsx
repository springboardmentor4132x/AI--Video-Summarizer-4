import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Backend fields (app/models/video.py Keyword model): word, score.
// This is the deterministic frequency-based extractor with stopword
// filtering — NOT transformer-based. Don't describe it otherwise in UI copy.

function Keywords() {
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const videoId = typeof window !== "undefined" ? localStorage.getItem("currentVideoId") : null;

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return;
    }
    (async () => {
      if (!videoId) {
        setError("No uploaded video selected yet.");
        setLoading(false);
        return;
      }
      try {
        const data = await api.getVideoStatus(videoId);
        setVideo(data);
      } catch (err) {
        setError(err.message || "Unable to load keywords.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, videoId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const data = await api.generateKeywords(videoId);
      setVideo(data);
    } catch (err) {
      setError(err.message || "Keyword extraction failed.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="page-state">Loading keywords...</div>;
  if (error) return <div className="page-state error">{error}</div>;
  if (!video) return null;

  const keywords = video.keywords || [];

  return (
    <div className="keywords-page">
      <h2>Keywords — {video.filename}</h2>

      {keywords.length === 0 ? (
        <div className="page-state">No keywords extracted yet.</div>
      ) : (
        <div className="keyword-cloud">
          {keywords.map((k, i) => (
            <span key={i} className="keyword-chip" title={`score: ${k.score}`}>
              #{k.word}
            </span>
          ))}
        </div>
      )}

      <button onClick={handleGenerate} disabled={generating}>
        {generating ? "Extracting..." : "Re-run keyword extraction"}
      </button>
    </div>
  );
}

export default Keywords;
