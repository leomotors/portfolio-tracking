"use client";

import { cn } from "@/lib/utils";

export type Timeframe = "1M" | "3M" | "6M" | "1Y" | "ALL";

interface TimeframeToggleProps {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
  options?: readonly Timeframe[];
}

const DEFAULT_OPTIONS = ["1M", "3M", "6M", "1Y", "ALL"] as const;

export function TimeframeToggle({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: TimeframeToggleProps) {
  return (
    <div className="inline-flex rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-[3px]">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={opt === value}
          className={cn(
            "num cursor-pointer rounded-md px-3 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
            opt === value
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_rgba(15,23,42,0.05)]"
              : "text-[var(--ink-2)] hover:text-[var(--ink)]",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
