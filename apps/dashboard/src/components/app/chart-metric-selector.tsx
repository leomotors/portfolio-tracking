"use client";

import { cn } from "@/lib/utils";

export interface ChartMetricOption<T extends string> {
  value: T;
  label: string;
}

interface ChartMetricSelectorProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly ChartMetricOption<T>[];
}

export function ChartMetricSelector<T extends string>({
  value,
  onChange,
  options,
}: ChartMetricSelectorProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-[3px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
            opt.value === value
              ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_1px_rgba(15,23,42,0.05)]"
              : "text-[var(--ink-2)] hover:text-[var(--ink)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
