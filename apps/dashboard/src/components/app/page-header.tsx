import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  sub,
  right,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn("flex items-end justify-between gap-4 pb-1", className)}
    >
      <div>
        {kicker && (
          <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
            {kicker}
          </div>
        )}
        <h1 className="m-0 text-[32px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {sub && (
          <div className="mt-1.5 text-[13px] text-[var(--ink-2)]">{sub}</div>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
