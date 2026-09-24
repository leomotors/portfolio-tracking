import {
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One cron-day archive (`heatmap_daily`). Heatmap cells, net-worth bento,
 * and movers/lending bento are captured together. Discord PNGs are rasters
 * of the same JSON and are not stored. Older rows have null networth/movers.
 */
export type HeatmapDailyCell = {
  id: number;
  label: string;
  assetClass: string;
  value: number;
  pnlDelta: number;
  changePct: number;
};

export type DailyReportPerformer = {
  name: string;
  delta: number;
};

export type DailyReportLending = {
  name: string;
  leftoverUsd: number;
  cashUsd: number;
  borrowedUsd: number;
  protocolHealthFactor: number | null;
};

export type DailyReportNetworth = {
  asOfLabel: string;
  asOfTime: string;
  netWorth: number;
  netDelta: number | null;
  bank: number;
  bankDelta: number | null;
  investCost: number;
  investValue: number;
  investValueDelta: number | null;
  realEstate: number;
  realEstateDelta: number | null;
  hasRealEstate: boolean;
  allTimePnl: number;
  allTimePnlDelta: number | null;
  takenPnl: number;
  hasTakenPnl: boolean;
};

export type DailyReportMovers = {
  asOfLabel: string;
  top: DailyReportPerformer | null;
  worst: DailyReportPerformer | null;
  lending: DailyReportLending[];
};

export const dailyReportTable = pgTable("heatmap_daily", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  date: date().notNull().unique(),
  cells: jsonb().$type<HeatmapDailyCell[]>().notNull(),
  colorScaleMax: numeric("color_scale_max").notNull(),
  networth: jsonb().$type<DailyReportNetworth>(),
  movers: jsonb().$type<DailyReportMovers>(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});
