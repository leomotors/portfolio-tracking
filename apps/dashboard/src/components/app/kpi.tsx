import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Delta } from "./delta";

interface KpiProps {
  label: string;
  value: ReactNode;
  native?: ReactNode;
  delta?: number;
  pct?: number;
  sub?: ReactNode;
  className?: string;
}

export function Kpi({
  label,
  value,
  native,
  delta,
  pct,
  sub,
  className,
}: KpiProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface)] p-5",
        className,
      )}
    >
      <div className="text-xs text-[var(--ink-3)]">{label}</div>
      <div className="num text-[22px] font-medium tracking-[-0.015em]">
        {value}
      </div>
      {native && (
        <div className="num text-[11px] text-[var(--ink-3)]">{native}</div>
      )}
      {delta != null && <Delta value={delta} pct={pct} />}
      {sub && <div className="text-[11px] text-[var(--ink-3)]">{sub}</div>}
    </div>
  );
}

export function KpiGrid({
  layout = "4up",
  children,
  className,
}: {
  layout?: "4up" | "2x2";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        layout === "4up"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
