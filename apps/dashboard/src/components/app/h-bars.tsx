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
}

export function HBars({
  data,
  max,
  valueFmt,
  emptyLabel = "No data",
}: HBarsProps) {
  if (data.length === 0) {
    return <div className="text-[12px] text-[var(--ink-3)]">{emptyLabel}</div>;
  }
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d, i) => (
        <div key={i} className="rounded-[var(--radius)]">
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="font-medium text-[var(--ink-2)]">{d.label}</span>
            <span className="num text-[var(--ink)]">
              {valueFmt ? valueFmt(d.value) : d.value}
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
      ))}
    </div>
  );
}
