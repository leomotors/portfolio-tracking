import { Search } from "lucide-react";

import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  aiTrigger,
  profile,
}: {
  aiTrigger?: React.ReactNode;
  profile?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 md:px-7">
      <div className="hidden max-w-[520px] flex-1 items-center gap-2 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] text-[var(--ink-3)] sm:flex">
        <Search size={14} strokeWidth={2} />
        <span>Search assets, accounts…</span>
        <kbd className="ml-auto rounded border border-[var(--hairline)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]">
          ⌘K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {profile ?? (
          <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--accent-pri)] text-xs font-semibold text-white">
            P
          </div>
        )}
        {aiTrigger}
      </div>
    </div>
  );
}
