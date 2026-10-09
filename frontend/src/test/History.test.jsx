import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../api", () => ({
  default: {
    isAuthed: vi.fn(() => true),
    getHistory: vi.fn(), searchHistory: vi.fn(), getTopicEvolution: vi.fn(),
    generateDaily: vi.fn(), getDailyToday: vi.fn(), getDailyHistory: vi.fn(), startDaily: vi.fn(), setDailyItem: vi.fn(),
    createComparison: vi.fn(), getComparison: vi.fn(), listComparisons: vi.fn(), deleteComparison: vi.fn(),
    getVideoFileUrl: vi.fn(() => Promise.resolve("blob:v")), getVideoStatus: vi.fn(), getVideoAnalytics: vi.fn(() => Promise.resolve(null)),
    getBookmarks: vi.fn(() => Promise.resolve([])), recordActivity: vi.fn(() => Promise.resolve({})),
  },
  SUPPORTED_LANGUAGES: {},
}));

import api from "../api";
import TimeMachine from "../pages/TimeMachine";
import Daily from "../pages/Daily";
import Compare from "../pages/Compare";
import Results from "../pages/Results";
import { localDate } from "../utils/time";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
function open(path, routes) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {routes}
        <Route path="/video/:videoId" element={<><Where /></>} />
        <Route path="/revision/:videoId" element={<Where />} />
        <Route path="/upload" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.isAuthed.mockReturnValue(true);
  api.getTopicEvolution.mockResolvedValue({ videos_considered: 0, video_count: 0, enough_data: false, concepts: [] });
  api.getDailyHistory.mockResolvedValue([]);
  api.listComparisons.mockResolvedValue([]);
  api.getHistory.mockResolvedValue([
    { id: "v1", filename: "2025.mp4", status: "done" }, { id: "v2", filename: "2026.mp4", status: "done" },
    { id: "v3", filename: "busy.mp4", status: "processing" },
  ]);
});

describe("Time Machine", () => {
  const routes = <Route path="/timemachine" element={<><TimeMachine /><Where /></>} />;
  const HIT = (id, name, t) => ({ video_id: id, filename: name, uploaded_at: "2026-09-01T00:00:00Z", last_opened_at: null,
    concept: "Normalization", start_time: t, end_time: t + 20, text: "x", context: "Normalization is the process of organizing tables.", score: 0.9 });

  it("searches across videos and each result opens its own video at its timestamp", async () => {
    const user = userEvent.setup();
    api.searchHistory.mockResolvedValue({ query: "normalization", videos_searched: 3, results: [HIT("v1", "DBMS Lecture 1", 754), HIT("v2", "DBMS Lecture 4", 1697)] });
    open("/timemachine", routes);

    await user.type(screen.getByLabelText("Concept to search for"), "normalization");
    await user.click(screen.getByRole("button", { name: "Search history" }));
    expect(api.searchHistory).toHaveBeenCalledWith("normalization");
    expect(await screen.findByText("DBMS Lecture 1")).toBeInTheDocument();
    expect(screen.getByText("DBMS Lecture 4")).toBeInTheDocument();

    const second = screen.getByText("DBMS Lecture 4").closest("li");
    await user.click(within(second).getByRole("button", { name: /Watch/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/v2?t=1697");
  });

  it("explains when nothing matches or nothing is processed", async () => {
    const user = userEvent.setup();
    api.searchHistory.mockResolvedValueOnce({ query: "x", videos_searched: 2, results: [] })
      .mockResolvedValueOnce({ query: "y", videos_searched: 0, results: [] });
    open("/timemachine", routes);
    await user.type(screen.getByLabelText("Concept to search for"), "quantum");
    await user.click(screen.getByRole("button", { name: "Search history" }));
    expect(await screen.findByText(/doesn't appear in any of your 2 processed videos/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Search history" }));
    expect(await screen.findByText(/don't have any processed videos/)).toBeInTheDocument();
  });

  it("shows an error and disables empty searches", async () => {
    const user = userEvent.setup();
    api.searchHistory.mockRejectedValue(new Error("Backend down"));
    open("/timemachine", routes);
    expect(screen.getByRole("button", { name: "Search history" })).toBeDisabled();
    await user.type(screen.getByLabelText("Concept to search for"), "a");
    await user.click(screen.getByRole("button", { name: "Search history" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Backend down");
  });

  it("topic evolution explains what it needs when there isn't enough data", async () => {
    open("/timemachine", routes);
    expect(await screen.findByText(/needs at least two processed videos/)).toBeInTheDocument();
  });

  it("topic evolution with data lists concepts in learning order", async () => {
    const user = userEvent.setup();
    api.getTopicEvolution.mockResolvedValue({ enough_data: true, video_count: 2, videos_considered: 2, concepts: [
      { concept: "SQL", score: 1, videos: [{ video_id: "v1", filename: "L1", first_time: 5 }] },
      { concept: "Normalization", score: 1, videos: [{ video_id: "v1", filename: "L1", first_time: 60 }, { video_id: "v2", filename: "L4", first_time: 3 }] },
      { concept: "Indexing", score: 1, videos: [{ video_id: "v2", filename: "L4", first_time: 90 }] },
    ] });
    api.searchHistory.mockResolvedValue({ query: "Normalization", videos_searched: 2, results: [] });
    open("/timemachine", routes);
    const nodes = await screen.findAllByRole("button", { name: /^(SQL|Normalization|Indexing)$/ });
    expect(nodes.map((n) => n.textContent)).toEqual(["SQL", "Normalization", "Indexing"]);
    await user.click(nodes[1]);
    expect(api.searchHistory).toHaveBeenCalledWith("Normalization");
  });
});

describe("ClipMind Daily", () => {
  const routes = <Route path="/daily" element={<Daily />} />;
  const PLAN = {
    id: "p1", date: localDate(), minutes: 20, planned_minutes: 14, completed_count: 0, total_count: 3, completed_minutes: 0, started_at: null,
    items: [
      { item_id: "i1", kind: "bookmark", video_id: "v1", filename: "A", start_time: 190, end_time: 280, minutes: 2, title: "remember this", reason: "You bookmarked this moment: remember this", completed: false },
      { item_id: "i2", kind: "resume", video_id: "v2", filename: "B", start_time: 200, end_time: 680, minutes: 8, title: "Continue B", reason: "You stopped at 03:20 of 10:00.", completed: false },
      { item_id: "i3", kind: "revision", video_id: "v1", filename: "A", start_time: null, end_time: null, minutes: 3, title: "Quick revision", reason: "Revision page built from 2 videos in today's session.", completed: false },
    ],
  };
  const nothing = () => { const e = new Error("No plan for this day yet."); e.status = 404; return e; };

  it("generates a plan for the chosen minutes and today's local date", async () => {
    const user = userEvent.setup();
    api.getDailyToday.mockRejectedValue(nothing());
    api.generateDaily.mockResolvedValue({ plan: PLAN, empty_reason: null });
    open("/daily", routes);
    await user.click(await screen.findByRole("button", { name: "30 min" }));
    await user.click(screen.getByRole("button", { name: "Generate plan" }));
    expect(api.generateDaily).toHaveBeenCalledWith(30, localDate());
    expect(await screen.findByText("Continue B")).toBeInTheDocument();
    expect(screen.getByText("You stopped at 03:20 of 10:00.")).toBeInTheDocument();
  });

  it("shows the empty state reason instead of fake items", async () => {
    const user = userEvent.setup();
    api.getDailyToday.mockRejectedValue(nothing());
    api.generateDaily.mockResolvedValue({ plan: null, empty_reason: "There's nothing to plan yet. Upload a video." });
    open("/daily", routes);
    await user.click(await screen.findByRole("button", { name: "Generate plan" }));
    expect(await screen.findByText(/nothing to plan yet/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("loads today's saved plan, ticks items off (persisted) and opens items at their timestamps", async () => {
    const user = userEvent.setup();
    api.getDailyToday.mockResolvedValue(PLAN);
    api.setDailyItem.mockResolvedValue({ ...PLAN, completed_count: 1, completed_minutes: 2, items: PLAN.items.map((i) => i.item_id === "i1" ? { ...i, completed: true } : i) });
    open("/daily", routes);
    expect(await screen.findByText("Today, 20 minutes")).toBeInTheDocument();

    const first = screen.getByText("remember this").closest("li");
    await user.click(within(first).getByRole("checkbox", { name: "Done" }));
    expect(api.setDailyItem).toHaveBeenCalledWith("p1", "i1", true);
    await waitFor(() => expect(within(first).getByRole("checkbox", { name: "Done" })).toBeChecked());
    expect(screen.getByText(/1 of 3 done/)).toBeInTheDocument();

    const second = screen.getByText("Continue B").closest("li");
    await user.click(within(second).getByRole("button", { name: /Watch/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/v2?t=200");
  });

  it("Start session marks it started and opens the first unfinished item", async () => {
    const user = userEvent.setup();
    api.getDailyToday.mockResolvedValue(PLAN);
    api.startDaily.mockResolvedValue({ ...PLAN, started_at: "2026-10-06T00:00:00Z" });
    open("/daily", routes);
    await user.click(await screen.findByRole("button", { name: "Start session" }));
    expect(api.startDaily).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/video/v1?t=190"));
  });

  it("the revision step opens the revision tab", async () => {
    const user = userEvent.setup();
    api.getDailyToday.mockResolvedValue(PLAN);
    open("/daily", routes);
    await user.click(await screen.findByRole("button", { name: "Open revision page" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/revision/v1");
  });

  it("is upfront when the user's data can't fill the requested time", async () => {
    api.getDailyToday.mockResolvedValue({ ...PLAN, minutes: 60 });
    open("/daily", routes);
    expect(await screen.findByRole("note")).toHaveTextContent(/Only 14 of your 60 minutes/);
  });

  it("shows completion when everything is done", async () => {
    api.getDailyToday.mockResolvedValue({ ...PLAN, completed_count: 3, items: PLAN.items.map((i) => ({ ...i, completed: true })) });
    open("/daily", routes);
    expect(await screen.findByText(/Session complete/)).toBeInTheDocument();
  });
});

describe("Version comparison", () => {
  const RESULT = {
    id: "c1", old_video_id: "v1", new_video_id: "v2", old_filename: "2025.mp4", new_filename: "2026.mp4",
    counts: { changed: 1, new: 1, removed: 1, unchanged: 1 }, similarity: 0.5, verdict: "Partly different", truncated: false,
    method_note: "Compares the wording of the two transcripts.",
    items: [
      { status: "changed", text: "The course lasts 6 weeks.", old_text: "The course lasts 4 weeks.", old_start: 30, old_end: 40, new_start: 35, new_end: 45, explanation: "Numbers changed: 4 to 6." },
      { status: "new", text: "Indexes speed up queries.", old_start: null, old_end: null, new_start: 45, new_end: 60, explanation: "This point appears only in the newer video." },
      { status: "removed", text: "Denormalization is never used.", old_start: 40, old_end: 50, new_start: null, new_end: null, explanation: "" },
      { status: "unchanged", text: "A table stores rows.", old_start: 10, old_end: 20, new_start: 10, new_end: 25, explanation: "" },
    ],
  };
  const routes = <><Route path="/compare" element={<Compare />} /><Route path="/compare/:comparisonId" element={<Compare />} /></>;

  it("compares two processed videos; Watch Old / Watch New open the right video and time", async () => {
    const user = userEvent.setup();
    api.createComparison.mockResolvedValue(RESULT);
    open("/compare", routes);

    const compare = await screen.findByRole("button", { name: "Compare" });
    expect(compare).toBeDisabled();
    await screen.findAllByRole("option", { name: "2025.mp4" });
    expect(screen.queryByRole("option", { name: "busy.mp4" })).not.toBeInTheDocument();      // unprocessed not offered
    await user.selectOptions(screen.getByLabelText("Older version"), "v1");
    await user.selectOptions(screen.getByLabelText("Newer version"), "v2");
    await user.click(compare);

    expect(api.createComparison).toHaveBeenCalledWith("v1", "v2");
    expect(await screen.findByText("Partly different", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("The course lasts 6 weeks.")).toBeInTheDocument();       // opens on "Changed"
    expect(screen.getByText(/Numbers changed: 4 to 6/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Watch Old/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/v1?t=30");
  });

  it("filters by status and links new/removed items to the one video they exist in", async () => {
    const user = userEvent.setup();
    api.getComparison.mockResolvedValue(RESULT);
    open("/compare/c1", routes);
    await screen.findByText("The course lasts 6 weeks.");

    await user.click(screen.getByRole("tab", { name: "New (1)" }));
    expect(screen.getByText("Indexes speed up queries.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Watch Old/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Watch New/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/video/v2?t=45");
  });

  it("removed items only offer Watch Old", async () => {
    const user = userEvent.setup();
    api.getComparison.mockResolvedValue(RESULT);
    open("/compare/c1", routes);
    await user.click(await screen.findByRole("tab", { name: "Removed (1)" }));
    expect(screen.getByRole("button", { name: /Watch Old/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Watch New/ })).not.toBeInTheDocument();
  });

  it("shows API errors (e.g. no transcript) and needs two videos", async () => {
    const user = userEvent.setup();
    api.createComparison.mockRejectedValue(new Error("The newer video has no timestamped transcript to compare."));
    open("/compare", routes);
    await screen.findAllByRole("option", { name: "2025.mp4" });
    await user.selectOptions(screen.getByLabelText("Older version"), "v1");
    await user.selectOptions(screen.getByLabelText("Newer version"), "v2");
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no timestamped transcript/);
  });

  it("asks for a second video when fewer than two are processed", async () => {
    api.getHistory.mockResolvedValue([{ id: "v1", filename: "only.mp4", status: "done" }]);
    open("/compare", routes);
    expect(await screen.findByText(/at least two processed videos/)).toBeInTheDocument();
  });

  it("lists saved comparisons and deletes one after confirmation", async () => {
    const user = userEvent.setup();
    api.listComparisons.mockResolvedValue([{ id: "c1", old_filename: "2025.mp4", new_filename: "2026.mp4", verdict: "Partly different" }]);
    api.deleteComparison.mockResolvedValue({ deleted: 1 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    open("/compare", routes);
    await user.click(await screen.findByRole("button", { name: /Delete comparison 2025.mp4 vs 2026.mp4/ }));
    expect(api.deleteComparison).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(screen.queryByText("Saved comparisons")).not.toBeInTheDocument());
  });
});

describe("playback tracking on the video page", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("reports position + duration (opened once) while a processed video is open", async () => {
    api.getVideoStatus.mockResolvedValue({ id: "v1", filename: "a.mp4", status: "done", error_message: "", transcript_segments: [],
      key_moments: [], highlights: [], keywords: [], chapters: [], translations: {}, short_summary: "", summary: "", transcript: "" });
    render(<MemoryRouter initialEntries={["/video/v1"]}><Routes><Route path="/video/:videoId" element={<Results />} /></Routes></MemoryRouter>);
    const el = await waitFor(() => { const v = document.querySelector("video"); expect(v).toBeTruthy(); return v; });
    Object.defineProperty(el, "currentTime", { value: 75, configurable: true });
    Object.defineProperty(el, "duration", { value: 600, configurable: true });

    await vi.advanceTimersByTimeAsync(2600);
    expect(api.recordActivity).toHaveBeenCalledWith("v1", { position: 75, duration: 600, opened: true });
    await vi.advanceTimersByTimeAsync(15000);
    expect(api.recordActivity).toHaveBeenLastCalledWith("v1", { position: 75, duration: 600, opened: false });
  });
});
