import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { STORY_MODES } from "../api";
import StoryPanelsView from "../components/StoryPanels";

// ClipMind Story: turns a processed video into a visual story. The page
// only ever shows what the backend generated from THIS video's transcript
// and real extracted frames (see backend/app/services/story_service.py).
//
// Route: /story/:videoId (or /story, which uses the same "current video"
// the rest of the app already tracks in localStorage).

const MODE_INFO = {
  comic: { label: "Comic", icon: "💬", blurb: "Speech-bubble panels, one moment each" },
  storybook: { label: "Storybook", icon: "📖", blurb: "Illustrated pages with narration" },
  study_notes: { label: "Study Notes", icon: "📝", blurb: "Concepts and transcript excerpts" },
  storyboard: { label: "Storyboard", icon: "🎞️", blurb: "Frames with timecodes and shot lengths" },
};

const LOADING_STEPS = [
  "Analyzing video...",
  "Finding important moments...",
  "Creating story panels...",
  "Preparing visual story...",
];

const MODE_KEY = "clipmind-story-mode";

function initialMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return STORY_MODES.includes(saved) ? saved : "comic";
  } catch {
    return "comic";
  }
}

export default function Story() {
  const navigate = useNavigate();
  const { videoId: routeVideoId } = useParams();
  const videoId = routeVideoId || localStorage.getItem("currentVideoId");

  const [video, setVideo] = useState(null);
  const [videoState, setVideoState] = useState(videoId ? "loading" : "none"); // loading | ready | notfound | error | none
  const [videoError, setVideoError] = useState("");

  const [mode, setMode] = useState(initialMode);
  // The saved story for ONE (video, mode) pair. `key` says which pair the
  // result belongs to, so switching mode shows "loading" until the matching
  // result arrives -- no stale story, and no state resets inside effects.
  const [loaded, setLoaded] = useState({ key: null, story: null, error: "" });

  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [actionError, setActionError] = useState(""); // generate/delete failures
  const timerRef = useRef(null);

  // ---- load the video this story belongs to --------------------------
  useEffect(() => {
    if (!api.isAuthed()) {
      navigate("/login");
      return undefined;
    }
    if (!videoId) return undefined;

    if (routeVideoId) localStorage.setItem("currentVideoId", routeVideoId);

    let cancelled = false;
    api
      .getVideoStatus(videoId)
      .then((data) => {
        if (cancelled) return;
        setVideo(data);
        setVideoState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setVideoError(err.message || "Unable to load this video.");
        setVideoState(err.status === 404 ? "notfound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, routeVideoId, navigate]);

  const processed = videoState === "ready" && video?.status === "done";
  const hasTranscript = Boolean(video?.transcript_segments?.length);
  const canGenerate = processed && hasTranscript;

  // ---- load the saved story for the selected mode ---------------------
  const storyKey = `${videoId}:${mode}`;
  const storyLoading = canGenerate && loaded.key !== storyKey;
  const story = loaded.key === storyKey ? loaded.story : null;
  const error = actionError || (loaded.key === storyKey ? loaded.error : "");

  useEffect(() => {
    if (!canGenerate) return undefined;
    let cancelled = false;

    api
      .getStory(videoId, mode)
      .then((data) => {
        if (!cancelled) setLoaded({ key: storyKey, story: data, error: "" });
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 just means "not generated yet" -- anything else is a real problem.
        setLoaded({
          key: storyKey,
          story: null,
          error: err.status === 404 ? "" : err.message || "Unable to load the saved story.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, mode, canGenerate, storyKey]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const selectMode = (next) => {
    if (generating || next === mode) return;
    setActionError("");
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Not persisted -- the selection still works for this visit.
    }
  };

  const handleModeKeyDown = (e) => {
    const index = STORY_MODES.indexOf(mode);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectMode(STORY_MODES[(index + 1) % STORY_MODES.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectMode(STORY_MODES[(index - 1 + STORY_MODES.length) % STORY_MODES.length]);
    }
  };

  const handleGenerate = async () => {
    setActionError("");
    setGenerating(true);
    setStep(0);
    // Generation is one request; these stages just tell the user where the
    // work is while they wait (analysis -> moments -> panels -> frames).
    timerRef.current = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      1800
    );
    try {
      const data = await api.generateStory(videoId, mode);
      setLoaded({ key: storyKey, story: data, error: "" });
    } catch (err) {
      setActionError(err.message || "Story generation failed. Please try again.");
    } finally {
      clearInterval(timerRef.current);
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${MODE_INFO[mode].label} story? You can generate it again any time.`)) {
      return;
    }
    setActionError("");
    try {
      await api.deleteStory(videoId, mode);
      setLoaded({ key: storyKey, story: null, error: "" });
    } catch (err) {
      setActionError(err.message || "Unable to delete the story.");
    }
  };

  // "Watch This Moment": open the original video at the panel's timestamp.
  // /video/:id?t=SECONDS is read by the video page, which seeks its player.
  const handleWatch = (panel) => {
    navigate(`/video/${videoId}?t=${Math.floor(panel.timestamp)}`);
  };

  // ------------------------------------------------------------ states
  if (videoState === "none") {
    return (
      <div className="page-state">
        <p>No video selected yet.</p>
        <button type="button" onClick={() => navigate("/history")}>
          Choose a video
        </button>
      </div>
    );
  }
  if (videoState === "loading") return <div className="page-state">Loading video...</div>;
  if (videoState === "notfound") {
    return (
      <div className="page-state error">
        <p>We couldn't find that video. It may have been removed, or it belongs to another account.</p>
        <button type="button" onClick={() => navigate("/history")}>
          Back to your videos
        </button>
      </div>
    );
  }
  if (videoState === "error") {
    return (
      <div className="page-state error">
        <p>{videoError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  const modeLabel = MODE_INFO[mode].label;

  return (
    <div className="story-page">
      <header className="story-header">
        <div>
          <h2>ClipMind Story</h2>
          <p className="story-tagline">Turn this video into an interactive visual story.</p>
        </div>
        <p className="story-video-name">
          <span>{video.filename}</span>
          <Link to={`/video/${videoId}`}>Open video</Link>
        </p>
      </header>

      {video.status === "failed" && (
        <div className="page-state error">
          <p>This video failed to process, so a story can't be created from it.</p>
          <button type="button" onClick={() => navigate("/history")}>
            Back to your videos
          </button>
        </div>
      )}

      {video.status !== "done" && video.status !== "failed" && (
        <div className="page-state">
          <p>This video is still being processed. Come back once processing is complete.</p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("currentVideoId", videoId);
              navigate("/processing");
            }}
          >
            View processing status
          </button>
        </div>
      )}

      {processed && !hasTranscript && (
        <div className="page-state error">
          <p>This video has no timestamped transcript, so there's nothing to build a story from.</p>
        </div>
      )}

      {canGenerate && (
        <>
          <div
            className="story-modes"
            role="radiogroup"
            aria-label="Story mode"
            onKeyDown={handleModeKeyDown}
          >
            {STORY_MODES.map((m) => {
              const selected = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  disabled={generating}
                  className={"story-mode" + (selected ? " selected" : "")}
                  onClick={() => selectMode(m)}
                >
                  <span className="story-mode-icon" aria-hidden="true">
                    {MODE_INFO[m].icon}
                  </span>
                  <span className="story-mode-label">
                    {MODE_INFO[m].label}
                    {selected && <span className="story-mode-check"> ✓</span>}
                  </span>
                  <span className="story-mode-blurb">{MODE_INFO[m].blurb}</span>
                </button>
              );
            })}
          </div>

          <div className="story-actions">
            <button
              type="button"
              className="story-generate"
              onClick={handleGenerate}
              disabled={generating || storyLoading}
            >
              {generating ? "Generating..." : story ? "Regenerate Story" : "Generate Story"}
            </button>
            {story && !generating && (
              <button type="button" className="story-delete" onClick={handleDelete}>
                Delete {modeLabel} story
              </button>
            )}
            {story && !generating && (
              <span className="story-count">
                {story.panels.length} panels, generated {new Date(story.updated_at).toLocaleString()}
              </span>
            )}
          </div>

          {error && (
            <div className="page-state error" role="alert">
              <p>{error}</p>
              {!generating && (
                <button type="button" onClick={handleGenerate}>
                  Try again
                </button>
              )}
            </div>
          )}

          {generating && (
            <div className="story-loading" role="status" aria-live="polite">
              <div className="story-spinner" aria-hidden="true" />
              <p className="story-loading-now">{LOADING_STEPS[step]}</p>
              <ol className="story-steps">
                {LOADING_STEPS.map((label, i) => (
                  <li key={label} className={i < step ? "done" : i === step ? "active" : ""}>
                    {label.replace("...", "")}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!generating && storyLoading && <div className="page-state">Loading saved story...</div>}

          {!generating && !storyLoading && !story && !error && (
            <div className="page-state">
              <p>
                No {modeLabel} story yet. Choose Generate Story to build one from this video's
                transcript and frames.
              </p>
            </div>
          )}

          {!generating && story && (
            <>
              {story.warnings?.map((w) => (
                <p key={w} className="story-warning" role="status">
                  {w}
                </p>
              ))}
              <StoryPanelsView mode={story.mode} panels={story.panels} onWatch={handleWatch} />
            </>
          )}
        </>
      )}
    </div>
  );
}
