import { Search } from "lucide-react";

import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
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
        <ThemeToggle />
        <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--accent-pri)] text-xs font-semibold text-white">
          P
        </div>
      </div>
    </div>
  );
}
