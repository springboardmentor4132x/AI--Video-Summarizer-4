import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { createRef } from "react";

vi.mock("../api", () => ({
  default: {
    isAuthed: vi.fn(() => true),
    getVideoStatus: vi.fn(),
    getHistory: vi.fn(),
    getRevision: vi.fn(),
    explainMoment: vi.fn(),
  },
}));

import api from "../api";
import Revision from "../pages/Revision";
import ExplainPanel from "../components/ExplainPanel";

const VIDEO = { id: "v1", filename: "db.mp4", status: "done", transcript_segments: [{ start_time: 0, end_time: 5, text: "x" }] };

const SHEET = {
  video_id: "v1", filename: "db.mp4",
  must_remember: [{ start_time: 40, end_time: 60, text: "Normalization reduces redundancy." }],
  definitions: [{ term: "Normalization", start_time: 40, end_time: 60, text: "Normalization is organizing tables." }],
  differences: [], formulas: [], confusions: [],
  key_timestamps: [{ start_time: 40, end_time: 60, label: "Normalization reduces" }],
  flashcards: [{ question: "What is Normalization?", answer: "organizing tables", start_time: 40, end_time: 60 }],
};

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }

function open(path = "/revision/v1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/revision/:videoId" element={<><Revision /><Where /></>} />
        <Route path="/video/:videoId" element={<Where />} />
        <Route path="/history" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthed.mockReturnValue(true);
  api.getVideoStatus.mockResolvedValue(VIDEO);
  api.getHistory.mockResolvedValue([
    { id: "v1", filename: "db.mp4", status: "done" },
    { id: "v2", filename: "sql.mp4", status: "done" },
    { id: "v3", filename: "busy.mp4", status: "processing" },
  ]);
});

describe("Revision: page states", () => {
  it("video not found", async () => {
    const e = new Error("Video not found."); e.status = 404;
    api.getVideoStatus.mockRejectedValue(e);
    open();
    expect(await screen.findByText(/couldn't find that video/i)).toBeInTheDocument();
  });
  it("not processed", async () => {
    api.getVideoStatus.mockResolvedValue({ ...VIDEO, status: "processing" });
    open();
    expect(await screen.findByText(/isn't processed yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
  it("no transcript", async () => {
    api.getVideoStatus.mockResolvedValue({ ...VIDEO, transcript_segments: [] });
    open();
    expect(await screen.findByText(/no timestamped transcript/i)).toBeInTheDocument();
  });
});

describe("Revision: 5-Minute Revision", () => {
  it("builds a sheet for several videos and links back to each source", async () => {
    const user = userEvent.setup();
    api.getRevision.mockResolvedValue({ videos: [SHEET, { ...SHEET, video_id: "v2", filename: "sql.mp4" }] });
    open("/revision/v1");

    // only processed videos are offered; the current one is preselected
    expect(await screen.findByLabelText("db.mp4")).toBeChecked();
    expect(screen.queryByLabelText("busy.mp4")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("sql.mp4"));
    await user.click(screen.getByRole("button", { name: "Generate 5-Minute Revision" }));

    expect(api.getRevision).toHaveBeenCalledWith(["v1", "v2"]);
    expect(await screen.findByRole("heading", { name: "sql.mp4" })).toBeInTheDocument();
    expect(screen.getAllByText("Must-remember concepts")).toHaveLength(2);
    // empty categories say so instead of being filled in
    expect(screen.getAllByText("No formulas found in the transcript.")).toHaveLength(2);

    // watching from the SECOND video's sheet opens that video
    const sqlSheet = screen.getByRole("heading", { name: "sql.mp4" }).closest("article");
    await user.click(within(sqlSheet).getAllByRole("button", { name: /Watch/ })[0]);
    expect(screen.getByTestId("where")).toHaveTextContent("/video/v2?t=40");
  });

  it("flashcard reveals its answer and source", async () => {
    const user = userEvent.setup();
    api.getRevision.mockResolvedValue({ videos: [SHEET] });
    open("/revision/v1");
    await user.click(await screen.findByRole("button", { name: "Generate 5-Minute Revision" }));
    expect(await screen.findByText("What is Normalization?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Source/ })).toBeInTheDocument();
  });

  it("shows API errors", async () => {
    const user = userEvent.setup();
    api.getRevision.mockRejectedValue(new Error("Each video can only be included once."));
    open("/revision/v1");
    await user.click(await screen.findByRole("button", { name: "Generate 5-Minute Revision" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/only be included once/);
  });
});

describe("I Don't Understand", () => {
  const RESULT = {
    timestamp: 45, simple_explanation: "Normalization organizes tables.", explain_like_10: "In short: tables get tidy.",
    exam_definition: { term: "Normalization", text: "Normalization is organizing tables.", start_time: 40, end_time: 60 },
    real_life_example: null, related_concept: null, rewatch_range: { start_time: 20, end_time: 80 }, method: "extractive",
  };

  it("explains the moment at the player's current time and can rewatch the range", async () => {
    const user = userEvent.setup();
    api.explainMoment.mockResolvedValue(RESULT);
    const seekTo = vi.fn();
    const ref = createRef();
    ref.current = { getCurrentTime: () => 45, seekTo };
    render(<ExplainPanel videoId="v1" playerRef={ref} />);

    await user.click(screen.getByRole("button", { name: "I Don't Understand" }));
    expect(api.explainMoment).toHaveBeenCalledWith("v1", 45);
    expect(await screen.findByText("Normalization organizes tables.")).toBeInTheDocument();
    expect(screen.getByText("In short: tables get tidy.")).toBeInTheDocument();
    // parts the transcript doesn't support are stated, not invented
    expect(screen.getByText(/doesn't give an example/)).toBeInTheDocument();
    expect(screen.getByText(/No related passage/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rewatch this part/ }));
    expect(seekTo).toHaveBeenCalledWith(20);
  });

  it("shows errors", async () => {
    const user = userEvent.setup();
    api.explainMoment.mockRejectedValue(new Error("Backend down"));
    render(<ExplainPanel videoId="v1" playerRef={{ current: null }} />);
    await user.click(screen.getByRole("button", { name: "I Don't Understand" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Backend down");
    expect(api.explainMoment).toHaveBeenCalledWith("v1", 0);
  });
});
