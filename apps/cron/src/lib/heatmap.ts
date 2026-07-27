import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

import { type AssetSnapshot, dayPnlDelta } from "./dayPerformers";

export type HeatmapCell = {
  id: number;
  label: string;
  assetClass: string;
  /** Current market value in THB — drives treemap area. */
  value: number;
  pnlDelta: number;
  /** Day change as % of previous market value. */
  changePct: number;
};

export type HeatmapRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  depth: number;
  label: string;
  changePct: number | null;
  fill: string;
};

export type HeatmapRenderOptions = {
  width?: number;
  height?: number;
  title?: string;
  /** Absolute % that maps to full green/red intensity. Defaults to max |changePct|. */
  colorScaleMax?: number;
};

const CLASS_LABEL: Record<string, string> = {
  cash: "Cash",
  bond: "Bond",
  stock: "Stock",
  gold: "Gold",
  digital_asset: "Digital",
};

const CLASS_ORDER = ["stock", "digital_asset", "gold", "bond", "cash"] as const;

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 720;
const TITLE_BAND = 44;
const MIN_COLOR_SCALE = 0.5;

type HierarchyDatum = {
  name: string;
  value?: number;
  changePct?: number;
  children?: HierarchyDatum[];
};

export function heatmapLabel(asset: {
  symbol: string | null;
  name: string;
}): string {
  const symbol = asset.symbol?.trim();
  if (symbol) return symbol;
  const name = asset.name.trim();
  return name.length > 18 ? `${name.slice(0, 16)}…` : name;
}

/**
 * Builds value-weighted day P/L cells for assets present in both snapshots.
 * `changePct` is day unrealized P/L delta as a percent of previous value.
 */
export function buildHeatmapCells(
  current: AssetSnapshot[],
  previousById: Map<number, { cost: number; value: number }>,
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];

  for (const asset of current) {
    if (!(asset.value > 0)) continue;
    const previous = previousById.get(asset.id);
    if (!previous) continue;

    const pnlDelta = dayPnlDelta(asset, previous);
    const changePct =
      previous.value === 0 ? 0 : (pnlDelta / previous.value) * 100;

    cells.push({
      id: asset.id,
      label: heatmapLabel(asset),
      assetClass: asset.assetClass,
      value: asset.value,
      pnlDelta,
      changePct,
    });
  }

  return cells.sort((a, b) => b.value - a.value);
}

export function colorScaleMax(cells: HeatmapCell[]): number {
  const max = cells.reduce((m, c) => Math.max(m, Math.abs(c.changePct)), 0);
  return Math.max(MIN_COLOR_SCALE, max);
}

/** FinViz-style red/green intensity around a neutral gray. */
export function changeToColor(changePct: number, scaleMax: number): string {
  const denom = scaleMax > 0 ? scaleMax : MIN_COLOR_SCALE;
  const t = Math.max(-1, Math.min(1, changePct / denom));
  if (Math.abs(t) < 0.02) {
    return "#3d4450";
  }

  const intensity = Math.abs(t);
  if (t > 0) {
    return mixHex("#1b4332", "#2dc653", intensity);
  }
  return mixHex("#4a1520", "#e63946", intensity);
}

function mixHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function classLabel(assetClass: string): string {
  return CLASS_LABEL[assetClass] ?? assetClass;
}

function classSortKey(assetClass: string): number {
  const idx = CLASS_ORDER.indexOf(assetClass as (typeof CLASS_ORDER)[number]);
  return idx === -1 ? CLASS_ORDER.length : idx;
}

function buildHierarchyData(cells: HeatmapCell[]): HierarchyDatum {
  const byClass = new Map<string, HeatmapCell[]>();
  for (const cell of cells) {
    const list = byClass.get(cell.assetClass) ?? [];
    list.push(cell);
    byClass.set(cell.assetClass, list);
  }

  const children = [...byClass.entries()]
    .sort(([a], [b]) => classSortKey(a) - classSortKey(b))
    .map(([assetClass, classCells]) => ({
      name: classLabel(assetClass),
      children: classCells.map((cell) => ({
        name: cell.label,
        value: cell.value,
        changePct: cell.changePct,
      })),
    }));

  return { name: "Portfolio", children };
}

export function layoutHeatmap(
  cells: HeatmapCell[],
  options: HeatmapRenderOptions = {},
): HeatmapRect[] {
  if (cells.length === 0) return [];

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const scaleMax = options.colorScaleMax ?? colorScaleMax(cells);

  const root = treemap<HierarchyDatum>()
    .tile(treemapSquarify)
    .size([width, height - TITLE_BAND])
    .paddingInner(3)
    .paddingOuter(4)
    .paddingTop((node) => (node.depth === 1 ? 24 : 2))(
    hierarchy(buildHierarchyData(cells))
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  const rects: HeatmapRect[] = [];

  for (const node of root.descendants()) {
    if (node.depth === 0) continue;

    const x0 = node.x0;
    const y0 = node.y0 + TITLE_BAND;
    const x1 = node.x1;
    const y1 = node.y1 + TITLE_BAND;

    if (node.depth === 1) {
      rects.push({
        x0,
        y0,
        x1,
        y1,
        depth: 1,
        label: node.data.name,
        changePct: null,
        fill: "#161b22",
      });
      continue;
    }

    const changePct = node.data.changePct ?? 0;
    rects.push({
      x0,
      y0,
      x1,
      y1,
      depth: 2,
      label: node.data.name,
      changePct,
      fill: changeToColor(changePct, scaleMax),
    });
  }

  return rects;
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatChangePct(changePct: number): string {
  const sign = changePct > 0 ? "+" : changePct < 0 ? "−" : "";
  return `${sign}${Math.abs(changePct).toFixed(2)}%`;
}

function textColorForFill(fill: string): string {
  const r = parseInt(fill.slice(1, 3), 16);
  const g = parseInt(fill.slice(3, 5), 16);
  const b = parseInt(fill.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0d1117" : "#f0f3f6";
}

/** Renders a FinViz-style gain/loss treemap as an SVG document string. */
export function renderHeatmapSvg(
  cells: HeatmapCell[],
  options: HeatmapRenderOptions = {},
): string | null {
  if (cells.length === 0) return null;

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const title = options.title ?? "Day Gain / Loss Heatmap";
  const rects = layoutHeatmap(cells, options);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#0d1117"/>`,
    `<text x="16" y="28" fill="#e6edf3" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700">${escapeXml(title)}</text>`,
    `<text x="${width - 16}" y="28" fill="#8b949e" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" text-anchor="end">Size = value · Color = day P/L %</text>`,
  ];

  for (const rect of rects) {
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;
    if (w < 1 || h < 1) continue;

    parts.push(
      `<rect x="${rect.x0.toFixed(2)}" y="${rect.y0.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${rect.fill}" stroke="#0d1117" stroke-width="1.5" rx="3"/>`,
    );

    if (rect.depth === 1) {
      if (w >= 48) {
        parts.push(
          `<text x="${(rect.x0 + 8).toFixed(2)}" y="${(rect.y0 + 16).toFixed(2)}" fill="#8b949e" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">${escapeXml(rect.label)}</text>`,
        );
      }
      continue;
    }

    if (w < 36 || h < 28 || rect.changePct == null) continue;

    const fillText = textColorForFill(rect.fill);
    const cx = (rect.x0 + rect.x1) / 2;
    const canShowLabel = h >= 42 && w >= 52;
    const pct = formatChangePct(rect.changePct);

    if (canShowLabel) {
      const fontSize = Math.min(15, Math.max(10, w / 8));
      parts.push(
        `<text x="${cx.toFixed(2)}" y="${(rect.y0 + h / 2 - 4).toFixed(2)}" fill="${fillText}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize.toFixed(1)}" font-weight="700" text-anchor="middle">${escapeXml(rect.label)}</text>`,
        `<text x="${cx.toFixed(2)}" y="${(rect.y0 + h / 2 + 14).toFixed(2)}" fill="${fillText}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${Math.max(10, fontSize - 1).toFixed(1)}" text-anchor="middle" opacity="0.92">${pct}</text>`,
      );
    } else if (w >= 44) {
      parts.push(
        `<text x="${cx.toFixed(2)}" y="${(rect.y0 + h / 2 + 4).toFixed(2)}" fill="${fillText}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${pct}</text>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join("");
}
