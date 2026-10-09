import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "../components/ThemeToggle";
import { THEME_KEY, applyTheme, getInitialTheme, setTheme } from "../theme";

const html = () => document.documentElement;

describe("theme persistence", () => {
  it("applies the theme to <html> and sets color-scheme for native controls", () => {
    applyTheme("dark");
    expect(html()).toHaveAttribute("data-theme", "dark");
    expect(html().style.colorScheme).toBe("dark");
  });

  it("setTheme stores the choice in localStorage", () => {
    setTheme("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    setTheme("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("ignores unknown theme names", () => {
    setTheme("neon");
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(html()).not.toHaveAttribute("data-theme");
  });

  it("restores the saved choice after a 'refresh'", () => {
    setTheme("dark");
    html().removeAttribute("data-theme"); // fresh page load
    expect(getInitialTheme()).toBe("dark");

    setTheme("light");
    html().removeAttribute("data-theme");
    expect(getInitialTheme()).toBe("light");
  });

  it("saved choice beats the OS preference; OS preference is the fallback", () => {
    window.matchMedia = vi.fn(() => ({ matches: true })); // OS says dark
    expect(getInitialTheme()).toBe("dark");
    localStorage.setItem(THEME_KEY, "light");
    expect(getInitialTheme()).toBe("light");
  });

  it("ignores a corrupted stored value", () => {
    localStorage.setItem(THEME_KEY, "banana");
    expect(getInitialTheme()).toBe("light");
  });
});

describe("<ThemeToggle />", () => {
  it("switches Light -> Dark -> Light, persisting each choice", async () => {
    const user = userEvent.setup();
    applyTheme("light");
    render(<ThemeToggle />);

    const light = screen.getByRole("button", { name: /light/i });
    const dark = screen.getByRole("button", { name: /dark/i });
    expect(light).toHaveAttribute("aria-pressed", "true");
    expect(dark).toHaveAttribute("aria-pressed", "false");

    await user.click(dark);
    expect(html()).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");

    await user.click(light);
    expect(html()).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(light).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the saved theme after a remount (refresh)", async () => {
    const user = userEvent.setup();
    applyTheme("light");
    const first = render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: /dark/i }));
    first.unmount();

    html().removeAttribute("data-theme");
    applyTheme(getInitialTheme()); // what the inline script in index.html does
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /dark/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps multiple toggles (navbar + login page) in sync", async () => {
    const user = userEvent.setup();
    applyTheme("light");
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>
    );
    await user.click(screen.getAllByRole("button", { name: /dark/i })[0]);
    for (const b of screen.getAllByRole("button", { name: /dark/i })) {
      expect(b).toHaveAttribute("aria-pressed", "true");
    }
  });
});
