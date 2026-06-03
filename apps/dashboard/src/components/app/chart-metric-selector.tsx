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
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] p-[3px]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 text-[12px] whitespace-nowrap",
            opt.value === value
              ? "bg-[var(--bg)] text-[var(--ink)]"
              : "text-[var(--ink-2)]",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
