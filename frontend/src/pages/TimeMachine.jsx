import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import WatchChip from "../components/WatchChip";
import useLoaded from "../useLoaded";

// Time Machine: search a concept across every processed video, and see the
// concepts you've met in the order you met them. Every result is a real
// transcript passage and opens the source video at that moment.

function when(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default function TimeMachine() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ status: "idle", data: null, error: "", asked: "" });
  const topics = useLoaded(() => api.getTopicEvolution(), []);

  const watch = (id, t) => navigate(`/video/${id}?t=${Math.floor(t)}`);

  const run = async (q) => {
    const text = q.trim();
    if (!text) return;
    setState({ status: "loading", data: null, error: "", asked: text });
    try {
      setState({ status: "done", data: await api.searchHistory(text), error: "", asked: text });
    } catch (err) {
      setState({ status: "error", data: null, error: err.message || "Search failed.", asked: text });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(query);
  };

  const pick = (concept) => {
    setQuery(concept);
    run(concept);
  };

  const results = state.data?.results || [];
  const t = topics.data;

  return (
    <div className="tm-page">
      <header className="story-header">
        <div>
          <h2>Time Machine</h2>
          <p className="story-tagline">Search any concept across everything you've processed, and see how your learning progressed.</p>
        </div>
      </header>

      <form className="tm-form" onSubmit={submit} role="search">
        <label htmlFor="tm-q" className="sr-only">Concept to search for</label>
        <input id="tm-q" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={200}
          placeholder="e.g. normalization" />
        <button type="submit" className="insight-primary" disabled={state.status === "loading" || !query.trim()}>
          {state.status === "loading" ? "Searching..." : "Search history"}
        </button>
      </form>

      {state.status === "error" && <p className="page-state error" role="alert">{state.error}</p>}

      {state.status === "done" && state.data.videos_searched === 0 && (
        <div className="page-state">
          <p>You don't have any processed videos yet, so there is nothing to search.</p>
          <button type="button" onClick={() => navigate("/upload")}>Upload a video</button>
        </div>
      )}
      {state.status === "done" && state.data.videos_searched > 0 && results.length === 0 && (
        <p className="page-state">
          "{state.asked}" doesn't appear in any of your {state.data.videos_searched} processed video
          {state.data.videos_searched === 1 ? "" : "s"}.
        </p>
      )}

      {results.length > 0 && (
        <section aria-label="Search results">
          <p className="muted">
            {results.length} moment{results.length === 1 ? "" : "s"} for "{state.asked}" across{" "}
            {new Set(results.map((r) => r.video_id)).size} video(s), searched {state.data.videos_searched}.
          </p>
          <ul className="tm-results">
            {results.map((r) => (
              <li key={`${r.video_id}-${r.start_time}`}>
                <div className="tm-head">
                  <strong>{r.filename}</strong>
                  <span className="tm-date">
                    Added {when(r.uploaded_at)}
                    {r.last_opened_at ? `, last opened ${when(r.last_opened_at)}` : ""}
                  </span>
                </div>
                <p className="tm-concept">{r.concept}</p>
                <p className="tm-context">{r.context}</p>
                <div className="tm-actions">
                  <WatchChip start={r.start_time} end={r.end_time} onWatch={(s) => watch(r.video_id, s)} />
                  <Link to={`/evidence/${r.video_id}`}>Check the evidence</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tm-evolution" aria-label="Topic evolution">
        <h3>Topic evolution</h3>
        {topics.loading && <p className="muted">Reading your video history...</p>}
        {topics.error && <p className="page-state error" role="alert">{topics.error}</p>}
        {t && !t.enough_data && (
          <p className="page-state">
            Topic evolution needs at least two processed videos with detected keywords (you have {t.video_count}
            {t.video_count === 1 ? "" : ""}) and a few shared concepts. Process more videos and it will appear here.
          </p>
        )}
        {t && t.enough_data && (
          <>
            <p className="muted">The concepts you've met, in the order you met them. Select one to search it.</p>
            <ol className="tm-path">
              {t.concepts.map((c) => (
                <li key={c.concept}>
                  <button type="button" className="tm-node" onClick={() => pick(c.concept)}>{c.concept}</button>
                  <details className="tm-sources">
                    <summary>{c.videos.length} video{c.videos.length === 1 ? "" : "s"}</summary>
                    <ul>
                      {c.videos.map((v) => (
                        <li key={v.video_id}>
                          {v.filename}, first at{" "}
                          <WatchChip start={v.first_time} onWatch={(s) => watch(v.video_id, s)} />
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}
