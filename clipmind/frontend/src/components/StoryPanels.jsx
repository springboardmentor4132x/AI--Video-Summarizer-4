import StoryFrame from "./StoryFrame";
import { formatTimestamp } from "../utils/time";

// Renders the panels of one story in the chosen mode. Every mode shows
// the same real data (frame, title, concept, caption, transcript excerpt,
// timestamp, Watch button) -- the mode decides which parts lead.

function WatchButton({ panel, onWatch }) {
  return (
    <button type="button" className="sp-watch" onClick={() => onWatch(panel)}>
      <span aria-hidden="true">▶</span> Watch This Moment
      <span className="sp-watch-time">{formatTimestamp(panel.timestamp)}</span>
    </button>
  );
}

function Excerpt({ panel }) {
  if (!panel.transcript_excerpt) return null;
  return (
    <details className="sp-excerpt">
      <summary>Transcript excerpt</summary>
      <p>{panel.transcript_excerpt}</p>
    </details>
  );
}

function Concept({ panel }) {
  if (!panel.concept) return null;
  return (
    <p className="sp-concept">
      <strong>Concept:</strong> {panel.concept}
    </p>
  );
}

function ComicPanel({ panel, onWatch }) {
  return (
    <article className="sp sp-comic">
      <span className="sp-badge">Panel {panel.panel_number}</span>
      <StoryFrame key={panel.panel_id} panel={panel} onWatch={onWatch} />
      <p className="sp-bubble">“{panel.caption}”</p>
      <div className="sp-body">
        <h3>{panel.title}</h3>
        <Concept panel={panel} />
        <Excerpt panel={panel} />
        <WatchButton panel={panel} onWatch={onWatch} />
      </div>
    </article>
  );
}

function BookPanel({ panel, total, onWatch }) {
  return (
    <article className="sp sp-book">
      <StoryFrame key={panel.panel_id} panel={panel} onWatch={onWatch} />
      <div className="sp-body">
        <p className="sp-page">
          Page {panel.panel_number} of {total}
        </p>
        <h3>{panel.title}</h3>
        <p className="sp-narration">{panel.caption}</p>
        <Concept panel={panel} />
        <Excerpt panel={panel} />
        <WatchButton panel={panel} onWatch={onWatch} />
      </div>
    </article>
  );
}

function NotePanel({ panel, onWatch }) {
  return (
    <article className="sp sp-note">
      <StoryFrame key={panel.panel_id} panel={panel} onWatch={onWatch} />
      <div className="sp-body">
        <h3>
          <span className="sp-note-num">{panel.panel_number}.</span> {panel.title}
        </h3>
        <Concept panel={panel} />
        <p className="sp-takeaway">
          <strong>Key point:</strong> {panel.caption}
        </p>
        {panel.transcript_excerpt && (
          <blockquote className="sp-quote">{panel.transcript_excerpt}</blockquote>
        )}
        <WatchButton panel={panel} onWatch={onWatch} />
      </div>
    </article>
  );
}

function BoardPanel({ panel, onWatch }) {
  const seconds = Math.max(0, Math.round(panel.end_time - panel.start_time));
  return (
    <article className="sp sp-board">
      <div className="sp-board-frame">
        <StoryFrame key={panel.panel_id} panel={panel} onWatch={onWatch} />
        <span className="sp-shot">Shot {panel.panel_number}</span>
      </div>
      <div className="sp-body">
        <h3>{panel.title}</h3>
        <p className="sp-board-desc">{panel.caption}</p>
        <p className="sp-board-meta">
          {formatTimestamp(panel.start_time)} to {formatTimestamp(panel.end_time)}
          {seconds > 0 ? ` (${seconds}s)` : ""}
        </p>
        <Concept panel={panel} />
        <Excerpt panel={panel} />
        <WatchButton panel={panel} onWatch={onWatch} />
      </div>
    </article>
  );
}

export default function StoryPanelsView({ mode, panels, onWatch }) {
  return (
    <div className={`story-grid story-grid-${mode}`}>
      {panels.map((panel) => {
        switch (mode) {
          case "storybook":
            return <BookPanel key={panel.panel_id} panel={panel} total={panels.length} onWatch={onWatch} />;
          case "study_notes":
            return <NotePanel key={panel.panel_id} panel={panel} onWatch={onWatch} />;
          case "storyboard":
            return <BoardPanel key={panel.panel_id} panel={panel} onWatch={onWatch} />;
          default:
            return <ComicPanel key={panel.panel_id} panel={panel} onWatch={onWatch} />;
        }
      })}
    </div>
  );
}
