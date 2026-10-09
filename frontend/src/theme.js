/**
 * Theme (Light / Dark) -- single source of truth.
 *
 * The chosen theme is stored in localStorage under THEME_KEY and applied
 * as <html data-theme="light|dark">. All colors in the app are CSS
 * variables, and the dark palette is defined once under
 * :root[data-theme="dark"] (see index.css / app.css), so switching theme
 * is just flipping that one attribute -- no per-component logic.
 *
 * index.html runs the same "stored choice, else OS preference" logic in
 * an inline script BEFORE first paint, so a refresh never flashes the
 * wrong theme.
 */

export const THEME_KEY = "clipmind-theme";
export const THEME_EVENT = "clipmind-theme-change";
export const THEMES = ["light", "dark"];

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode etc.) -- fall back gracefully
  }
}

export function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialTheme() {
  return getStoredTheme() || getSystemTheme();
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Makes native widgets (video controls, scrollbars, form controls) match.
  root.style.colorScheme = theme;
}

/** Persist + apply + notify every <ThemeToggle/> / useTheme() consumer. */
export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not persisted, but still applied for this session.
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
