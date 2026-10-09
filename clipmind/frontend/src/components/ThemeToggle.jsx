import useTheme from "../useTheme";

// Two-state segmented control: ☀ Light | 🌙 Dark. The active option is
// exposed with aria-pressed so screen readers announce the current theme.
export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useTheme();

  return (
    <div className={`theme-toggle ${className}`.trim()} role="group" aria-label="Color theme">
      <button
        type="button"
        className={"theme-toggle-option" + (theme === "light" ? " active" : "")}
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
      >
        <span aria-hidden="true">☀</span>
        <span className="theme-toggle-label">Light</span>
      </button>
      <button
        type="button"
        className={"theme-toggle-option" + (theme === "dark" ? " active" : "")}
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
      >
        <span aria-hidden="true">🌙</span>
        <span className="theme-toggle-label">Dark</span>
      </button>
    </div>
  );
}
