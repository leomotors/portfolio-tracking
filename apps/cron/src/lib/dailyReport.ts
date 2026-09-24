import { db } from "@repo/database/client";
import {
  type DailyReportMovers,
  type DailyReportNetworth,
  dailyReportTable,
} from "@repo/database/schema";
import { type HeatmapCell } from "@repo/heatmap";

import { environment } from "@/core/environment.js";
import { logger } from "@/core/logger.js";

export type DailyReportPayload = {
  date: string;
  cells: HeatmapCell[];
  colorScaleMax: number;
  networth: DailyReportNetworth | null;
  movers: DailyReportMovers | null;
};

/**
 * Stores the day's Discord cards for dashboard history.
 * First successful run for a date wins (`onConflictDoNothing`), matching
 * daily balance snapshots. Soft-fails so a missing table never blocks the
 * Discord summary.
 */
export async function saveDailyReport(
  payload: DailyReportPayload,
): Promise<void> {
  if (payload.cells.length === 0) {
    logger.log("No heatmap cells to persist.");
    return;
  }

  const parts = [
    `${payload.cells.length} cells`,
    payload.networth ? "networth" : null,
    payload.movers ? "movers" : null,
  ].filter(Boolean);

  logger.log(
    `Persisting heatmap_daily for ${payload.date} (${parts.join(", ")})`,
  );

  if (environment.DRY_RUN) {
    logger.log("Dry run: skipping heatmap_daily insert.");
    return;
  }

  try {
    await db
      .insert(dailyReportTable)
      .values({
        date: payload.date,
        cells: payload.cells,
        colorScaleMax: String(payload.colorScaleMax),
        networth: payload.networth,
        movers: payload.movers,
      })
      .onConflictDoNothing()
      .execute();
  } catch (error) {
    logger.error(
      `Failed to persist daily report: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
