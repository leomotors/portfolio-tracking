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
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <div className="mb-1.5 inline-flex max-w-full rounded-full border border-[var(--hairline)] bg-[var(--surface-2)] px-2.5 py-1 text-[12px] leading-none text-[var(--ink-2)]">
            {kicker}
          </div>
        )}
        <h1 className="m-0 text-[30px] leading-tight font-semibold tracking-[-0.02em] text-balance md:text-[32px]">
          {title}
        </h1>
        {sub && (
          <div className="mt-1.5 max-w-[72ch] text-[13px] leading-5 text-[var(--ink-2)]">
            {sub}
          </div>
        )}
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
