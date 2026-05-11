"use client";

import { cn } from "@/lib/utils";

export type Timeframe = "1M" | "3M" | "6M" | "1Y";

interface TimeframeToggleProps {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
  options?: readonly Timeframe[];
}

const DEFAULT_OPTIONS = ["1M", "3M", "6M", "1Y"] as const;

export function TimeframeToggle({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: TimeframeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--hairline)] bg-[var(--surface)] p-[3px]">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={opt === value}
          className={cn(
            "num cursor-pointer rounded-md px-3 py-1 text-[12px]",
            opt === value
              ? "bg-[var(--bg)] text-[var(--ink)]"
              : "text-[var(--ink-2)]",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
