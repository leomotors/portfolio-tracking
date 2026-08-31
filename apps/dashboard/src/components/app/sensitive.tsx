"use client";

import type { ReactNode } from "react";

import { PRIVACY_MASK } from "@/lib/privacy-mode";
import { cn } from "@/lib/utils";

/**
 * Renders `children` and a mask sibling. CSS on `data-privacy` swaps which
 * one is visible so hiding balances does not flash the real number on load.
 */
export function Sensitive({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("privacy-amount", className)}>
      <span data-privacy-value>{children}</span>
      <span data-privacy-mask aria-hidden="true">
        {PRIVACY_MASK}
      </span>
    </span>
  );
}
