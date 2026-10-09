import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import VideoPlayer from "../components/VideoPlayer";
import EvidenceAnswer from "../components/EvidenceAnswer";
import "../evidence.css";

// Evidence Lens page: ask a question -> quoted answer -> transcript evidence ->
// watch the exact moment. Uses POST /videos/{id}/ask (evidence_service).
export default function EvidenceLens() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [video, setVideo] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return undefined;
    }
    let cancelled = false;
    api
      .getVideoStatus(videoId)
      .then((data) => !cancelled && setVideo({ loading: false, data, error: "" }))
      .catch((err) => !cancelled && setVideo({ loading: false, data: null, error: err.message || "Video not found." }));
    return () => {
      cancelled = true;
    };
  }, [videoId, navigate]);

  const seekTo = (seconds) => {
    playerRef.current?.seekTo(seconds);
    document.querySelector("video")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setError("");
    try {
      const data = await api.askAboutVideo(videoId, q);
      setTurns((prev) => [
        ...prev,
        { question: q, answer: data.answer, evidence: data.evidence || [], insufficient: data.insufficient_info },
      ]);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Unable to search this video right now. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  if (video.loading) return <p className="page-state">Loading...</p>;
  if (video.error) return <p className="page-state error">{video.error}</p>;
  const hasTranscript = video.data.status === "done";

  return (
    <div className="evidence-page">
      <h2>Evidence Lens</h2>
      <p>{video.data.filename} — every answer is quoted from the transcript, with the exact moment to watch.</p>
      {!hasTranscript ? (
        <p className="page-state">This video is still processing — Evidence Lens needs the finished transcript.</p>
      ) : (
        <>
          <VideoPlayer ref={playerRef} videoId={videoId} />
          <div className="qa-conversation">
            {turns.length === 0 && <p className="page-state">Ask a question about this video.</p>}
            {turns.map((turn, i) => (
              <div key={i} className="qa-turn">
                <p>
                  <strong>You:</strong> {turn.question}
                </p>
                <EvidenceAnswer turn={turn} onWatch={seekTo} />
              </div>
            ))}
          </div>
          {error && <p className="page-state error">{error}</p>}
          <form onSubmit={ask} className="qa-form">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this video..."
              disabled={asking}
            />
            <button type="submit" disabled={asking || !question.trim()}>
              {asking ? "Finding evidence..." : "Ask"}
            </button>
            {turns.length > 0 && (
              <button type="button" onClick={() => setTurns([])}>
                Clear
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
