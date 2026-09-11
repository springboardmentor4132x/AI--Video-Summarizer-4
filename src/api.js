const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const hasApi = Boolean(API_URL);
export const VIDEO_MAX_SIZE = 500 * 1024 * 1024;
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
export const PROCESSING_STATUSES = {
  NOT_STARTED: "NOT_STARTED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

export function normalizeStatus(status) {
  const normalized = String(status || "").trim().toUpperCase().replace(/[- ]/g, "_");
  if (["COMPLETED", "DONE", "SUCCESS"].includes(normalized)) return PROCESSING_STATUSES.COMPLETED;
  if (["FAILED", "ERROR"].includes(normalized)) return PROCESSING_STATUSES.FAILED;
  if (["PROCESSING", "IN_PROGRESS", "GENERATING", "STARTED"].includes(normalized)) return PROCESSING_STATUSES.PROCESSING;
  return PROCESSING_STATUSES.NOT_STARTED;
}

export function validateVideo(file) {
  if (!file) return "Please select a video.";
  const extension = `.${file.name.split(".").pop().toLowerCase()}`;
  if (!VIDEO_EXTENSIONS.includes(extension)) {
    return "Unsupported video format. Use MP4, MOV, AVI, MKV, WEBM, or M4V.";
  }
  if (file.size > VIDEO_MAX_SIZE) return "Video is too large. The maximum size is 500 MB.";
  return "";
}

function responseMessage(data, fallback) {
  return typeof data === "object" && data && (data.message || data.error)
    ? data.message || data.error
    : fallback;
}

export async function apiRequest(path, options = {}) {
  if (!API_URL) {
    throw new Error("API is not configured. Set VITE_API_URL to enable backend integration.");
  }

  const token = localStorage.getItem("authToken");
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(responseMessage(data, "The request could not be completed."));
  }

  return data;
}

export function postJson(path, body) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uploadFile(path, file, onProgress) {
  if (!API_URL) {
    return Promise.reject(new Error("API is not configured. Set VITE_API_URL to enable backend integration."));
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}${path}`);
    request.setRequestHeader("Accept", "application/json");

    const token = localStorage.getItem("authToken");
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.onload = () => {
      let data;
      try { data = request.responseText ? JSON.parse(request.responseText) : {}; } catch { data = {}; }
      if (request.status >= 200 && request.status < 300) resolve(data);
      else reject(new Error(responseMessage(data, "The video could not be uploaded.")));
    };

    const formData = new FormData();
    formData.append("video", file);
    request.send(formData);
  });
}
