import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api, { SUPPORTED_LANGUAGES } from "../api";
import VideoPlayer from "../components/VideoPlayer";
import ExplainPanel from "../components/ExplainPanel";
import EvidenceAnswer from "../components/EvidenceAnswer";

// This replaces the previous ~1950-line Results.jsx (see prior audit
// notes for the full list of what was wrong with it). This version adds
// the post-Milestone-3 P0 features on top of the already-fixed data
// layer: a real video player (didn't exist anywhere in the app before
// this), auto-generated chapters, multilingual summary translation,
// transcript-grounded Q&A, and real PDF export -- all wired to the
// backend routes added in this pass, all reusing the same VideoOut
// object and api.js client as everything else.

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Native <details>/<summary> gives collapsible sections for free --
// keyboard-accessible and screen-reader-friendly by default, no extra
// JS state needed. defaultOpen keeps the most important sections
// (video, summary) expanded on first load; the rest start open too
// since users generally want to scan everything on first visit, but
// can now collapse what they don't need.
function Section({ title, children, defaultOpen = true }) {
  return (
    <details className="results-section" open={defaultOpen}>
      <summary className="results-section-title">{title}</summary>
      <div className="results-section-body">{children}</div>
    </details>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chapters
  const [generatingChapters, setGeneratingChapters] = useState(false);
  const [chaptersError, setChaptersError] = useState("");

  // Multilingual summary
  const [language, setLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  // Ask about this video
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]); // {question, answer, timestamps}[]
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  // PDF export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Transcript search (client-side, over already-fetched segments -- no AI call)
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("auto");
  const [retranscribing, setRetranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");

  // Bookmarks
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const [bookmarkNoteDraft, setBookmarkNoteDraft] = useState("");
  const [addingBookmark, setAddingBookmark] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [editNoteDraft, setEditNoteDraft] = useState("");
  const [bookmarkError, setBookmarkError] = useState("");

  // Create Clip
  const [clipMoment, setClipMoment] = useState(null); // {start_time, end_time} of the moment being clipped
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [creatingClip, setCreatingClip] = useState(false);
  const [clipError, setClipError] = useState("");
  const [generatedClip, setGeneratedClip] = useState(null);

  // Which video: /video/:videoId, else ?video=<id>, else the app's usual
  // "current video" in localStorage (so every existing link keeps working).
  const { videoId: routeVideoId } = useParams();
  const [searchParams] = useSearchParams();
  const videoId =
    routeVideoId ||
    searchParams.get("video") ||
    (typeof window !== "undefined" ? localStorage.getItem("currentVideoId") : null);

  // ?t=SECONDS: open the player at that moment (used by ClipMind Story).
  const tParam = Number(searchParams.get("t"));
  const startAt = Number.isFinite(tParam) && tParam > 0 ? tParam : null;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      // Keep the rest of the app (Summary, Transcript, ...) pointed at this video.
      if (videoId) localStorage.setItem("currentVideoId", videoId);

      if (!api.isAuthed()) {
        navigate("/login");
        return;
      }

      if (!videoId) {
        setLoading(false);
        return;
      }

      try {
        const videoData = await api.getVideoStatus(videoId);
        setVideo(videoData);
        setTranscriptionLanguage(videoData.transcription_language || "auto");

        const analyticsData = await api.getVideoAnalytics(videoId).catch(() => null);
        setAnalytics(analyticsData);
      } catch (err) {
        setError(err.message || "Unable to load results.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!videoId || video?.status !== "processing") return undefined;
    const poll = setInterval(async () => {
      try {
        setVideo(await api.getVideoStatus(videoId));
      } catch (err) {
        setTranscriptionError(err.message || "Unable to refresh video processing status.");
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [video?.status, videoId]);

  const handleRetranscribe = async () => {
    setRetranscribing(true);
    setTranscriptionError("");
    try {
      setVideo(await api.retranscribeVideo(videoId, transcriptionLanguage));
    } catch (err) {
      setTranscriptionError(err.message || "Unable to restart transcription.");
    } finally {
      setRetranscribing(false);
    }
  };

  // Remember where the viewer is (feeds ClipMind Daily's "continue watching").
  // Sent when the page opens, every 15s, and when the page is left.
  const watchable = Boolean(video && video.status === "done");
  useEffect(() => {
    if (!videoId || !watchable) return undefined;
    const report = (opened = false) => {
      const player = playerRef.current;
      if (!player) return;
      api
        .recordActivity(videoId, { position: player.getCurrentTime(), duration: player.getDuration(), opened })
        .catch(() => {
          // Tracking is best-effort; never interrupt watching.
        });
    };
    const first = setTimeout(() => report(true), 2500);
    const every = setInterval(() => report(false), 15000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      report(false);
    };
  }, [videoId, watchable]);

  const seekTo = (seconds) => {
    if (playerRef.current) playerRef.current.seekTo(seconds);
  };

  const handleGenerateChapters = async () => {
    setGeneratingChapters(true);
    setChaptersError("");
    try {
      const data = await api.generateChapters(videoId);
      setVideo(data);
    } catch (err) {
      setChaptersError(err.message || "Chapter generation failed.");
    } finally {
      setGeneratingChapters(false);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    setLanguage(newLanguage);
    setTranslateError("");

    if (newLanguage === "en") return; // English is always available already

    // Cache hit: already translated, no API call needed.
    if (video?.translations?.[newLanguage]) return;

    setTranslating(true);
    try {
      const data = await api.translateSummary(videoId, newLanguage);
      setVideo(data);
    } catch (err) {
      setTranslateError(err.message || "Translation failed.");
      setLanguage("en");
    } finally {
      setTranslating(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const askedQuestion = question.trim();
    setAsking(true);
    setAskError("");
    try {
      const data = await api.askAboutVideo(videoId, askedQuestion);
      setConversation((prev) => [
        ...prev,
        {
          question: askedQuestion,
          answer: data.answer,
          timestamps: data.relevant_timestamps || [],
          evidence: data.evidence || [],
          insufficient: data.insufficient_info,
        },
      ]);
      setQuestion("");
    } catch (err) {
      setAskError(err.message || "Unable to answer that right now.");
    } finally {
      setAsking(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    setExportError("");
    try {
      const url = await api.exportPdf(videoId, language);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${video.filename}_report.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setExportError(err.message || "PDF export failed.");
    } finally {
      setExporting(false);
    }
  };

  // Load bookmarks once the video itself has loaded.
  useEffect(() => {
    if (!video || bookmarksLoaded) return;
    (async () => {
      try {
        const data = await api.getBookmarks(videoId);
        setBookmarks(data);
      } catch (err) {
        setBookmarkError(err.message || "Unable to load bookmarks.");
      } finally {
        setBookmarksLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, bookmarksLoaded]);

  const handleAddBookmark = async () => {
    setAddingBookmark(true);
    setBookmarkError("");
    try {
      const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;
      const created = await api.createBookmark(videoId, currentTime, bookmarkNoteDraft.trim());
      setBookmarks((prev) => [...prev, created].sort((a, b) => a.timestamp - b.timestamp));
      setBookmarkNoteDraft("");
    } catch (err) {
      setBookmarkError(err.message || "Unable to add bookmark.");
    } finally {
      setAddingBookmark(false);
    }
  };

  const handleSaveBookmarkNote = async (bookmarkId) => {
    try {
      const updated = await api.updateBookmark(bookmarkId, editNoteDraft);
      setBookmarks((prev) => prev.map((b) => (b.id === bookmarkId ? updated : b)));
      setEditingBookmarkId(null);
    } catch (err) {
      setBookmarkError(err.message || "Unable to update bookmark.");
    }
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await api.deleteBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      setBookmarkError(err.message || "Unable to delete bookmark.");
    }
  };

  const openClipEditor = (moment) => {
    setClipMoment(moment);
    setClipStart(moment.start_time);
    setClipEnd(moment.end_time);
    setClipError("");
    setGeneratedClip(null);
  };

  const handleGenerateClip = async () => {
    setCreatingClip(true);
    setClipError("");
    try {
      const clip = await api.createClip(videoId, Number(clipStart), Number(clipEnd));
      setGeneratedClip(clip);
    } catch (err) {
      setClipError(err.message || "Clip generation failed.");
    } finally {
      setCreatingClip(false);
    }
  };

  const handleDownloadClip = async () => {
    if (!generatedClip) return;
    try {
      const url = await api.downloadClip(generatedClip.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = generatedClip.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setClipError(err.message || "Clip download failed.");
    }
  };

  if (loading) return <div className="page-state">Loading results...</div>;
  if (error) return <div className="page-state error">{error}</div>;

  if (!video) {
    return (
      <div className="page-state">
        No video selected yet.{" "}
        <button onClick={() => navigate("/upload")}>Upload a video</button>
      </div>
    );
  }

  const segments = video.transcript_segments || [];
  const keyMoments = video.key_moments || [];
  const highlights = video.highlights || [];
  const keywords = video.keywords || [];
  const chapters = video.chapters || [];

  const trimmedQuery = transcriptQuery.trim().toLowerCase();
  const filteredSegments = trimmedQuery
    ? segments.filter((seg) => seg.text.toLowerCase().includes(trimmedQuery))
    : segments;

  const displayShortSummary =
    language !== "en" ? video.translations?.[language]?.short : video.short_summary;
  const displayDetailedSummary =
    language !== "en" ? video.translations?.[language]?.detailed : video.summary;

  return (
    <div className="results-page">
      <header className="results-header">
        <h2>{video.filename}</h2>
        <span className="status-badge">{video.status}</span>
        {video.status === "processing" && (
          <button onClick={() => navigate("/processing")}>View processing status</button>
        )}
      </header>

      {video.error_message && (
        <div className="page-state error">{video.error_message}</div>
      )}

      {video.status === "done" && (
        <div className="story-promo">
          <div>
            <strong>ClipMind Story</strong>
            <p>Turn this video into a comic, storybook, study notes or storyboard. Every panel jumps back to its moment.</p>
          </div>
          <div className="story-promo-actions">
            <button type="button" onClick={() => navigate(`/story/${videoId}`)}>
              Open ClipMind Story
            </button>
            <button type="button" onClick={() => navigate(`/video-dna/${videoId}`)}>
              Video DNA
            </button>
            <button type="button" onClick={() => navigate(`/evidence/${videoId}`)}>
              Evidence Lens
            </button>
            <button type="button" onClick={() => navigate(`/revision/${videoId}`)}>
              5-Minute Revision
            </button>
            <button type="button" onClick={() => navigate("/memory-deck")}>
              Memory Deck
            </button>
          </div>
        </div>
      )}

      <Section title="Video">
        <VideoPlayer ref={playerRef} videoId={videoId} startAt={startAt} />
        {segments.length > 0 && <ExplainPanel videoId={videoId} playerRef={playerRef} />}
      </Section>

      <Section title="Chapters">
        {chapters.length > 0 ? (
          <ol className="chapters-list">
            {chapters.map((c, i) => (
              <li key={i}>
                <button className="link-button" onClick={() => seekTo(c.start_time)}>
                  {formatTimestamp(c.start_time)} — {c.title}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="page-state">
            {keyMoments.length === 0
              ? "Chapters need key moments first -- not generated yet."
              : "Chapters not generated yet."}
            {chaptersError && <p className="error">{chaptersError}</p>}
            <button
              onClick={handleGenerateChapters}
              disabled={generatingChapters || keyMoments.length === 0}
            >
              {generatingChapters ? "Generating..." : "Generate chapters"}
            </button>
          </div>
        )}
      </Section>

      <Section title="Transcript">
        <div className="transcription-language-tools">
          <label htmlFor="video-transcription-language">
            Transcribe spoken language
            <select
              id="video-transcription-language"
              value={transcriptionLanguage}
              onChange={(event) => setTranscriptionLanguage(event.target.value)}
              disabled={video.status === "processing" || retranscribing}
            >
              <option value="auto">Auto-detect</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="en">English</option>
            </select>
          </label>
          {video.status !== "processing" && (
            <button
              type="button"
              onClick={handleRetranscribe}
              disabled={retranscribing}
            >
              {retranscribing ? "Starting transcription..." : "Re-transcribe video"}
            </button>
          )}
        </div>
        <p className="transcription-language-note">
          Hindi uses a more accurate model and writes in Devanagari. Re-transcribing replaces this transcript and its generated analysis; the original video is kept.
        </p>
        {video.status === "processing" && (
          <p className="page-state">
            Re-transcription is in progress ({video.current_stage}).
          </p>
        )}
        {transcriptionError && <p className="error">{transcriptionError}</p>}
        {segments.length > 0 && (
          <div className="transcript-search">
            <input
              type="text"
              value={transcriptQuery}
              onChange={(e) => setTranscriptQuery(e.target.value)}
              placeholder="Search transcript..."
              aria-label="Search transcript"
            />
            {transcriptQuery && (
              <button type="button" onClick={() => setTranscriptQuery("")}>
                Clear
              </button>
            )}
          </div>
        )}

        {segments.length > 0 ? (
          filteredSegments.length === 0 && transcriptQuery.trim() ? (
            <p className="page-state">No matches for "{transcriptQuery}".</p>
          ) : (
            <ul className="transcript-segments">
              {filteredSegments.map((seg, i) => (
                <li key={i}>
                  <button className="link-button timestamp" onClick={() => seekTo(seg.start_time)}>
                    {formatTimestamp(seg.start_time)} - {formatTimestamp(seg.end_time)}
                  </button>
                  <span
                    className="text"
                    lang={transcriptionLanguage === "hi" ? "hi" : undefined}
                    dir="auto"
                  >
                    {seg.text}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : video.transcript ? (
          <p>{video.transcript}</p>
        ) : (
          <p className="page-state">Transcript not available yet.</p>
        )}
      </Section>

      <Section title="Summary">
        <div className="language-selector">
          <label htmlFor="summary-language">Language: </label>
          <select
            id="summary-language"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={translating || !video.summary}
          >
            <option value="en">English</option>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          {translating && <span> Translating...</span>}
        </div>

        {translateError && <p className="page-state error">{translateError}</p>}

        {video.summary ? (
          <>
            {displayShortSummary && (
              <p className="short-summary"><strong>Overview:</strong> {displayShortSummary}</p>
            )}
            <p>{displayDetailedSummary || video.summary}</p>
          </>
        ) : (
          <p className="page-state">
            {video.error_message ? `Summary unavailable: ${video.error_message}` : "Summary not generated yet."}
          </p>
        )}

        <button onClick={handleExportPdf} disabled={exporting || !video.summary}>
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
        {exportError && <p className="page-state error">{exportError}</p>}
      </Section>

      <Section title="Ask about this video">
        {segments.length === 0 ? (
          <p className="page-state">Transcript not available yet -- nothing to ask about.</p>
        ) : (
          <>
            <div className="qa-conversation">
              {conversation.length === 0 && (
                <p className="page-state">Ask a question. You'll get an answer quoted from this video, plus the evidence behind it.</p>
              )}
              {conversation.map((turn, i) => (
                <div key={i} className="qa-turn">
                  <p><strong>You:</strong> {turn.question}</p>
                  <EvidenceAnswer turn={turn} onWatch={seekTo} />
                </div>
              ))}
            </div>

            {askError && <p className="page-state error">{askError}</p>}

            <form onSubmit={handleAsk} className="qa-form">
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
              {conversation.length > 0 && (
                <button type="button" onClick={() => setConversation([])}>
                  Clear conversation
                </button>
              )}
            </form>
          </>
        )}
      </Section>

      <Section title="Key Moments">
        {keyMoments.length > 0 ? (
          <ol className="key-moments-list">
            {keyMoments.map((m, i) => (
              <li key={i}>
                <button className="link-button timestamp" onClick={() => seekTo(m.start_time)}>
                  {formatTimestamp(m.start_time)} → {formatTimestamp(m.end_time)}
                </button>
                {m.label && <strong> {m.label}</strong>}
                <p>{m.text}</p>
                <span className="importance">Importance: {Math.round((m.importance || 0) * 100)}%</span>
                <button type="button" onClick={() => openClipEditor(m)}>Create Clip</button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="page-state">No key moments detected yet.</p>
        )}
      </Section>

      <Section title="Highlights">
        {highlights.length > 0 ? (
          <ol className="key-moments-list">
            {highlights.map((h, i) => (
              <li key={i}>
                <button className="link-button timestamp" onClick={() => seekTo(h.start_time)}>
                  {formatTimestamp(h.start_time)} → {formatTimestamp(h.end_time)}
                </button>
                {h.label && <strong> {h.label}</strong>}
                <p>{h.text}</p>
                <span className="importance">Importance: {Math.round((h.importance || 0) * 100)}%</span>
                <button type="button" onClick={() => openClipEditor(h)}>Create Clip</button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="page-state">No highlights generated yet.</p>
        )}
      </Section>

      {clipMoment && (
        <Section title="Create Clip">
          <label>
            Start (seconds):{" "}
            <input type="number" value={clipStart} min="0" step="0.1"
              onChange={(e) => setClipStart(e.target.value)} />
          </label>
          <label>
            End (seconds):{" "}
            <input type="number" value={clipEnd} min="0" step="0.1"
              onChange={(e) => setClipEnd(e.target.value)} />
          </label>
          <div>
            <button type="button" onClick={() => seekTo(Number(clipStart))}>Preview start</button>
            <button type="button" onClick={handleGenerateClip} disabled={creatingClip}>
              {creatingClip ? "Generating..." : "Generate Clip"}
            </button>
            <button type="button" onClick={() => setClipMoment(null)}>Cancel</button>
          </div>
          {clipError && <p className="page-state error">{clipError}</p>}
          {generatedClip && (
            <div>
              <p>Clip generated: {generatedClip.filename}</p>
              <button type="button" onClick={handleDownloadClip}>Download Clip</button>
            </div>
          )}
        </Section>
      )}

      <Section title="Bookmarks">
        {bookmarkError && <p className="page-state error">{bookmarkError}</p>}

        {bookmarksLoaded && bookmarks.length === 0 && (
          <p className="page-state">No bookmarks yet.</p>
        )}

        {bookmarks.length > 0 && (
          <ul className="bookmarks-list">
            {bookmarks.map((b) => (
              <li key={b.id}>
                <button className="link-button timestamp" onClick={() => seekTo(b.timestamp)}>
                  🔖 {formatTimestamp(b.timestamp)}
                </button>
                {editingBookmarkId === b.id ? (
                  <>
                    <input
                      type="text"
                      value={editNoteDraft}
                      onChange={(e) => setEditNoteDraft(e.target.value)}
                    />
                    <button type="button" onClick={() => handleSaveBookmarkNote(b.id)}>Save</button>
                    <button type="button" onClick={() => setEditingBookmarkId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span>{b.note}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBookmarkId(b.id);
                        setEditNoteDraft(b.note);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteBookmark(b.id)}>Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="add-bookmark">
          <input
            type="text"
            value={bookmarkNoteDraft}
            onChange={(e) => setBookmarkNoteDraft(e.target.value)}
            placeholder="Optional note for this moment..."
          />
          <button type="button" onClick={handleAddBookmark} disabled={addingBookmark}>
            {addingBookmark ? "Saving..." : "🔖 Add Bookmark at current time"}
          </button>
        </div>
      </Section>

      <Section title="Keywords">
        {keywords.length > 0 ? (
          <div className="keyword-cloud">
            {keywords.map((k, i) => (
              <span key={i} className="keyword-chip" title={`score: ${k.score}`}>
                #{k.word}
              </span>
            ))}
          </div>
        ) : (
          <p className="page-state">No keywords extracted yet.</p>
        )}
      </Section>

      {analytics && (
        <Section title="Analytics">
          <ul>
            <li>Transcript words: {analytics.transcript_word_count}</li>
            <li>Summary words: {analytics.summary_word_count}</li>
            <li>Key moments: {analytics.key_moments_count}</li>
            <li>Highlights: {analytics.highlights_count}</li>
            <li>Keywords: {analytics.keywords_count}</li>
          </ul>
        </Section>
      )}
    </div>
  );
}
