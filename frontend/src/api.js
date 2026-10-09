/**
 * ClipMind AI — centralized frontend API client.
 *
 * This replaces every page's own `fetch("http://127.0.0.1:8000/...")` call.
 * It is written against the CANONICAL backend contract, verified directly
 * from app/api/routes/*.py on the tejashwinigm branch (which main also
 * matches):
 *
 *   POST /api/auth/register        JSON  { name, email, password, role }
 *   POST /api/auth/login           FORM  username=<email>&password=<pw>   -> { access_token, token_type }
 *   GET  /api/users/me             Bearer
 *   POST /api/videos/upload        Bearer, multipart FormData: file=<video>
 *   GET  /api/videos/history       Bearer
 *   GET  /api/videos/{id}/status   Bearer
 *   GET  /api/videos/{id}/transcript   Bearer
 *   POST /api/videos/{id}/summary      Bearer
 *   POST /api/videos/{id}/key-moments  Bearer
 *   POST /api/videos/{id}/highlights   Bearer
 *   POST /api/videos/{id}/keywords     Bearer
 *   GET  /api/analytics/videos/{id}    Bearer
 *   GET  /api/analytics/dashboard      Bearer
 *   GET  /api/analytics/content-insights  Bearer
 *   GET  /api/analytics/usage-report      Bearer
 *
 * NOTE: Harika's branch as uploaded calls things like
 * /transcripts/{id}, /analytics/stats/overview, /key-moments/{id},
 * /users/login — none of those routes exist on this backend. Every page
 * must be rewired to the paths above via this client.
 */

// Configurable via VITE_API_BASE_URL (see .env.example) so a
// production build can point at a real backend host instead of
// localhost. Falls back to the local dev backend when unset.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getToken() {
  return localStorage.getItem("authToken");
}

function setToken(token) {
  localStorage.setItem("authToken", token);
}

function clearAuth() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
}

function isAuthed() {
  return Boolean(getToken());
}

/**
 * Core request helper.
 * - Adds Authorization: Bearer <token> automatically when a token exists.
 * - Handles JSON and FormData bodies.
 * - Throws a normal Error with a useful message on non-2xx responses.
 * - Clears auth and redirects to /login on 401 (unless `skipAuthRedirect`).
 */
async function request(path, { method = "GET", body, isForm = false, skipAuthRedirect = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let finalBody = body;
  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: finalBody,
    });
  } catch {
    throw new Error("Unable to reach the ClipMind AI backend. Is the server running?");
  }

  if (response.status === 401) {
    clearAuth();
    if (!skipAuthRedirect && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${response.status})`;
    const error = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    error.status = response.status; // lets callers tell "not found yet" from real failures
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function register({ name, email, password, role = "learner" }) {
  return request("/auth/register", {
    method: "POST",
    body: { name, email, password, role },
  });
}

async function login({ email, password }) {
  // Backend expects OAuth2PasswordRequestForm -> x-www-form-urlencoded,
  // with "username" holding the email.
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = (data && data.detail) || "Login failed.";
    throw new Error(typeof detail === "string" ? detail : "Login failed.");
  }

  setToken(data.access_token);
  return data;
}

function logout() {
  clearAuth();
}

async function getCurrentUser() {
  return request("/users/me");
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/videos/upload", { method: "POST", body: formData, isForm: true });
}

async function getHistory() {
  return request("/videos/history");
}

async function getVideoStatus(videoId) {
  return request(`/videos/${videoId}/status`);
}

async function getTranscript(videoId) {
  return request(`/videos/${videoId}/transcript`);
}

async function generateSummary(videoId) {
  return request(`/videos/${videoId}/summary`, { method: "POST" });
}

async function generateKeyMoments(videoId) {
  return request(`/videos/${videoId}/key-moments`, { method: "POST" });
}

async function generateHighlights(videoId) {
  return request(`/videos/${videoId}/highlights`, { method: "POST" });
}

async function generateKeywords(videoId) {
  return request(`/videos/${videoId}/keywords`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Analytics / Content Insights / Usage Reports
// ---------------------------------------------------------------------------

async function getVideoAnalytics(videoId) {
  return request(`/analytics/videos/${videoId}`);
}

async function getDashboardAnalytics() {
  return request("/analytics/dashboard");
}

async function getContentInsights() {
  return request("/analytics/content-insights");
}

async function getUsageReport() {
  return request("/analytics/usage-report");
}

// ---------------------------------------------------------------------------
// Post-Milestone-3: video playback, translation, chapters, Q&A, PDF export
// ---------------------------------------------------------------------------

// Supported translation languages -- keep in sync with the backend's
// translation_service.SUPPORTED_LANGUAGES.
export const SUPPORTED_LANGUAGES = {
  te: "Telugu",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
};

/**
 * Fetch the raw video file as a blob URL, since a plain <video src="...">
 * can't attach an Authorization header. Caller is responsible for
 * revoking the returned URL (URL.revokeObjectURL) when done with it.
 */
async function getVideoFileUrl(videoId) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Unable to load the video file.");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function translateSummary(videoId, language) {
  return request(`/videos/${videoId}/translate`, {
    method: "POST",
    body: { language },
  });
}

async function generateChapters(videoId) {
  return request(`/videos/${videoId}/chapters`, { method: "POST" });
}

async function askAboutVideo(videoId, question) {
  return request(`/videos/${videoId}/ask`, {
    method: "POST",
    body: { question },
  });
}

/**
 * Download the PDF report as a blob URL (same auth-header reasoning as
 * getVideoFileUrl). Caller triggers the download and then revokes the URL.
 */
async function exportPdf(videoId, language) {
  const token = getToken();
  const query = language && language !== "en" ? `?language=${language}` : "";
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/export-pdf${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error((data && data.detail) || "PDF export failed.");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

async function createBookmark(videoId, timestamp, note = "") {
  return request("/bookmarks", {
    method: "POST",
    body: { video_id: videoId, timestamp, note },
  });
}

async function getBookmarks(videoId) {
  return request(`/bookmarks/video/${videoId}`);
}

async function updateBookmark(bookmarkId, note) {
  return request(`/bookmarks/${bookmarkId}`, {
    method: "PATCH",
    body: { note },
  });
}

async function deleteBookmark(bookmarkId) {
  return request(`/bookmarks/${bookmarkId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

async function createClip(videoId, start, end) {
  return request("/clips", {
    method: "POST",
    body: { video_id: videoId, start, end },
  });
}

/** Download a generated clip as a blob URL (auth header reasoning as above). */
async function downloadClip(clipId) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/clips/${clipId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error((data && data.detail) || "Clip download failed.");
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------------------
// ClipMind Story (video -> comic / storybook / study notes / storyboard)
// ---------------------------------------------------------------------------

export const STORY_MODES = ["comic", "storybook", "study_notes", "storyboard"];

async function generateStory(videoId, mode) {
  return request(`/story/generate/${videoId}`, { method: "POST", body: { mode } });
}

/** Saved story for one mode. Rejects with err.status === 404 when none exists yet. */
async function getStory(videoId, mode) {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  return request(`/story/${videoId}${query}`);
}

async function getStoryPanels(videoId, mode) {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  return request(`/story/${videoId}/panels${query}`);
}

async function deleteStory(videoId, mode) {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";
  return request(`/story/${videoId}${query}`, { method: "DELETE" });
}

/**
 * Panel frame images are auth-protected, and <img src> can't send an
 * Authorization header -- so (like the video file) they are fetched as a
 * blob. `frameUrl` is the server-absolute path from the API
 * (e.g. /api/story/<id>/frames/comic/panel_01_ab12cd34.jpg). Caller must
 * URL.revokeObjectURL() the result.
 */
async function getStoryFrameUrl(frameUrl) {
  const token = getToken();
  const url = new URL(frameUrl, new URL(API_BASE_URL, window.location.origin));
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Unable to load this frame.");
  }
  return URL.createObjectURL(await response.blob());
}

// ---------------------------------------------------------------------------
// Learning insights: Video DNA, 5-Minute Revision, I Don't Understand
// (Evidence Lens uses askAboutVideo -> POST /videos/{id}/ask, which returns evidence)
// ---------------------------------------------------------------------------

async function getVideoDna(videoId) {
  return request(`/video-dna/${videoId}`);
}

async function getRevision(videoIds) {
  return request("/learn/revision", { method: "POST", body: { video_ids: videoIds } });
}

async function explainMoment(videoId, timestamp) {
  return request(`/learn/${videoId}/explain`, { method: "POST", body: { timestamp } });
}

// ---------------------------------------------------------------------------
// Adaptive Memory Deck (Amrita)
// ---------------------------------------------------------------------------

async function getMemoryCards(dueOnly = true) {
  return request(`/memory-deck?due_only=${dueOnly}`);
}
async function generateMemoryCards(videoId) {
  return request(`/memory-deck/videos/${videoId}/generate`, { method: "POST" });
}
async function reviewMemoryCard(cardId, strength) {
  return request(`/memory-deck/${cardId}/review`, { method: "POST", body: { strength } });
}
async function explainMemoryCard(cardId, explanation) {
  return request(`/memory-deck/${cardId}/explain`, { method: "POST", body: { explanation } });
}

// ---------------------------------------------------------------------------
// Real-Time Video Workspace / live summaries (Amrita)
// ---------------------------------------------------------------------------

async function startLiveSummary(url) {
  return request("/live-summaries", { method: "POST", body: { url } });
}
async function getLiveSummary(sessionId) {
  return request(`/live-summaries/${sessionId}`);
}
async function stopLiveSummary(sessionId) {
  return request(`/live-summaries/${sessionId}/stop`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Time Machine, Daily, Version Comparison, playback activity
// ---------------------------------------------------------------------------

async function searchHistory(q) {
  return request(`/timemachine/search?q=${encodeURIComponent(q)}`);
}
async function getTopicEvolution() {
  return request("/timemachine/topics");
}

async function generateDaily(minutes, date) {
  return request("/daily/generate", { method: "POST", body: { minutes, date } });
}
async function getDailyToday(date) {
  return request(`/daily/today?date=${encodeURIComponent(date)}`);
}
async function getDailyHistory() {
  return request("/daily/history");
}
async function startDaily(planId) {
  return request(`/daily/${planId}/start`, { method: "POST" });
}
async function setDailyItem(planId, itemId, completed) {
  return request(`/daily/${planId}/items/${itemId}`, { method: "PATCH", body: { completed } });
}

async function createComparison(oldVideoId, newVideoId) {
  return request("/compare", { method: "POST", body: { old_video_id: oldVideoId, new_video_id: newVideoId } });
}
async function getComparison(id) {
  return request(`/compare/${id}`);
}
async function listComparisons() {
  return request("/compare");
}
async function deleteComparison(id) {
  return request(`/compare/${id}`, { method: "DELETE" });
}

async function recordActivity(videoId, { position, duration, opened = false }) {
  return request(`/activity/${videoId}`, { method: "PUT", body: { position, duration, opened } });
}

export const api = {
  isAuthed,
  getToken,
  register,
  login,
  logout,
  getCurrentUser,
  uploadVideo,
  getHistory,
  getVideoStatus,
  getTranscript,
  generateSummary,
  generateKeyMoments,
  generateHighlights,
  generateKeywords,
  getVideoAnalytics,
  getDashboardAnalytics,
  getContentInsights,
  getUsageReport,
  getVideoFileUrl,
  translateSummary,
  generateChapters,
  askAboutVideo,
  exportPdf,
  createBookmark,
  getBookmarks,
  updateBookmark,
  deleteBookmark,
  createClip,
  downloadClip,
  generateStory,
  getStory,
  getStoryPanels,
  deleteStory,
  getStoryFrameUrl,
  getVideoDna,
  getRevision,
  explainMoment,
  getMemoryCards,
  generateMemoryCards,
  reviewMemoryCard,
  explainMemoryCard,
  startLiveSummary,
  getLiveSummary,
  stopLiveSummary,
  searchHistory,
  getTopicEvolution,
  generateDaily,
  getDailyToday,
  getDailyHistory,
  startDaily,
  setDailyItem,
  createComparison,
  getComparison,
  listComparisons,
  deleteComparison,
  recordActivity,
};

export default api;
