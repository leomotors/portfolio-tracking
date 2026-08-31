"use client";

import { useState } from "react";

import { Sensitive } from "@/components/app/sensitive";
import { PRIVACY_MASK } from "@/lib/privacy-mode";
import { cn } from "@/lib/utils";

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
  /** Always render the legend below the chart — for narrow containers
   * where the viewport-based two-column layout would overflow. */
  stacked?: boolean;
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
  stacked = false,
}: DonutProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;

  const fracs = data.map((d) => (total === 0 ? 0 : d.value / total));
  const segs = data.map((d, i) => {
    const before = fracs.slice(0, i).reduce((s, f) => s + f, 0);
    return {
      ...d,
      start: before,
      end: before + fracs[i]!,
      frac: fracs[i]!,
    };
  });

  const active = hovered != null ? segs[hovered] : undefined;
  const displayLabel = active ? truncate(active.label, 22) : centerLabel;
  const hoverAmount = active
    ? valueFormatter
      ? valueFormatter(active.value)
      : formatPercent(active.frac)
    : undefined;
  const hoverShare = active ? formatPercent(active.frac) : undefined;

  const description =
    segs.length === 0
      ? emptyLabel
      : segs.map((s) => `${s.label} ${formatPercent(s.frac)}`).join(", ");
  const label = ariaLabel ?? "Allocation chart";

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 items-center gap-5",
        !stacked && "sm:grid-cols-[minmax(9rem,max-content)_minmax(0,1fr)]",
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${description}`}
        className="mx-auto max-w-full shrink-0 overflow-visible"
        onMouseLeave={() => setHovered(null)}
      >
        <title>{label}</title>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--track)"
          strokeWidth={thickness}
        />
        {segs.map((s, i) => (
          <path
            key={i}
            d={arcPath(c, r, s.start, s.end)}
            fill="none"
            stroke={s.color}
            strokeWidth={hovered === i ? thickness + 5 : thickness}
            aria-hidden="true"
            onMouseEnter={() => setHovered(i)}
            style={{
              filter: "drop-shadow(0 1px 0 rgb(0 0 0 / 0.06))",
              opacity: hovered === null || hovered === i ? 1 : 0.35,
              transition: "stroke-width 200ms ease, opacity 200ms ease",
            }}
          />
        ))}
        {displayLabel && (
          <text
            x={c}
            y={c - 6}
            textAnchor="middle"
            fill="var(--ink-2)"
            fontSize="11"
            fontWeight="500"
            pointerEvents="none"
          >
            {displayLabel}
          </text>
        )}
        {active && hoverAmount && hoverShare ? (
          <CenterFigure
            c={c}
            size={size}
            value={hoverAmount}
            mask={hoverShare}
          />
        ) : (
          centerValue && (
            <CenterFigure
              c={c}
              size={size}
              value={centerValue}
              mask={PRIVACY_MASK}
            />
          )
        )}
      </svg>

      <div className="grid min-w-0 gap-1.5">
        {segs.length === 0 && (
          <span className="text-[12px] text-[var(--ink-2)]">{emptyLabel}</span>
        )}
        {segs.map((s, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors duration-150",
              hovered === i && "bg-[var(--surface-2)]",
            )}
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
                <Sensitive
                  className={cn(
                    "num text-[11px] text-[var(--ink-2)]",
                    stacked ? "inline" : "hidden md:inline",
                  )}
                >
                  {valueFormatter(s.value)}
                </Sensitive>
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

function CenterFigure({
  c,
  size,
  value,
  mask,
}: {
  c: number;
  size: number;
  value: string;
  mask: string;
}) {
  const fontSize = Math.max(
    12,
    Math.min(16, size / Math.max(12, value.length * 0.75)),
  );
  const props = {
    x: c,
    y: c + 14,
    textAnchor: "middle" as const,
    fill: "var(--ink)",
    fontSize,
    fontWeight: 600,
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    pointerEvents: "none" as const,
  };
  return (
    <>
      <text {...props} data-privacy-value>
        {value}
      </text>
      <text {...props} data-privacy-mask>
        {mask}
      </text>
    </>
  );
}

/**
 * Explicit arc geometry instead of stroke-dasharray phase tricks: dashes that
 * terminate exactly on the circle's path seam render glitchy wedges in some
 * browsers (seen on the segment ending at 12 o'clock).
 */
function arcPath(c: number, r: number, startFrac: number, endFrac: number) {
  const span = endFrac - startFrac;
  if (span >= 0.9999) {
    // A single arc command can't span the full circle — its endpoints would
    // coincide and the arc would collapse to nothing.
    return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r}`;
  }
  const a0 = 2 * Math.PI * startFrac - Math.PI / 2;
  const a1 = 2 * Math.PI * endFrac - Math.PI / 2;
  const x0 = round(c + r * Math.cos(a0));
  const y0 = round(c + r * Math.sin(a0));
  const x1 = round(c + r * Math.cos(a1));
  const y1 = round(c + r * Math.sin(a1));
  return `M ${x0} ${y0} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}
