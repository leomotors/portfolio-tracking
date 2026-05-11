"use client";

import { useId, useMemo, useRef, useState } from "react";

export interface AreaChartPoint {
  date: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartPoint[];
  height?: number;
  accent?: string;
  formatY?: (v: number) => string;
  formatX?: (p: AreaChartPoint) => string;
  emptyLabel?: string;
}

const W = 1000;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;

export function AreaChart({
  data,
  height = 220,
  accent = "var(--accent-pos)",
  formatY,
  formatX,
  emptyLabel = "No history yet",
}: AreaChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/[:]/g, "");

  const layout = useMemo(() => {
    if (data.length === 0) {
      return { points: [], minV: 0, maxV: 0, yTicks: [] };
    }
    const vals = data.map((d) => d.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const points = data.map((d, i) => {
      const x =
        PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, data.length - 1);
      const y =
        PAD_T + (1 - (d.value - minV) / range) * (height - PAD_T - PAD_B);
      return { x, y, d };
    });
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const y = PAD_T + (1 - i / ticks) * (height - PAD_T - PAD_B);
      return { y, i };
    });
    return { points, minV, maxV, yTicks };
  }, [data, height]);

  const linePath = useMemo(() => {
    const pts = layout.points;
    if (pts.length === 0) return "";
    let p = `M ${pts[0]!.x},${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const cur = pts[i]!;
      const cx = (prev.x + cur.x) / 2;
      p += ` C ${cx},${prev.y} ${cx},${cur.y} ${cur.x},${cur.y}`;
    }
    return p;
  }, [layout.points]);

  const areaPath = useMemo(() => {
    const pts = layout.points;
    if (pts.length === 0) return "";
    return (
      linePath +
      ` L ${pts.at(-1)!.x},${height - PAD_B} L ${pts[0]!.x},${height - PAD_B} Z`
    );
  }, [linePath, layout.points, height]);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!ref.current || layout.points.length === 0) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    layout.points.forEach((p, i) => {
      const dx = Math.abs(p.x - x);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-[var(--ink-3)]"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  const hovered = hover != null ? layout.points[hover] : null;

  return (
    <div className="relative" data-testid="area-chart">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        style={{ width: "100%", height, display: "block" }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {layout.yTicks.map(({ y, i }) => (
          <line
            key={i}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y}
            y2={y}
            stroke="var(--hairline)"
            strokeWidth="1"
            strokeDasharray={i === 0 ? "0" : "2 4"}
          />
        ))}
        <path d={areaPath} fill={`url(#${gid})`} />
        <path
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {hovered && (
          <g>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_T}
              y2={height - PAD_B}
              stroke="var(--ink)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.4"
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r="4"
              fill="var(--surface)"
              stroke={accent}
              strokeWidth="1.6"
            />
          </g>
        )}
      </svg>
      {hovered &&
        (() => {
          const xPct = (hovered.x / W) * 100;
          const yPct = (hovered.y / height) * 100;
          // Flip to below the cursor when the point sits in the upper third,
          // so the tooltip never escapes the chart's overflow-hidden parent.
          const placeBelow = yPct < 35;
          const tx = xPct < 12 ? "0%" : xPct > 88 ? "-100%" : "-50%";
          const ty = placeBelow ? "16px" : "calc(-100% - 12px)";
          return (
            <div
              className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-[11px] text-[var(--bg)] shadow-sm"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: `translate(${tx}, ${ty})`,
              }}
              data-testid="area-chart-tooltip"
            >
              <div className="text-[10px] opacity-70">
                {formatX ? formatX(hovered.d) : hovered.d.date}
              </div>
              <div className="num font-medium">
                {formatY ? formatY(hovered.d.value) : hovered.d.value}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
