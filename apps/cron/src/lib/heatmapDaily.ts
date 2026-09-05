import { db } from "@repo/database/client";
import { heatmapDailyTable } from "@repo/database/schema";
import { type HeatmapCell } from "@repo/heatmap";

import { environment } from "@/core/environment.js";
import { logger } from "@/core/logger.js";

/**
 * Stores the day's heatmap cells for dashboard history.
 * First successful run for a date wins (`onConflictDoNothing`), matching
 * daily balance snapshots. Soft-fails so a missing table (pre-migration)
 * never blocks the Discord summary.
 */
export async function saveHeatmapDaily(
  date: string,
  cells: HeatmapCell[],
  scaleMax: number,
): Promise<void> {
  if (cells.length === 0) {
    logger.log("No heatmap cells to persist.");
    return;
  }

  logger.log(
    `Persisting heatmap_daily for ${date} (${cells.length} cells, scaleMax=${scaleMax.toFixed(2)})`,
  );

  if (environment.DRY_RUN) {
    logger.log("Dry run: skipping heatmap_daily insert.");
    return;
  }

  try {
    await db
      .insert(heatmapDailyTable)
      .values({
        date,
        cells,
        colorScaleMax: String(scaleMax),
      })
      .onConflictDoNothing()
      .execute();
  } catch (error) {
    logger.error(
      `Failed to persist heatmap: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
