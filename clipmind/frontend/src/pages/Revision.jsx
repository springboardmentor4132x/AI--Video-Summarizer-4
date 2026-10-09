import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import WatchChip from "../components/WatchChip";
import useLoaded from "../useLoaded";
import "../insights.css";

// 5-Minute Revision: a compact, exam-ready sheet built ONLY from the video's
// own transcript (definitions, formulas, differences, confusions, key
// timestamps). Every item links back to the exact moment in the video.
// (Video DNA and Evidence Lens have their own pages: /video-dna, /evidence.)

function Group({ title, items, render, emptyText }) {
  return (
    <section className="rev-group">
      <h4>{title}</h4>
      {items.length === 0 ? <p className="muted">{emptyText}</p> : <ul>{items.map(render)}</ul>}
    </section>
  );
}

function Sheet({ sheet, onWatchIn }) {
  const watch = (t) => onWatchIn(sheet.video_id, t);
  const line = (i, k) => (
    <li key={k}>
      {i.text} <WatchChip start={i.start_time} end={i.end_time} onWatch={watch} />
    </li>
  );
  return (
    <article className="rev-sheet">
      <h3>{sheet.filename}</h3>
      <Group title="Must-remember concepts" items={sheet.must_remember} render={line} emptyText="No key moments were detected for this video." />
      <Group title="Definitions" items={sheet.definitions} emptyText="No definition-style sentences found."
        render={(d, k) => <li key={k}><strong>{d.term}:</strong> {d.text} <WatchChip start={d.start_time} end={d.end_time} onWatch={watch} /></li>} />
      <Group title="Important differences" items={sheet.differences} render={line} emptyText="No comparisons found in the transcript." />
      <Group title="Formulas" items={sheet.formulas} render={line} emptyText="No formulas found in the transcript." />
      <Group title="Common confusions" items={sheet.confusions} render={line} emptyText="No warnings or common mistakes were mentioned." />
      <Group title="Key timestamps" items={sheet.key_timestamps} emptyText="None."
        render={(k, n) => <li key={n}><WatchChip start={k.start_time} end={k.end_time} onWatch={watch} /> {k.label}</li>} />
      <section className="rev-group">
        <h4>Quick flashcards</h4>
        {sheet.flashcards.length === 0 ? <p className="muted">Not enough definitions or key moments to make cards.</p> : (
          <div className="rev-cards">
            {sheet.flashcards.map((c, n) => (
              <details key={n} className="rev-card">
                <summary>{c.question}</summary>
                <p>{c.answer}</p>
                <WatchChip label="Source" start={c.start_time} end={c.end_time} onWatch={watch} />
              </details>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function RevisionTab({ videoId, onWatchIn }) {
  const library = useLoaded(() => api.getHistory(), []);
  const [selected, setSelected] = useState([videoId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState(null);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      setSheets((await api.getRevision(selected)).videos);
    } catch (err) {
      setSheets(null);
      setError(err.message || "Couldn't build the revision page.");
    } finally {
      setBusy(false);
    }
  };

  const videos = (library.data || []).filter((v) => v.status === "done");
  return (
    <div className="revision">
      <p className="insight-intro">
        A compact revision page from the transcript. Pick one video, or up to 5 to revise together.
      </p>
      <fieldset className="rev-picker">
        <legend>Videos to include</legend>
        {library.loading && <p className="muted">Loading your videos...</p>}
        {library.error && <p className="page-state error">{library.error}</p>}
        {videos.map((v) => (
          <label key={v.id}>
            <input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggle(v.id)}
              disabled={!selected.includes(v.id) && selected.length >= 5} />
            {v.filename}
          </label>
        ))}
      </fieldset>
      <button type="button" className="insight-primary" onClick={generate} disabled={busy || selected.length === 0}>
        {busy ? "Building revision page..." : "Generate 5-Minute Revision"}
      </button>
      {error && <p className="page-state error" role="alert">{error}</p>}
      {sheets && sheets.map((s) => <Sheet key={s.video_id} sheet={s} onWatchIn={onWatchIn} />)}
    </div>
  );
}

// ------------------------------------------------------------- EVIDENCE

// ------------------------------------------------------------------ PAGE

export default function Revision() {
  const navigate = useNavigate();
  const { videoId: routeVideoId } = useParams();
  const videoId = routeVideoId || localStorage.getItem("currentVideoId");

  const [video, setVideo] = useState({ state: videoId ? "loading" : "none", data: null, error: "" });

  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return undefined;
    }
    if (!videoId) return undefined;
    if (routeVideoId) localStorage.setItem("currentVideoId", routeVideoId);
    let cancelled = false;
    api.getVideoStatus(videoId)
      .then((data) => !cancelled && setVideo({ state: "ready", data, error: "" }))
      .catch((err) => !cancelled && setVideo({ state: err.status === 404 ? "notfound" : "error", data: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [videoId, routeVideoId, navigate]);

  const watch = (id, t) => navigate(`/video/${id}?t=${Math.floor(t)}`);

  if (video.state === "none") {
    return (
      <div className="page-state">
        <p>No video selected yet.</p>
        <button type="button" onClick={() => navigate("/history")}>Choose a video</button>
      </div>
    );
  }
  if (video.state === "loading") return <div className="page-state">Loading video...</div>;
  if (video.state === "notfound") {
    return (
      <div className="page-state error">
        <p>We couldn't find that video. It may have been removed, or it belongs to another account.</p>
        <button type="button" onClick={() => navigate("/history")}>Back to your videos</button>
      </div>
    );
  }
  if (video.state === "error") return <div className="page-state error"><p>{video.error}</p></div>;

  const v = video.data;
  const ready = v.status === "done" && v.transcript_segments?.length > 0;

  return (
    <div className="insights-page">
      <header className="story-header">
        <div>
          <h2>5-Minute Revision</h2>
          <p className="story-tagline">Definitions, formulas and key moments to review fast, each linked to the video.</p>
        </div>
        <p className="story-video-name"><span>{v.filename}</span><Link to={`/video/${videoId}`}>Open video</Link></p>
      </header>

      {!ready ? (
        <div className="page-state">
          <p>{v.status === "done"
            ? "This video has no timestamped transcript, so there is nothing to analyze."
            : "This video isn't processed yet. Come back once processing is complete."}</p>
        </div>
      ) : (
        <>
          <RevisionTab videoId={videoId} onWatchIn={watch} />
        </>
      )}
    </div>
  );
}
