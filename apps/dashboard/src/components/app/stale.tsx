import { Clock } from "lucide-react";

import { isStale } from "@/lib/portfolio/format";

interface StaleProps {
  date: Date | string | null | undefined;
  now?: Date;
}

export function Stale({ date, now }: StaleProps) {
  if (!isStale(date, now)) return null;
  const tooltip = date
    ? `Price last updated ${new Date(date).toLocaleString()}`
    : "Price never updated";
  return (
    <span
      title={tooltip}
      aria-label="Stale price"
      className="ml-1 inline-flex -translate-y-px items-center align-baseline text-[var(--accent-neg)] opacity-60"
    >
      <Clock size={11} strokeWidth={2.5} />
    </span>
  );
}
