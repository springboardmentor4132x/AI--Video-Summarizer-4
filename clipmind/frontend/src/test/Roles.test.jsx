import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../api", () => ({
  default: {
    isAuthed: vi.fn(() => true),
    getCurrentUser: vi.fn(),
    getAdminStats: vi.fn(),
    getAdminUsers: vi.fn(),
    setUserRole: vi.fn(),
    setUserActive: vi.fn(),
    getEducatorOverview: vi.fn(),
    getVideoShares: vi.fn(),
    shareVideo: vi.fn(),
    getSharedWithMe: vi.fn(),
  },
}));

import api from "../api";
import RoleRoute from "../components/RoleRoute";
import PublicNav from "../components/PublicNav";
import AdminDashboard from "../pages/AdminDashboard";
import EducatorDashboard from "../pages/EducatorDashboard";
import SharedWithMe from "../pages/SharedWithMe";

const renderAt = (path, element, routePath = path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.isAuthed.mockReturnValue(true);
});

describe("RoleRoute asks the server for the role, not localStorage", () => {
  it("blocks a learner even if localStorage claims administrator", async () => {
    localStorage.setItem("currentUser", JSON.stringify({ role: "administrator" })); // tampered
    api.getCurrentUser.mockResolvedValue({ id: "1", role: "learner", name: "L" });
    renderAt("/admin", <RoleRoute roles={["administrator"]}><p>secret admin page</p></RoleRoute>);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("secret admin page")).not.toBeInTheDocument();
  });

  it("lets an administrator in and refreshes the stored profile", async () => {
    api.getCurrentUser.mockResolvedValue({ id: "1", role: "administrator", name: "A" });
    renderAt("/admin", <RoleRoute roles={["administrator"]}><p>secret admin page</p></RoleRoute>);
    expect(await screen.findByText("secret admin page")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("currentUser")).role).toBe("administrator");
  });
});

describe("Public navigation", () => {
  it("exposes the educator dashboard to educators and administrators", () => {
    localStorage.setItem("currentUser", JSON.stringify({ role: "educator", name: "Ravi" }));
    render(
      <MemoryRouter>
        <PublicNav />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Educator Dashboard" })).toHaveAttribute("href", "/educator");
  });

  it("does not expose the educator dashboard to learners", () => {
    localStorage.setItem("currentUser", JSON.stringify({ role: "learner", name: "Learner" }));
    render(
      <MemoryRouter>
        <PublicNav />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "Educator Dashboard" })).not.toBeInTheDocument();
  });
});

describe("Administrator dashboard", () => {
  it("shows real stats, lists users, and surfaces a refused change", async () => {
    const user = userEvent.setup();
    api.getAdminStats.mockResolvedValue({
      users: { total: 3, active: 2, disabled: 1, by_role: { learner: 2, educator: 0, content_creator: 0, administrator: 1 } },
      videos: { total: 4, done: 2, processing: 1, failed: 1, storage_bytes: 2048, total_duration_seconds: 125, by_status: {} },
      recent_failures: [{ id: "v9", filename: "bad.mp4", error_message: "ffmpeg failed" }],
    });
    api.getAdminUsers.mockResolvedValue({ total: 1, users: [
      { id: "u1", name: "Root", email: "root@x.com", role: "administrator", is_active: true, created_at: null, video_count: 0 },
    ] });
    api.setUserRole.mockRejectedValue(new Error("You cannot remove the last active administrator."));
    renderAt("/admin", <AdminDashboard />);

    expect(await screen.findByText("Users (1 disabled)")).toBeInTheDocument();
    expect(screen.getByText(/bad.mp4/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Users" }));
    const select = await screen.findByLabelText("Role for root@x.com");
    await user.selectOptions(select, "learner");
    expect(api.setUserRole).toHaveBeenCalledWith("u1", "learner");
    expect(await screen.findByText("You cannot remove the last active administrator.")).toBeInTheDocument();
  });
});

describe("Educator dashboard", () => {
  const overview = {
    totals: { total: 1, done: 1, processing: 0, failed: 0, students_reached: 0, storage_bytes: 0, total_duration_seconds: 20 },
    videos: [{ id: "v1", filename: "lecture.mp4", status: "done", duration: 20, size_bytes: 0, has_transcript: true,
               students_with_access: 0, students_opened: 0, average_completion: null }],
  };

  it("shares a video and reports who could not be added", async () => {
    const user = userEvent.setup();
    api.getEducatorOverview.mockResolvedValue(overview);
    api.getVideoShares.mockResolvedValue({ students: [], students_with_access: 0, students_opened: 0, average_completion: null });
    api.shareVideo.mockResolvedValue({ shared: ["a@x.com"], already_shared: [], not_found: ["ghost@x.com"], not_eligible: [] });
    renderAt("/educator", <EducatorDashboard />);

    await user.click(await screen.findByRole("button", { name: "Share & engagement" }));
    await user.type(await screen.findByLabelText("Student emails"), "a@x.com, ghost@x.com");
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(api.shareVideo).toHaveBeenCalledWith("v1", ["a@x.com", "ghost@x.com"]);
    const status = await screen.findByRole("status");
    expect(within(status).getByText(/Shared with: a@x.com/)).toBeInTheDocument();
    expect(within(status).getByText(/No account found for: ghost@x.com/)).toBeInTheDocument();
  });

  it("shows unknown engagement as a dash, never as 0%", async () => {
    api.getEducatorOverview.mockResolvedValue(overview);
    renderAt("/educator", <EducatorDashboard />);
    const row = (await screen.findByText("lecture.mp4")).closest("tr");
    expect(within(row).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(row).queryByText("0%")).not.toBeInTheDocument();
  });
});

describe("Shared with me", () => {
  it("shows a useful empty state", async () => {
    api.getSharedWithMe.mockResolvedValue([]);
    renderAt("/shared", <SharedWithMe />);
    expect(await screen.findByText(/Nothing has been shared with you yet/)).toBeInTheDocument();
  });
  it("lists shared videos with who shared them", async () => {
    api.getSharedWithMe.mockResolvedValue([{ id: "v1", filename: "l.mp4", status: "done", short_summary: "About indexes.", shared_by: "Prof", shared_at: null }]);
    renderAt("/shared", <SharedWithMe />);
    expect(await screen.findByText("About indexes.")).toBeInTheDocument();
    expect(screen.getByText(/Shared by Prof/)).toBeInTheDocument();
  });
});
