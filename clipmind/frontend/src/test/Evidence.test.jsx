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
vi.mock("../api", () => ({
  default: { isAuthed: vi.fn(() => true), getVideoStatus: vi.fn(), askAboutVideo: vi.fn() },
}));

import api from "../api";
import EvidenceLens from "../pages/EvidenceLens";
import EvidenceAnswer, { Highlighted } from "../components/EvidenceAnswer";

const EVIDENCE = {
  answer: "An index is a data structure that speeds up lookups.",
  insufficient_info: false,
  relevant_timestamps: [8],
  evidence: [
    { start_time: 8, end_time: 20, text: "An index is a data structure that speeds up lookups.", score: 0.6, strength: "strong", matched_words: ["index"] },
  ],
};

function open() {
  return render(
    <MemoryRouter initialEntries={["/evidence/v1"]}>
      <Routes>
        <Route path="/evidence/:videoId" element={<EvidenceLens />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthed.mockReturnValue(true);
  api.getVideoStatus.mockResolvedValue({ id: "v1", filename: "db.mp4", status: "done" });
});

describe("Evidence Lens page", () => {
  it("shows the quoted answer with evidence and Watch evidence seeks the player", async () => {
    const user = userEvent.setup();
    api.askAboutVideo.mockResolvedValue(EVIDENCE);
    open();
    await user.type(await screen.findByPlaceholderText(/Ask anything/), "what is an index");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(api.askAboutVideo).toHaveBeenCalledWith("v1", "what is an index");
    expect(await screen.findByText(/Answer \(quoted from the video\)/)).toBeInTheDocument();
    expect(screen.getByText("strong match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Watch evidence/ }));
    expect(seekTo).toHaveBeenCalledWith(8);
  });

  it("says no evidence was found instead of inventing an answer", async () => {
    const user = userEvent.setup();
    api.askAboutVideo.mockResolvedValue({ answer: "none", insufficient_info: true, evidence: [], relevant_timestamps: [] });
    open();
    await user.type(await screen.findByPlaceholderText(/Ask anything/), "how do rockets fly");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText(/No evidence found/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Watch evidence/ })).not.toBeInTheDocument();
  });

  it("does not submit an empty question and shows API errors", async () => {
    const user = userEvent.setup();
    api.askAboutVideo.mockRejectedValue(new Error("Couldn't search this video."));
    open();
    const ask = await screen.findByRole("button", { name: "Ask" });
    expect(ask).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/Ask anything/), "q");
    await user.click(ask);
    expect(await screen.findByText("Couldn't search this video.")).toBeInTheDocument();
  });
});

describe("EvidenceAnswer", () => {
  it("highlights matched words", () => {
    const { container } = render(<Highlighted text="An index speeds lookups" words={["index"]} />);
    expect(container.querySelector("mark")).toHaveTextContent("index");
  });
  it("renders the no-evidence state", () => {
    render(<EvidenceAnswer turn={{ insufficient: true, evidence: [] }} onWatch={() => {}} />);
    expect(screen.getByText(/No evidence found/)).toBeInTheDocument();
  });
});
