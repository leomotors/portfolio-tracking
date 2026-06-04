import { ArrowDown, ArrowUp } from "lucide-react";

import { pct, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  value: number;
  pct?: number;
  mini?: boolean;
  large?: boolean;
}

export function Delta({
  value,
  pct: pctVal,
  mini = false,
  large = false,
}: DeltaProps) {
  const positive = value >= 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-mono font-medium tabular-nums",
        positive ? "text-[var(--accent-pos)]" : "text-[var(--accent-neg)]",
        mini ? "gap-1 text-[11px]" : large ? "text-[18px]" : "text-[13px]",
      )}
    >
      <Arrow
        size={mini ? 9 : large ? 15 : 11}
        strokeWidth={2.5}
        className="self-center"
      />
      <span className="num">{thb(value)}</span>
      {pctVal != null && (
        <span
          className={cn(
            "num opacity-85",
            large ? "text-[13px]" : "text-[11px]",
          )}
        >
          {pct(pctVal)}
        </span>
      )}
    </span>
  );
}
