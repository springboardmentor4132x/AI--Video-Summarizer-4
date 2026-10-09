import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { forwardRef, useImperativeHandle } from "react";

const seekTo = vi.fn();
vi.mock("../components/VideoPlayer", () => ({
  default: forwardRef(function VideoPlayerMock(_props, ref) {
    useImperativeHandle(ref, () => ({ seekTo }));
    return <video data-testid="player" />;
  }),
}));
vi.mock("../api", () => ({ default: { isAuthed: vi.fn(() => true), getVideoDna: vi.fn() } }));

import api from "../api";
import VideoDNA from "../pages/VideoDNA";

const DNA = {
  video_id: "v1",
  filename: "db.mp4",
  total_sections: 2,
  sections: [
    { id: "s1", title: "Introduction: index", topic: "index", segment: "Introduction", timestamp: 0, start: 0, end: 45, highlight: "Welcome to indexes.", importance: "high", information_density: 80 },
    { id: "s2", title: "Explanation: table", topic: "table", segment: "Explanation", timestamp: 45, start: 45, end: 90, highlight: "Tables store rows.", importance: "low", information_density: 40 },
  ],
  topic_distribution: [{ topic: "index", mentions: 3, share: 0.75 }, { topic: "table", mentions: 1, share: 0.25 }],
};

function open() {
  return render(
    <MemoryRouter initialEntries={["/video-dna/v1"]}>
      <Routes><Route path="/video-dna/:videoId" element={<VideoDNA />} /></Routes>
    </MemoryRouter>
  );
}

beforeEach(() => { vi.clearAllMocks(); api.isAuthed.mockReturnValue(true); });

describe("Video DNA page", () => {
  it("loads real section data through the api client and shows the backend topic shares", async () => {
    api.getVideoDna.mockResolvedValue(DNA);
    open();
    expect(await screen.findByText(/Video: db.mp4/)).toBeInTheDocument();
    expect(api.getVideoDna).toHaveBeenCalledWith("v1");
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("clicking a section seeks the embedded player to its start", async () => {
    const user = userEvent.setup();
    api.getVideoDna.mockResolvedValue(DNA);
    open();
    const item = (await screen.findAllByText(/Explanation: table/))[0].closest("button");
    await user.click(item);
    expect(seekTo).toHaveBeenCalledWith(45);
  });

  it("shows a friendly error when there is no transcript", async () => {
    api.getVideoDna.mockRejectedValue(new Error("This video has no timestamped transcript yet."));
    open();
    expect(await screen.findByText(/no timestamped transcript/)).toBeInTheDocument();
  });
});
