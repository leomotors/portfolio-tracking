import { Sensitive } from "@/components/app/sensitive";

interface HBarRow {
  label: string;
  value: number;
  color?: string;
}

interface HBarsProps {
  data: HBarRow[];
  max?: number;
  valueFmt?: (v: number) => string;
  emptyLabel?: string;
  /** Show each row's share of the series total next to the value. */
  showPercent?: boolean;
}

export function HBars({
  data,
  max,
  valueFmt,
  emptyLabel = "No data",
  showPercent = false,
}: HBarsProps) {
  if (data.length === 0) {
    return <div className="text-[12px] text-[var(--ink-3)]">{emptyLabel}</div>;
  }
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d, i) => {
        const frac = total === 0 ? 0 : d.value / total;
        return (
          <div key={i} className="rounded-[var(--radius)]">
            <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
              <span className="font-medium text-[var(--ink-2)]">{d.label}</span>
              <span className="flex shrink-0 items-baseline justify-end gap-2">
                <Sensitive className="num text-[var(--ink)]">
                  {valueFmt ? valueFmt(d.value) : d.value}
                </Sensitive>
                {showPercent && (
                  <span className="num min-w-[4.8ch] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-right text-[11px] font-medium text-[var(--ink)]">
                    {(frac * 100).toFixed(1)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--track)]">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${m === 0 ? 0 : (d.value / m) * 100}%`,
                  background: d.color ?? "var(--accent-pri)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
