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
}

export function Donut({
  data,
  size = 200,
  thickness = 22,
  centerLabel,
  centerValue,
  emptyLabel = "No data",
}: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

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

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          />
        ))}
        {centerLabel && (
          <text
            x={c}
            y={c - 6}
            textAnchor="middle"
            fill="var(--ink-3)"
            fontSize="11"
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
            fontSize="16"
            fontWeight="600"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            {centerValue}
          </text>
        )}
      </svg>

      <div className="flex flex-1 flex-col gap-2">
        {segs.length === 0 && (
          <span className="text-[12px] text-[var(--ink-3)]">{emptyLabel}</span>
        )}
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[13px]">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="flex-1 text-[var(--ink-2)]">{s.label}</span>
            <span className="num text-[var(--ink)]">
              {(s.frac * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
