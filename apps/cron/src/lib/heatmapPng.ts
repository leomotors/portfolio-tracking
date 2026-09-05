import sharp from "sharp";

import {
  buildHeatmapCells,
  type HeatmapAssetSnapshot,
  type HeatmapCell,
  type HeatmapRenderOptions,
  renderHeatmapSvg,
} from "@repo/heatmap";

export type { HeatmapCell };

/**
 * Renders a day gain/loss heatmap PNG from pre/post run asset snapshots.
 * Returns null when there are no overlapping held assets to plot.
 */
export async function renderDayHeatmapPng(
  current: HeatmapAssetSnapshot[],
  previousById: Map<number, { cost: number; value: number }>,
  options: HeatmapRenderOptions = {},
): Promise<Buffer | null> {
  return renderHeatmapPngFromCells(
    buildHeatmapCells(current, previousById),
    options,
  );
}

export async function renderHeatmapPngFromCells(
  cells: HeatmapCell[],
  options: HeatmapRenderOptions = {},
): Promise<Buffer | null> {
  const svg = renderHeatmapSvg(cells, options);
  if (!svg) return null;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
