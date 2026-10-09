import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../api", () => ({
  default: {
    isAuthed: vi.fn(() => true),
    getVideoFileUrl: vi.fn(() => Promise.resolve("blob:video")),
    getVideoStatus: vi.fn(),
    getVideoAnalytics: vi.fn(() => Promise.resolve(null)),
    getBookmarks: vi.fn(() => Promise.resolve([])),
  },
  SUPPORTED_LANGUAGES: { te: "Telugu" },
}));

import api from "../api";
import VideoPlayer from "../components/VideoPlayer";
import Results from "../pages/Results";

const DONE = {
  id: "vid1", filename: "lecture.mp4", status: "done", error_message: "",
  transcript_segments: [], key_moments: [], highlights: [], keywords: [], chapters: [],
  translations: {}, short_summary: "", summary: "", transcript: "",
};

async function loadedVideo() {
  const el = await waitFor(() => {
    const v = document.querySelector("video");
    expect(v).toBeTruthy();
    return v;
  });
  Object.defineProperty(el, "duration", { value: 600, configurable: true });
  let time = 0;
  Object.defineProperty(el, "currentTime", { get: () => time, set: (v) => { time = v; }, configurable: true });
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthed.mockReturnValue(true);
  api.getVideoFileUrl.mockResolvedValue("blob:video");
  api.getVideoStatus.mockResolvedValue(DONE);
});

describe("VideoPlayer startAt", () => {
  it("seeks to startAt once metadata loads, then plays and scrolls into view", async () => {
    render(<VideoPlayer videoId="vid1" startAt={134} />);
    const el = await loadedVideo();
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(134);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("never seeks past the end of the video", async () => {
    render(<VideoPlayer videoId="vid1" startAt={99999} />);
    const el = await loadedVideo();
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(600);
  });

  it("leaves the video at the start when no startAt is given", async () => {
    render(<VideoPlayer videoId="vid1" />);
    const el = await loadedVideo();
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(0);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});

describe("/video/:videoId?t= deep link (Results page)", () => {
  const open = (url) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/video/:videoId" element={<Results />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </MemoryRouter>
    );

  it("loads the video from the URL and seeks to ?t=", async () => {
    open("/video/vid1?t=134");
    const el = await loadedVideo();
    expect(api.getVideoStatus).toHaveBeenCalledWith("vid1");
    expect(api.getVideoFileUrl).toHaveBeenCalledWith("vid1");
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(134);
    expect(localStorage.getItem("currentVideoId")).toBe("vid1"); // rest of the app follows
  });

  it("shows the ClipMind Story entry card for processed videos", async () => {
    open("/video/vid1");
    expect(await screen.findByRole("button", { name: "Open ClipMind Story" })).toBeInTheDocument();
  });

  it("hides the Story card until processing is done", async () => {
    api.getVideoStatus.mockResolvedValue({ ...DONE, status: "processing" });
    open("/video/vid1");
    await screen.findByText("lecture.mp4");
    expect(screen.queryByRole("button", { name: "Open ClipMind Story" })).not.toBeInTheDocument();
  });

  it("legacy /results still uses the stored current video and does not seek", async () => {
    localStorage.setItem("currentVideoId", "vid1");
    open("/results");
    const el = await loadedVideo();
    fireEvent.loadedMetadata(el);
    expect(api.getVideoStatus).toHaveBeenCalledWith("vid1");
    expect(el.currentTime).toBe(0);
  });

  it("ignores a junk ?t= value", async () => {
    open("/video/vid1?t=abc");
    const el = await loadedVideo();
    fireEvent.loadedMetadata(el);
    expect(el.currentTime).toBe(0);
  });
});
