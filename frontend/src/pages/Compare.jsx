import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import WatchChip from "../components/WatchChip";
import useLoaded from "../useLoaded";

// Version Comparison: what changed between two videos, from their transcripts.
// Every item points at the moment in the old and/or new video.

const STATUSES = [
  { id: "changed", label: "Changed" },
  { id: "new", label: "New" },
  { id: "removed", label: "Removed" },
  { id: "unchanged", label: "Unchanged" },
];

function Item({ item, oldId, newId, onWatch }) {
  return (
    <li className={`cmp-item cmp-${item.status}`}>
      <span className={`cmp-badge cmp-badge-${item.status}`}>{item.status.toUpperCase()}</span>
      <p className="cmp-text">{item.text}</p>
      {item.status === "changed" && item.old_text && <p className="cmp-old">Before: {item.old_text}</p>}
      {item.explanation && <p className="muted">{item.explanation}</p>}
      <div className="cmp-actions">
        {item.old_start != null && (
          <WatchChip label="Watch Old" start={item.old_start} end={item.old_end} onWatch={(t) => onWatch(oldId, t)} />
        )}
        {item.new_start != null && (
          <WatchChip label="Watch New" start={item.new_start} end={item.new_end} onWatch={(t) => onWatch(newId, t)} />
        )}
      </div>
    </li>
  );
}

export default function Compare() {
  const navigate = useNavigate();
  const { comparisonId } = useParams();
  const library = useLoaded(() => api.getHistory(), []);
  const [saved, setSaved] = useState([]);
  const [oldId, setOldId] = useState("");
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState("changed");

  const show = (c) => {
    setResult(c);
    setFilter(c.counts.changed ? "changed" : c.counts.new ? "new" : c.counts.removed ? "removed" : "unchanged");
  };

  useEffect(() => {
    let cancelled = false;
    api.listComparisons().then((l) => !cancelled && setSaved(l)).catch(() => {});
    if (comparisonId) {
      api.getComparison(comparisonId)
        .then((c) => !cancelled && show(c))
        .catch((err) => !cancelled && setError(err.status === 404 ? "That comparison doesn't exist." : err.message));
    }
    return () => {
      cancelled = true;
    };
  }, [comparisonId]);

  const videos = (library.data || []).filter((v) => v.status === "done");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const c = await api.createComparison(oldId, newId);
      show(c);
      setSaved(await api.listComparisons());
    } catch (err) {
      setResult(null);
      setError(err.message || "The comparison failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this saved comparison?")) return;
    try {
      await api.deleteComparison(id);
      setSaved((s) => s.filter((x) => x.id !== id));
      if (result?.id === id) setResult(null);
    } catch (err) {
      setError(err.message || "Couldn't delete it.");
    }
  };

  const watch = (id, t) => navigate(`/video/${id}?t=${Math.floor(t)}`);
  const items = result ? result.items.filter((i) => i.status === filter) : [];

  return (
    <div className="cmp-page">
      <header className="story-header">
        <div>
          <h2>Compare versions</h2>
          <p className="story-tagline">See what's new, removed or changed between two videos, with a link to each moment.</p>
        </div>
      </header>

      <div className="cmp-pick">
        <label>Older version
          <select value={oldId} onChange={(e) => setOldId(e.target.value)}>
            <option value="">Choose a video</option>
            {videos.map((v) => <option key={v.id} value={v.id} disabled={v.id === newId}>{v.filename}</option>)}
          </select>
        </label>
        <label>Newer version
          <select value={newId} onChange={(e) => setNewId(e.target.value)}>
            <option value="">Choose a video</option>
            {videos.map((v) => <option key={v.id} value={v.id} disabled={v.id === oldId}>{v.filename}</option>)}
          </select>
        </label>
        <button type="button" className="insight-primary" onClick={run} disabled={busy || !oldId || !newId}>
          {busy ? "Comparing transcripts..." : "Compare"}
        </button>
      </div>
      {!library.loading && videos.length < 2 && (
        <p className="page-state">You need at least two processed videos to compare. Upload another version first.</p>
      )}
      {error && <p className="page-state error" role="alert">{error}</p>}

      {result && (
        <section aria-label="Comparison result">
          <div className="cmp-summary">
            <h3>{result.old_filename} vs {result.new_filename}</h3>
            <p><strong>{result.verdict}</strong>, {Math.round(result.similarity * 100)}% of the content carried over.</p>
            <p className="muted">{result.method_note}{result.truncated ? " Very long transcripts were compared up to their first 1,200 sentences." : ""}</p>
          </div>
          <div className="cmp-filters" role="tablist" aria-label="Filter by change">
            {STATUSES.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={filter === s.id}
                className={"insight-tab" + (filter === s.id ? " active" : "")} onClick={() => setFilter(s.id)}>
                {s.label} ({result.counts[s.id]})
              </button>
            ))}
          </div>
          {items.length === 0
            ? <p className="page-state">Nothing is {filter} between these two videos.</p>
            : <ul className="cmp-list">
                {items.map((it, n) => (
                  <Item key={n} item={it} oldId={result.old_video_id} newId={result.new_video_id} onWatch={watch} />
                ))}
              </ul>}
        </section>
      )}

      {saved.length > 0 && (
        <section>
          <h3>Saved comparisons</h3>
          <ul className="cmp-saved">
            {saved.map((c) => (
              <li key={c.id}>
                <button type="button" className="link-button" onClick={async () => {
                  setError("");
                  try { show(await api.getComparison(c.id)); } catch (err) { setError(err.message); }
                }}>
                  {c.old_filename} vs {c.new_filename}
                </button>
                <span className="muted">{c.verdict}</span>
                <button type="button" onClick={() => remove(c.id)} aria-label={`Delete comparison ${c.old_filename} vs ${c.new_filename}`}>Delete</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
