interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  emptyLabel?: string;
  valueFormatter?: (value: number) => string;
  ariaLabel?: string;
}

export function Donut({
  data,
  size = 200,
  thickness = 22,
  centerLabel,
  centerValue,
  emptyLabel = "No data",
  valueFormatter,
  ariaLabel,
}: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const centerValueSize = centerValue
    ? Math.max(12, Math.min(16, size / Math.max(12, centerValue.length * 0.75)))
    : 16;

  const fracs = data.map((d) => (total === 0 ? 0 : d.value / total));
  const segs = data.map((d, i) => {
    const before = fracs.slice(0, i).reduce((s, f) => s + f, 0);
    return {
      ...d,
      dash: circ * fracs[i]!,
      offset: circ * -before,
      frac: fracs[i]!,
    };
  });
  const description =
    segs.length === 0
      ? emptyLabel
      : segs.map((s) => `${s.label} ${formatPercent(s.frac)}`).join(", ");
  const label = ariaLabel ?? "Allocation chart";

  return (
    <div className="grid w-full grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(9rem,max-content)_minmax(0,1fr)]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${description}`}
        className="mx-auto max-w-full shrink-0"
      >
        <title>{label}</title>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={thickness}
        />
        {segs.map((s, i) => (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={s.offset}
            transform={`rotate(-90 ${c} ${c})`}
            aria-hidden="true"
            style={{
              filter: "drop-shadow(0 1px 0 rgb(0 0 0 / 0.06))",
            }}
          />
        ))}
        {centerLabel && (
          <text
            x={c}
            y={c - 6}
            textAnchor="middle"
            fill="var(--ink-2)"
            fontSize="11"
            fontWeight="500"
          >
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text
            x={c}
            y={c + 14}
            textAnchor="middle"
            fill="var(--ink)"
            fontSize={centerValueSize}
            fontWeight="600"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            {centerValue}
          </text>
        )}
      </svg>

      <div className="grid min-w-0 gap-1.5">
        {segs.length === 0 && (
          <span className="text-[12px] text-[var(--ink-2)]">{emptyLabel}</span>
        )}
        {segs.map((s, i) => (
          <div
            key={i}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-md px-2 py-1.5 text-[12px]"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.08)]"
              style={{ background: s.color }}
            />
            <span className="min-w-0 truncate text-[var(--ink-2)]">
              {s.label}
            </span>
            <span className="flex items-baseline justify-end gap-2 text-right">
              {valueFormatter && (
                <span className="num hidden text-[11px] text-[var(--ink-2)] md:inline">
                  {valueFormatter(s.value)}
                </span>
              )}
              <span className="num min-w-[4.8ch] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-right text-[11px] font-medium text-[var(--ink)]">
                {formatPercent(s.frac)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
