"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "lumo-theme";

/**
 * Runs before first paint (inlined in the root layout) so a saved choice never
 * flashes the wrong theme. Kept tiny and self-contained: it is a string.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function read(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  // Another tab changed the theme: follow it here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    const t = read();
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    fn();
  };
  listeners.add(fn);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function applyTheme(t: ThemePref) {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  listeners.forEach((fn) => fn());
}

const OPTIONS: [ThemePref, string][] = [
  ["system", "Auto"],
  ["light", "Light"],
  ["dark", "Dark"],
];

/** Three-way switch: follow the device, or force light or dark. */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as ThemePref);
  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold ${className}`}>
      {OPTIONS.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={pref === v}
          onClick={() => applyTheme(v)}
          className={`h-7 rounded-full px-3 transition ${pref === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
