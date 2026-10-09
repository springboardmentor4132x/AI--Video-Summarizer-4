import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../api", () => ({
  STORY_MODES: ["comic", "storybook", "study_notes", "storyboard"],
  default: {
    isAuthed: vi.fn(() => true),
    getVideoStatus: vi.fn(),
    getStory: vi.fn(),
    generateStory: vi.fn(),
    deleteStory: vi.fn(),
    getStoryFrameUrl: vi.fn(() => Promise.resolve("blob:frame")),
  },
}));

import api from "../api";
import Story from "../pages/Story";

const VIDEO = {
  id: "vid1",
  filename: "neural-networks.mp4",
  status: "done",
  transcript_segments: [{ start_time: 0, end_time: 5, text: "hello" }],
};

function makeStory(mode, overrides = {}) {
  return {
    id: "s1",
    video_id: "vid1",
    mode,
    title: `neural-networks — ${mode}`,
    warnings: [],
    created_at: "2026-10-05T10:00:00Z",
    updated_at: "2026-10-05T10:00:00Z",
    panels: [
      {
        panel_id: "p1", video_id: "vid1", panel_number: 1,
        timestamp: 134.4, start_time: 134.4, end_time: 150,
        frame_url: "/api/story/vid1/frames/comic/panel_01_aaaaaaaa.jpg",
        title: "Introduction to neural networks", concept: "Neural, Weights",
        caption: "A neural network learns by adjusting its internal weights.",
        transcript_excerpt: "A neural network learns by adjusting its internal weights. It finds patterns.",
        importance: 0.9,
      },
      {
        panel_id: "p2", video_id: "vid1", panel_number: 2,
        timestamp: 332, start_time: 332, end_time: 345,
        frame_url: null,
        title: "The input layer", concept: "",
        caption: "The input layer receives the features.",
        transcript_excerpt: "The input layer receives the features.",
        importance: 0.6,
      },
    ],
    ...overrides,
  };
}

function notFound() {
  const err = new Error("No story has been generated for this video yet.");
  err.status = 404;
  return err;
}

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderStory(path = "/story/vid1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/story/:videoId" element={<><Story /><Where /></>} />
        <Route path="/story" element={<><Story /><Where /></>} />
        <Route path="/video/:videoId" element={<Where />} />
        <Route path="/history" element={<Where />} />
        <Route path="/processing" element={<Where />} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthed.mockReturnValue(true);
  api.getVideoStatus.mockResolvedValue(VIDEO);
  api.getStory.mockRejectedValue(notFound());
  api.getStoryFrameUrl.mockResolvedValue("blob:frame");
});

describe("Story page", () => {
  it("shows the header, tagline and the four modes with Comic selected by default", async () => {
    renderStory();
    expect(await screen.findByRole("heading", { name: "ClipMind Story" })).toBeInTheDocument();
    expect(screen.getByText("Turn this video into an interactive visual story.")).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Comic"),
      expect.stringContaining("Storybook"),
      expect.stringContaining("Study Notes"),
      expect.stringContaining("Storyboard"),
    ]);
    expect(screen.getByRole("radio", { name: /comic/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /storybook/i })).toHaveAttribute("aria-checked", "false");
  });

  it("prompts to generate when no story exists yet", async () => {
    renderStory();
    expect(await screen.findByText(/No Comic story yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Story" })).toBeEnabled();
  });

  it("generates a story: staged loading text, then panels with timestamps", async () => {
    const user = userEvent.setup();
    let resolve;
    api.generateStory.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderStory();

    await user.click(await screen.findByRole("button", { name: "Generate Story" }));
    expect(api.generateStory).toHaveBeenCalledWith("vid1", "comic");
    expect(await screen.findByText("Analyzing video...")).toBeInTheDocument();
    // controls are locked while generating
    expect(screen.getByRole("radio", { name: /storybook/i })).toBeDisabled();

    resolve(makeStory("comic"));
    expect(await screen.findByText("Introduction to neural networks")).toBeInTheDocument();
    expect(screen.getByText(/“A neural network learns by adjusting its internal weights\.”/)).toBeInTheDocument();
    expect(screen.getByText("Panel 1")).toBeInTheDocument();
    expect(screen.getByText("Panel 2")).toBeInTheDocument();
    // 134.4s -> 02:14, 332s -> 05:32 (on the Watch buttons)
    expect(screen.getByRole("button", { name: /Watch This Moment\s*02:14/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Watch This Moment\s*05:32/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate Story" })).toBeEnabled();
    // the real extracted frame is requested for the panel that has one
    await waitFor(() => expect(api.getStoryFrameUrl).toHaveBeenCalledWith(
      "/api/story/vid1/frames/comic/panel_01_aaaaaaaa.jpg"));
    expect(await screen.findByAltText("Frame from the video at 02:14")).toHaveAttribute("src", "blob:frame");
    // a panel without a frame degrades gracefully instead of breaking
    expect(screen.getByText("Frame unavailable")).toBeInTheDocument();
  });

  it("Watch This Moment opens the video at the exact second", async () => {
    const user = userEvent.setup();
    api.getStory.mockResolvedValue(makeStory("comic"));
    renderStory();

    await user.click(await screen.findByRole("button", { name: /Watch This Moment\s*02:14/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/vid1?t=134");
  });

  it("clicking the frame itself also seeks", async () => {
    const user = userEvent.setup();
    api.getStory.mockResolvedValue(makeStory("comic"));
    renderStory();

    await user.click(await screen.findByRole("button", { name: /Watch this moment at 05:32/i }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/vid1?t=332");
  });

  it("switching mode loads that mode's story and remembers the choice", async () => {
    const user = userEvent.setup();
    api.getStory.mockImplementation((id, mode) =>
      mode === "storybook" ? Promise.resolve(makeStory("storybook")) : Promise.reject(notFound()));
    renderStory();

    await screen.findByText(/No Comic story yet/i);
    await user.click(screen.getByRole("radio", { name: /storybook/i }));

    expect(api.getStory).toHaveBeenCalledWith("vid1", "storybook");
    expect(await screen.findByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /storybook/i })).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem("clipmind-story-mode")).toBe("storybook");
  });

  it("each mode renders its own layout", async () => {
    const user = userEvent.setup();
    api.getStory.mockImplementation((id, mode) => Promise.resolve(makeStory(mode)));
    const { container } = renderStory();

    await screen.findByText("Panel 1");
    expect(container.querySelector(".story-grid-comic .sp-comic")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: /storybook/i }));
    await waitFor(() => expect(container.querySelector(".story-grid-storybook .sp-book")).toBeTruthy());

    await user.click(screen.getByRole("radio", { name: /study notes/i }));
    await waitFor(() => expect(container.querySelector(".story-grid-study_notes .sp-note")).toBeTruthy());
    expect(screen.getAllByText(/Key point:/).length).toBe(2);

    await user.click(screen.getByRole("radio", { name: /storyboard/i }));
    await waitFor(() => expect(container.querySelector(".story-grid-storyboard .sp-board")).toBeTruthy());
    expect(screen.getByText("Shot 1")).toBeInTheDocument();
    expect(screen.getByText(/02:14 to 02:30/)).toBeInTheDocument();
  });

  it("arrow keys move between modes", async () => {
    const user = userEvent.setup();
    renderStory();
    const comic = await screen.findByRole("radio", { name: /comic/i });
    comic.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /storybook/i })).toHaveAttribute("aria-checked", "true");
  });

  it("regenerate replaces the story; delete removes it", async () => {
    const user = userEvent.setup();
    api.getStory.mockResolvedValue(makeStory("comic"));
    api.generateStory.mockResolvedValue(makeStory("comic", { panels: makeStory("comic").panels.slice(0, 1) }));
    api.deleteStory.mockResolvedValue({ deleted: 1 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderStory();

    await user.click(await screen.findByRole("button", { name: "Regenerate Story" }));
    await waitFor(() => expect(screen.queryByText("Panel 2")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Delete Comic story/ }));
    expect(api.deleteStory).toHaveBeenCalledWith("vid1", "comic");
    expect(await screen.findByText(/No Comic story yet/i)).toBeInTheDocument();
  });

  it("does not delete when the confirmation is declined", async () => {
    const user = userEvent.setup();
    api.getStory.mockResolvedValue(makeStory("comic"));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderStory();
    await user.click(await screen.findByRole("button", { name: /Delete Comic story/ }));
    expect(api.deleteStory).not.toHaveBeenCalled();
  });

  it("shows backend warnings about partial frame failures", async () => {
    api.getStory.mockResolvedValue(
      makeStory("comic", { warnings: ["1 of 2 frames could not be extracted; those panels show a placeholder."] }));
    renderStory();
    expect(await screen.findByText(/1 of 2 frames could not be extracted/)).toBeInTheDocument();
  });
});

describe("Story page: error and edge states", () => {
  it("video not found", async () => {
    const err = new Error("Video not found."); err.status = 404;
    api.getVideoStatus.mockRejectedValue(err);
    renderStory();
    expect(await screen.findByText(/couldn't find that video/i)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("backend unavailable", async () => {
    api.getVideoStatus.mockRejectedValue(new Error("Unable to reach the ClipMind AI backend. Is the server running?"));
    renderStory();
    expect(await screen.findByText(/Unable to reach the ClipMind AI backend/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("video not processed yet", async () => {
    const user = userEvent.setup();
    api.getVideoStatus.mockResolvedValue({ ...VIDEO, status: "processing" });
    renderStory();
    expect(await screen.findByText(/still being processed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Story" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View processing status" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/processing");
  });

  it("video failed processing", async () => {
    api.getVideoStatus.mockResolvedValue({ ...VIDEO, status: "failed" });
    renderStory();
    expect(await screen.findByText(/failed to process/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Story" })).not.toBeInTheDocument();
  });

  it("transcript unavailable", async () => {
    api.getVideoStatus.mockResolvedValue({ ...VIDEO, transcript_segments: [] });
    renderStory();
    expect(await screen.findByText(/no timestamped transcript/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Story" })).not.toBeInTheDocument();
  });

  it("generation failure shows the friendly message and a retry", async () => {
    const user = userEvent.setup();
    api.generateStory
      .mockRejectedValueOnce(new Error("Frame extraction is unavailable on the server (is FFmpeg installed and on PATH?)."))
      .mockResolvedValueOnce(makeStory("comic"));
    renderStory();

    await user.click(await screen.findByRole("button", { name: "Generate Story" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/FFmpeg/);

    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Panel 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no video selected", async () => {
    renderStory("/story");
    expect(await screen.findByText(/No video selected yet/i)).toBeInTheDocument();
  });

  it("falls back to the app's current video when /story has no id", async () => {
    localStorage.setItem("currentVideoId", "vid1");
    renderStory("/story");
    expect(await screen.findByRole("heading", { name: "ClipMind Story" })).toBeInTheDocument();
    expect(api.getVideoStatus).toHaveBeenCalledWith("vid1");
  });

  it("redirects to login when signed out", async () => {
    api.isAuthed.mockReturnValue(false);
    renderStory();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/login"));
  });
});
