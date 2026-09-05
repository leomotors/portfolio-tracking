"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  formatChangePct,
  HEATMAP_FONT_FAMILY,
  HEATMAP_HEIGHT,
  HEATMAP_WIDTH,
  type HeatmapCell,
  heatmapGroupLabelVisible,
  heatmapLeafLabelMode,
  type HeatmapRect,
  textColorForFill,
} from "@repo/heatmap";

import { Sensitive } from "@/components/app/sensitive";
import { compactThb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

type ViewBox = { x: number; y: number; w: number; h: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const FULL_VIEW: ViewBox = {
  x: 0,
  y: 0,
  w: HEATMAP_WIDTH,
  h: HEATMAP_HEIGHT,
};

function clampViewBox(next: ViewBox): ViewBox {
  const w = Math.min(HEATMAP_WIDTH, Math.max(HEATMAP_WIDTH / MAX_ZOOM, next.w));
  const h = w * (HEATMAP_HEIGHT / HEATMAP_WIDTH);
  return {
    x: Math.min(Math.max(0, next.x), HEATMAP_WIDTH - w),
    y: Math.min(Math.max(0, next.y), HEATMAP_HEIGHT - h),
    w,
    h,
  };
}

function zoomOf(view: ViewBox): number {
  return HEATMAP_WIDTH / view.w;
}

function clientToSvg(
  svg: SVGSVGElement,
  view: ViewBox,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const t = (clientX - rect.left) / Math.max(rect.width, 1);
  const u = (clientY - rect.top) / Math.max(rect.height, 1);
  return { x: view.x + t * view.w, y: view.y + u * view.h };
}

function zoomAt(
  view: ViewBox,
  anchor: { x: number; y: number },
  nextZoom: number,
): ViewBox {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  const w = HEATMAP_WIDTH / z;
  const h = HEATMAP_HEIGHT / z;
  const t = view.w === 0 ? 0.5 : (anchor.x - view.x) / view.w;
  const u = view.h === 0 ? 0.5 : (anchor.y - view.y) / view.h;
  return clampViewBox({ x: anchor.x - t * w, y: anchor.y - u * h, w, h });
}

interface HeatmapTreemapProps {
  rects: HeatmapRect[];
  title: string;
  classFilter: string | null;
  selectedId: number | null;
  onSelect: (cell: HeatmapCell | null) => void;
}

export function HeatmapTreemap({
  rects,
  title,
  classFilter,
  selectedId,
  onSelect,
}: HeatmapTreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const [view, setView] = useState<ViewBox>(FULL_VIEW);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [hover, setHover] = useState<{
    cell: HeatmapCell;
    x: number;
    y: number;
  } | null>(null);
  const drag = useRef<{
    pointerId: number;
    origin: { x: number; y: number };
    start: ViewBox;
  } | null>(null);
  const skipClick = useRef(false);
  const zoom = zoomOf(view);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = viewRef.current;
      const currentZoom = zoomOf(current);
      const anchor = clientToSvg(svg, current, event.clientX, event.clientY);
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView(zoomAt(current, anchor, currentZoom * factor));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const panByPointer = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      const state = drag.current;
      if (!svg || !state) return;
      const origin = clientToSvg(
        svg,
        state.start,
        state.origin.x,
        state.origin.y,
      );
      const now = clientToSvg(svg, state.start, event.clientX, event.clientY);
      setView(
        clampViewBox({
          ...state.start,
          x: state.start.x - (now.x - origin.x),
          y: state.start.y - (now.y - origin.y),
        }),
      );
    },
    [],
  );

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        className={cn(
          "block h-auto w-full touch-none select-none rounded-[var(--radius)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
          zoom > 1.01 ? "cursor-grab" : "cursor-default",
        )}
        onPointerDown={(event) => {
          if (event.button !== 0 || zoom <= 1.01) return;
          drag.current = {
            pointerId: event.pointerId,
            origin: { x: event.clientX, y: event.clientY },
            start: view,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId === event.pointerId) {
            skipClick.current = true;
            panByPointer(event);
            return;
          }
          if (hover) {
            setHover({ ...hover, x: event.clientX, y: event.clientY });
          }
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId === event.pointerId) {
            drag.current = null;
            window.setTimeout(() => {
              skipClick.current = false;
            }, 0);
          }
        }}
        onPointerLeave={() => {
          if (!drag.current) setHover(null);
        }}
        onDoubleClick={(event) => {
          const svg = svgRef.current;
          if (!svg) return;
          const anchor = clientToSvg(svg, view, event.clientX, event.clientY);
          setView(zoomAt(view, anchor, zoom * 1.8));
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            setView(
              zoomAt(
                view,
                { x: view.x + view.w / 2, y: view.y + view.h / 2 },
                zoom * 1.25,
              ),
            );
          } else if (event.key === "-" || event.key === "_") {
            event.preventDefault();
            setView(
              zoomAt(
                view,
                { x: view.x + view.w / 2, y: view.y + view.h / 2 },
                zoom / 1.25,
              ),
            );
          } else if (event.key === "0") {
            event.preventDefault();
            setView(FULL_VIEW);
          } else if (event.key === "Escape") {
            onSelect(null);
            setHover(null);
          }
        }}
      >
        <title id={titleId}>{title}</title>
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fill="#0d1117"
        />
        <text
          x={16}
          y={28}
          fill="#e6edf3"
          fontFamily={HEATMAP_FONT_FAMILY}
          fontSize={20}
          fontWeight={700}
        >
          {title}
        </text>
        <text
          x={HEATMAP_WIDTH - 16}
          y={28}
          fill="#8b949e"
          fontFamily={HEATMAP_FONT_FAMILY}
          fontSize={13}
          textAnchor="end"
        >
          Size = value · Color = day P/L %
        </text>
        {rects.map((rect, index) => {
          const w = rect.x1 - rect.x0;
          const h = rect.y1 - rect.y0;
          if (w < 1 || h < 1) return null;

          const dimmed =
            classFilter != null &&
            rect.assetClass != null &&
            rect.assetClass !== classFilter;
          const selected = rect.cell != null && rect.cell.id === selectedId;
          const leaf = rect.depth === 2 && rect.cell != null;
          const mode = leaf ? heatmapLeafLabelMode(w, h, zoom) : "none";
          const fillText = textColorForFill(rect.fill);
          const cx = (rect.x0 + rect.x1) / 2;
          const fontSize = Math.min(15, Math.max(10, w / 8));

          return (
            <g
              key={`${rect.depth}-${rect.label}-${index}`}
              opacity={dimmed ? 0.22 : 1}
              onPointerEnter={(event) => {
                if (!rect.cell) return;
                setHover({
                  cell: rect.cell,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onPointerLeave={() => {
                if (!drag.current) setHover(null);
              }}
              onClick={() => {
                if (skipClick.current) {
                  skipClick.current = false;
                  return;
                }
                if (rect.cell) onSelect(rect.cell);
              }}
              className={leaf ? "cursor-pointer" : undefined}
            >
              <rect
                x={rect.x0}
                y={rect.y0}
                width={w}
                height={h}
                fill={rect.fill}
                stroke={selected ? "#f0f3f6" : "#0d1117"}
                strokeWidth={selected ? 2.5 : 1.5}
                rx={3}
              />
              {rect.depth === 1 && heatmapGroupLabelVisible(w, zoom) && (
                <text
                  x={rect.x0 + 8}
                  y={rect.y0 + 16}
                  fill="#8b949e"
                  fontFamily={HEATMAP_FONT_FAMILY}
                  fontSize={12}
                  fontWeight={600}
                >
                  {rect.label}
                </text>
              )}
              {leaf && rect.changePct != null && mode === "full" && (
                <>
                  <text
                    x={cx}
                    y={rect.y0 + h / 2 - 4}
                    fill={fillText}
                    fontFamily={HEATMAP_FONT_FAMILY}
                    fontSize={fontSize}
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    {rect.label}
                  </text>
                  <text
                    x={cx}
                    y={rect.y0 + h / 2 + 14}
                    fill={fillText}
                    fontFamily={HEATMAP_FONT_FAMILY}
                    fontSize={Math.max(10, fontSize - 1)}
                    textAnchor="middle"
                    opacity={0.92}
                  >
                    {formatChangePct(rect.changePct)}
                  </text>
                </>
              )}
              {leaf && rect.changePct != null && mode === "pct" && (
                <text
                  x={cx}
                  y={rect.y0 + h / 2 + 4}
                  fill={fillText}
                  fontFamily={HEATMAP_FONT_FAMILY}
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  {formatChangePct(rect.changePct)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute top-3 right-3 flex gap-1">
        <ZoomButton
          label="Zoom in"
          onClick={() =>
            setView(
              zoomAt(
                view,
                { x: view.x + view.w / 2, y: view.y + view.h / 2 },
                zoom * 1.25,
              ),
            )
          }
        >
          +
        </ZoomButton>
        <ZoomButton
          label="Zoom out"
          onClick={() =>
            setView(
              zoomAt(
                view,
                { x: view.x + view.w / 2, y: view.y + view.h / 2 },
                zoom / 1.25,
              ),
            )
          }
        >
          −
        </ZoomButton>
        <ZoomButton label="Reset view" onClick={() => setView(FULL_VIEW)}>
          1×
        </ZoomButton>
      </div>

      {hover && (
        <div
          data-testid="heatmap-tooltip"
          className="pointer-events-none fixed z-40 min-w-[168px] rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 text-[12px] shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 196),
            top: Math.min(hover.y + 12, window.innerHeight - 120),
          }}
        >
          <div className="font-semibold text-[var(--ink)]">
            {hover.cell.label}
          </div>
          <div className="mt-0.5 text-[var(--ink-3)]">
            {hover.cell.assetClass.replaceAll("_", " ")}
          </div>
          <div className="mt-1.5 flex flex-col gap-0.5 font-mono tabular-nums">
            <span>
              Value <Sensitive>{compactThb(hover.cell.value)}</Sensitive>
            </span>
            <span
              className={
                hover.cell.pnlDelta >= 0
                  ? "text-[var(--accent-pos)]"
                  : "text-[var(--accent-neg)]"
              }
            >
              <Sensitive>{compactThb(hover.cell.pnlDelta)}</Sensitive>{" "}
              {formatChangePct(hover.cell.changePct)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-[#30363d] bg-[#161b22]/90 text-[13px] font-medium text-[#e6edf3] hover:bg-[#21262d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
    >
      {children}
    </button>
  );
}
