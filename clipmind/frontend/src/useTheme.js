import { useSyncExternalStore } from "react";
import { THEME_EVENT, THEME_KEY, getInitialTheme, setTheme } from "./theme";

function subscribe(callback) {
  const onStorage = (e) => {
    // Another tab changed the theme: follow it.
    if (e.key === THEME_KEY) {
      document.documentElement.setAttribute("data-theme", getInitialTheme());
      document.documentElement.style.colorScheme = getInitialTheme();
      callback();
    }
  };
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return document.documentElement.getAttribute("data-theme") || getInitialTheme();
}

/** Returns [theme, setTheme]; re-renders whenever the theme changes anywhere. */
export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");
  return [theme, setTheme];
}
