import sharp from "sharp";

import { type AssetSnapshot } from "./dayPerformers";
import {
  buildHeatmapCells,
  type HeatmapRenderOptions,
  renderHeatmapSvg,
} from "./heatmap";

/**
 * Renders a day gain/loss heatmap PNG from pre/post run asset snapshots.
 * Returns null when there are no overlapping held assets to plot.
 */
export async function renderDayHeatmapPng(
  current: AssetSnapshot[],
  previousById: Map<number, { cost: number; value: number }>,
  options: HeatmapRenderOptions = {},
): Promise<Buffer | null> {
  const cells = buildHeatmapCells(current, previousById);
  const svg = renderHeatmapSvg(cells, options);
  if (!svg) return null;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
