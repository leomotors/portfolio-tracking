import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  color?: string;
  className?: string;
}

export function Chip({ label, color, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[var(--ink-2)] shadow-[0_1px_0_rgba(15,23,42,0.03)] [[data-theme='dark']_&]:shadow-none",
        className,
      )}
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}
