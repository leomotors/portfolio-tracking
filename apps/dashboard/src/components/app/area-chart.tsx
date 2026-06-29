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
  negativeAccent?: string;
  baselineValue?: number;
  baselineLabel?: string;
  splitAtZero?: boolean;
  volume?: AreaChartPoint[];
  volumeHeight?: number;
  volumeLabel?: string;
  formatY?: (v: number) => string;
  formatAxisY?: (v: number) => string;
  formatX?: (p: AreaChartPoint) => string;
  formatDelta?: (delta: number, pct: number) => string;
  formatVolume?: (v: number) => string;
  emptyLabel?: string;
}

const W = 1000;
const PAD_L = 44;
const PAD_R = 18;
const PAD_T = 14;
const PAD_B = 38;
const VOL_GAP = 6;
const VOL_PAD_B = 28;
const X_LABEL_EDGE_PCT = 1.5;
const X_LABEL_BOTTOM_PAD = 12;

export function AreaChart({
  data,
  height = 220,
  accent = "var(--accent-pos)",
  negativeAccent = "var(--accent-neg)",
  baselineValue,
  baselineLabel = "vs start",
  splitAtZero = false,
  volume,
  volumeHeight = 52,
  volumeLabel = "Money flow",
  formatY,
  formatAxisY,
  formatX,
  formatDelta,
  formatVolume,
  emptyLabel = "No history yet",
}: AreaChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const gid = useId().replace(/[:]/g, "");
  const hasVolume = volume != null && volume.length > 0;
  const volBlock = hasVolume ? volumeHeight + VOL_GAP : 0;
  const mainHeight = height - volBlock;

  const layout = useMemo(() => {
    if (data.length === 0) {
      return {
        points: [],
        minV: 0,
        maxV: 0,
        yTicks: [],
        xTicks: [],
        baselineY: null,
        volumeBars: [] as VolumeBar[],
        volBaselineY: null as number | null,
      };
    }
    const vals = data.map((d) => d.value);
    const splitValue = getSplitValue(baselineValue, splitAtZero);
    const minV = Math.min(...vals, ...(splitValue == null ? [] : [splitValue]));
    const maxV = Math.max(...vals, ...(splitValue == null ? [] : [splitValue]));
    const range = maxV - minV || 1;
    const points = data.map((d, i) => {
      const x =
        PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, data.length - 1);
      const y =
        PAD_T +
        (1 - (d.value - minV) / range) * (mainHeight - PAD_T - PAD_B);
      return { x, y, d };
    });
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const y = PAD_T + (1 - i / ticks) * (mainHeight - PAD_T - PAD_B);
      const value = minV + (i / ticks) * range;
      return { y, value, i };
    });
    const xTickIndexes = Array.from(
      new Set(
        [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
          (i) => i >= 0,
        ),
      ),
    );
    const xTicks = xTickIndexes.map((i) => {
      const p = points[i]!;
      return { x: p.x, d: p.d, i };
    });
    const baselineY =
      splitValue != null && minV <= splitValue && maxV >= splitValue
        ? PAD_T +
          (1 - (splitValue - minV) / range) * (mainHeight - PAD_T - PAD_B)
        : null;

    let volumeBars: VolumeBar[] = [];
    let volBaselineY: number | null = null;
    if (hasVolume) {
      const volTop = mainHeight + VOL_GAP;
      const volBottom = height - VOL_PAD_B;
      volBaselineY = volBottom;
      const volSpan = volBottom - volTop - 2;
      const volVals = volume.map((d) => d.value);
      const maxAbs = Math.max(...volVals.map((v) => Math.abs(v)), 1);
      const barWidth = Math.min(
        10,
        ((W - PAD_L - PAD_R) / Math.max(1, data.length)) * 0.72,
      );
      volumeBars = points.map((p, i) => {
        const value = volume[i]?.value ?? 0;
        const barHeight = (Math.abs(value) / maxAbs) * volSpan;
        return {
          x: p.x,
          y: volBottom - barHeight,
          height: barHeight,
          value,
          width: barWidth,
        };
      });
    }

    return {
      points,
      minV,
      maxV,
      yTicks,
      xTicks,
      baselineY,
      volumeBars,
      volBaselineY,
    };
  }, [
    baselineValue,
    data,
    hasVolume,
    height,
    mainHeight,
    splitAtZero,
    volume,
  ]);

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
      ` L ${pts.at(-1)!.x},${mainHeight - PAD_B} L ${pts[0]!.x},${mainHeight - PAD_B} Z`
    );
  }, [linePath, layout.points, mainHeight]);

  const splitLinePaths = useMemo(() => {
    const pts = layout.points;
    const splitValue = getSplitValue(baselineValue, splitAtZero);
    if (pts.length === 0) return [];
    if (pts.length === 1) {
      const p = pts[0]!;
      return [
        {
          d: `M ${p.x - 0.01},${p.y} L ${p.x + 0.01},${p.y}`,
          color:
            splitValue == null || p.d.value >= splitValue
              ? accent
              : negativeAccent,
        },
      ];
    }

    const paths: { d: string; color: string }[] = [];
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const cur = pts[i]!;
      const prevColor =
        splitValue == null || prev.d.value >= splitValue
          ? accent
          : negativeAccent;
      const curColor =
        splitValue == null || cur.d.value >= splitValue
          ? accent
          : negativeAccent;

      if (prevColor === curColor || prev.d.value === cur.d.value) {
        paths.push({
          d: `M ${prev.x},${prev.y} L ${cur.x},${cur.y}`,
          color: curColor,
        });
        continue;
      }

      const t =
        ((splitValue ?? 0) - prev.d.value) / (cur.d.value - prev.d.value);
      const x = prev.x + (cur.x - prev.x) * t;
      const y = prev.y + (cur.y - prev.y) * t;
      paths.push({ d: `M ${prev.x},${prev.y} L ${x},${y}`, color: prevColor });
      paths.push({ d: `M ${x},${y} L ${cur.x},${cur.y}`, color: curColor });
    }
    return paths;
  }, [accent, baselineValue, layout.points, negativeAccent, splitAtZero]);

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
  const splitValue = getSplitValue(baselineValue, splitAtZero);
  const hoverAccent =
    splitValue != null && hovered && hovered.d.value < splitValue
      ? negativeAccent
      : accent;
  const formatAxis = formatAxisY ?? formatCompact;

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
            stroke="var(--hairline-2)"
            strokeWidth="1"
            strokeDasharray={i === 0 ? "0" : "2 4"}
          />
        ))}
        {splitValue != null && layout.baselineY != null && (
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={layout.baselineY}
            y2={layout.baselineY}
            stroke="var(--ink-3)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.45"
          />
        )}
        {splitValue == null && <path d={areaPath} fill={`url(#${gid})`} />}
        {splitValue == null ? (
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2.1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          splitLinePaths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))
        )}
        {hasVolume && layout.volBaselineY != null && (
          <>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={mainHeight + VOL_GAP / 2}
              y2={mainHeight + VOL_GAP / 2}
              stroke="var(--hairline-2)"
              strokeWidth="1"
            />
            {layout.volumeBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x - bar.width / 2}
                y={bar.y}
                width={bar.width}
                height={Math.max(1, bar.height)}
                rx="1"
                fill={
                  bar.value >= 0 ? "var(--accent-pos)" : "var(--accent-neg)"
                }
                opacity={hover === i ? 0.95 : 0.72}
              />
            ))}
          </>
        )}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={mainHeight - PAD_B}
          y2={mainHeight - PAD_B}
          stroke="var(--ink-3)"
          strokeWidth="1"
          opacity="0.32"
        />
        <line
          x1={PAD_L}
          x2={PAD_L}
          y1={PAD_T}
          y2={mainHeight - PAD_B}
          stroke="var(--ink-3)"
          strokeWidth="1"
          opacity="0.32"
        />
        {hovered && (
          <g>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_T}
              y2={height - VOL_PAD_B}
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
              stroke={hoverAccent}
              strokeWidth="1.6"
            />
          </g>
        )}
      </svg>
      {layout.yTicks.map(({ y, value, i }) => (
        <div
          key={i}
          className="pointer-events-none absolute whitespace-nowrap pr-1.5 text-right text-[10px] tabular-nums text-[var(--ink-3)]"
          style={{
            left: `${(PAD_L / W) * 100}%`,
            top: y,
            transform: "translate(-100%, -50%)",
          }}
        >
          {formatAxis(value)}
        </div>
      ))}
      {layout.xTicks.map(({ x, d, i }) => {
        const rawPct = (x / W) * 100;
        const minPct = X_LABEL_EDGE_PCT;
        const maxPct = 100 - X_LABEL_EDGE_PCT;
        const xPct =
          i === 0
            ? Math.max(rawPct, minPct)
            : i === data.length - 1
              ? Math.min(rawPct, maxPct)
              : rawPct;
        const tx = i === 0 ? "0%" : i === data.length - 1 ? "-100%" : "-50%";
        return (
          <div
            key={i}
            className="pointer-events-none absolute whitespace-nowrap text-[10px] text-[var(--ink-3)]"
            style={{
              left: `${xPct}%`,
              bottom: X_LABEL_BOTTOM_PAD,
              transform: `translateX(${tx})`,
            }}
          >
            {formatX ? formatX(d) : d.date}
          </div>
        );
      })}
      {hasVolume && layout.volBaselineY != null && (
        <div
          className="pointer-events-none absolute text-[9px] text-[var(--ink-3)]"
          style={{
            left: `${((PAD_L - 10) / W) * 100}%`,
            top: mainHeight + VOL_GAP + 10,
            transform: "translate(-100%, 0)",
          }}
        >
          {volumeLabel}
        </div>
      )}
      {hovered &&
        (() => {
          const xPct = (hovered.x / W) * 100;
          const yPct = (hovered.y / height) * 100;
          // Flip to below the cursor when the point sits in the upper third,
          // so the tooltip never escapes the chart's overflow-hidden parent.
          const placeBelow = yPct < 35;
          const tx = xPct < 12 ? "0%" : xPct > 88 ? "-100%" : "-50%";
          const ty = placeBelow ? "16px" : "calc(-100% - 12px)";
          const delta =
            baselineValue == null ? null : hovered.d.value - baselineValue;
          const deltaPct =
            delta == null || baselineValue == null || baselineValue === 0
              ? 0
              : delta / baselineValue;
          const hoveredVolume =
            hover != null && volume ? volume[hover]?.value : null;
          return (
            <div
              className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-[var(--radius)] bg-[var(--ink)] px-2.5 py-1.5 text-[11px] text-[var(--bg)] shadow-[0_4px_8px_rgba(15,23,42,0.12)]"
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
              {delta != null && (
                <div
                  className="num text-[10px] font-medium"
                  style={{
                    color:
                      delta >= 0 ? "var(--accent-pos)" : "var(--accent-neg)",
                  }}
                >
                  {baselineLabel}{" "}
                  {formatDelta
                    ? formatDelta(delta, deltaPct)
                    : `${delta >= 0 ? "+" : ""}${formatCompact(delta)}`}
                </div>
              )}
              {hoveredVolume != null && hoveredVolume !== 0 && (
                <div
                  className="num text-[10px] font-medium"
                  style={{
                    color:
                      hoveredVolume >= 0
                        ? "var(--accent-pos)"
                        : "var(--accent-neg)",
                  }}
                >
                  {volumeLabel}{" "}
                  {formatVolume
                    ? formatVolume(hoveredVolume)
                    : `${hoveredVolume >= 0 ? "+" : ""}${formatCompact(hoveredVolume)}`}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function getSplitValue(
  baselineValue: number | undefined,
  splitAtZero: boolean,
) {
  if (baselineValue != null) return baselineValue;
  if (splitAtZero) return 0;
  return null;
}

interface VolumeBar {
  x: number;
  y: number;
  height: number;
  value: number;
  width: number;
}

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "—";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
