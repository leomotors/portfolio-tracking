"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_EVENT = "pt:theme-change";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribeTheme(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
}

function applyTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // ignore (private mode etc.)
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function Topbar() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "light" as const,
  );

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--hairline)] bg-[var(--bg)] px-7 py-3.5">
      <div className="flex max-w-[480px] flex-1 items-center gap-2 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[13px] text-[var(--ink-3)]">
        <Search size={14} strokeWidth={2} />
        <span>Search assets, accounts…</span>
        <kbd className="ml-auto rounded border border-[var(--hairline)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]">
          ⌘K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-[var(--hairline)] text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
        >
          {theme === "dark" ? (
            <Sun size={16} strokeWidth={1.8} />
          ) : (
            <Moon size={16} strokeWidth={1.8} />
          )}
        </button>
        <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--accent-pri)] text-xs font-semibold text-white">
          P
        </div>
      </div>
    </div>
  );
}
