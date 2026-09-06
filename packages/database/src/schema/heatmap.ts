import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One day-gain/loss heatmap, captured at cron time from pre/post price
 * snapshots. JSON cells are the source of truth; the Discord PNG is a
 * raster of the same payload and is not stored.
 */
export type HeatmapDailyCell = {
  id: number;
  label: string;
  assetClass: string;
  value: number;
  pnlDelta: number;
  changePct: number;
};

export const heatmapDailyTable = pgTable("heatmap_daily", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  date: date().notNull().unique(),
  cells: jsonb().$type<HeatmapDailyCell[]>().notNull(),
  colorScaleMax: numeric("color_scale_max").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});
