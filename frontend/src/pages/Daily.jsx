import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import WatchChip from "../components/WatchChip";
import useLoaded from "../useLoaded";
import { localDate } from "../utils/time";

// ClipMind Daily: a study session sized to the time you have, built from
// your own bookmarks, key moments and partly watched videos. Each item opens
// the video at its moment, and completion is saved.

const PRESETS = [10, 20, 30, 45, 60];
const KIND_LABEL = {
  memory_review: "Memory Deck review", bookmark: "Saved moment", key_moment: "Key moment", resume: "Continue watching", revision: "Quick revision",
};

export default function Daily() {
  const navigate = useNavigate();
  const today = localDate();
  const [minutes, setMinutes] = useState(20);
  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emptyReason, setEmptyReason] = useState("");
  const history = useLoaded(() => api.getDailyHistory(), [plan?.completed_count, plan?.id]);

  useEffect(() => {
    let cancelled = false;
    api.getDailyToday(today)
      .then((p) => {
        if (cancelled) return;
        setPlan(p);
        setMinutes(p.minutes);
      })
      .catch((err) => {
        if (!cancelled && err.status !== 404) setError(err.message || "Couldn't load today's plan.");
      })
      .finally(() => !cancelled && setLoadingPlan(false));
    return () => {
      cancelled = true;
    };
  }, [today]);

  const generate = async () => {
    setBusy(true);
    setError("");
    setEmptyReason("");
    try {
      const res = await api.generateDaily(minutes, today);
      setPlan(res.plan);
      setEmptyReason(res.empty_reason || "");
    } catch (err) {
      setError(err.message || "Couldn't build a plan.");
    } finally {
      setBusy(false);
    }
  };

  const open = (item) => {
    if (item.kind === "revision") navigate(`/revision/${item.video_id}`);
    else navigate(`/video/${item.video_id}?t=${Math.floor(item.start_time)}`);
  };

  const toggle = async (item) => {
    setError("");
    try {
      setPlan(await api.setDailyItem(plan.id, item.item_id, !item.completed));
    } catch (err) {
      setError(err.message || "Couldn't update that item.");
    }
  };

  const start = async () => {
    setError("");
    try {
      const updated = await api.startDaily(plan.id);
      setPlan(updated);
      const next = updated.items.find((i) => !i.completed);
      if (next) open(next);
    } catch (err) {
      setError(err.message || "Couldn't start the session.");
    }
  };

  const pct = plan && plan.total_count ? Math.round((plan.completed_count / plan.total_count) * 100) : 0;
  const finished = plan && plan.total_count > 0 && plan.completed_count === plan.total_count;

  return (
    <div className="daily-page">
      <header className="story-header">
        <div>
          <h2>ClipMind Daily</h2>
          <p className="story-tagline">A study session sized to the time you have, built from your own videos and bookmarks.</p>
        </div>
      </header>

      <fieldset className="daily-time">
        <legend>How much time do you have?</legend>
        <div className="daily-presets">
          {PRESETS.map((m) => (
            <button key={m} type="button" className={"daily-preset" + (minutes === m ? " selected" : "")}
              aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
              {m} min
            </button>
          ))}
          <label className="daily-custom">
            Other
            <input type="number" min="5" max="120" value={minutes}
              onChange={(e) => setMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 5)))} />
            min
          </label>
        </div>
        <button type="button" className="insight-primary" onClick={generate} disabled={busy}>
          {busy ? "Building your plan..." : plan ? "Regenerate plan" : "Generate plan"}
        </button>
        {plan && <span className="muted">Regenerating replaces today's plan and resets its progress.</span>}
      </fieldset>

      {error && <p className="page-state error" role="alert">{error}</p>}
      {loadingPlan && <p className="page-state">Loading today's plan...</p>}
      {!loadingPlan && !plan && emptyReason && <p className="page-state">{emptyReason}</p>}
      {!loadingPlan && !plan && !emptyReason && !error && (
        <p className="page-state">No plan for today yet. Choose your time and generate one.</p>
      )}

      {plan && (
        <section className="daily-plan" aria-label="Today's plan">
          <div className="daily-summary">
            <h3>Today, {plan.minutes} minutes</h3>
            <p className="muted">
              {plan.planned_minutes} min planned, {plan.completed_count} of {plan.total_count} done
              ({plan.completed_minutes} min)
            </p>
            {plan.planned_minutes < plan.minutes * 0.6 && (
              <p className="muted" role="note">
                Only {plan.planned_minutes} of your {plan.minutes} minutes could be filled from your own saved and
                important material. Bookmark moments or process more videos to get longer sessions.
              </p>
            )}
            <div className="daily-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
            {finished
              ? <p className="daily-done">Session complete. Nice work.</p>
              : <button type="button" className="insight-primary" onClick={start}>
                  {plan.started_at ? "Continue session" : "Start session"}
                </button>}
          </div>

          <ol className="daily-items">
            {plan.items.map((item) => (
              <li key={item.item_id} className={item.completed ? "completed" : ""}>
                <span className="daily-mins">{item.minutes} min</span>
                <div className="daily-body">
                  <p className="daily-kind">{KIND_LABEL[item.kind] || item.kind}</p>
                  <p className="daily-title">{item.title}</p>
                  <p className="muted">{item.reason}</p>
                  <div className="daily-actions">
                    {item.kind === "revision"
                      ? <button type="button" className="watch-chip" onClick={() => open(item)}>Open revision page</button>
                      : <WatchChip start={item.start_time} end={item.end_time} onWatch={() => open(item)} />}
                    <label className="daily-check">
                      <input type="checkbox" checked={item.completed} onChange={() => toggle(item)} /> Done
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {history.data && history.data.length > 0 && (
        <section>
          <h3>Recent sessions</h3>
          <ul className="daily-history">
            {history.data.map((h) => (
              <li key={h.id}>
                <span>{h.date}</span>
                <span>{h.minutes} min plan</span>
                <span>{h.completed_count} of {h.total_count} done</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
