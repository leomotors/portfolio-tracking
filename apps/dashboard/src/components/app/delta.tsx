import { ArrowDown, ArrowUp } from "lucide-react";

import { pct, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

interface DeltaProps {
  value: number;
  pct?: number;
  mini?: boolean;
}

export function Delta({ value, pct: pctVal, mini = false }: DeltaProps) {
  const positive = value >= 0;
  const Arrow = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-mono font-medium tabular-nums",
        positive ? "text-[var(--accent-pos)]" : "text-[var(--accent-neg)]",
        mini ? "gap-1 text-[11px]" : "text-[13px]",
      )}
    >
      <Arrow size={mini ? 9 : 11} strokeWidth={2.5} className="self-center" />
      <span className="num">{thb(value)}</span>
      {pctVal != null && (
        <span className="num text-[11px] opacity-85">{pct(pctVal)}</span>
      )}
    </span>
  );
}
