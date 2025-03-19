import { pgEnum } from "drizzle-orm/pg-core";

export const assetType = pgEnum("asset_type", [
  "cash",
  "mutual_fund",
  "thai_stock",
  "offshore_stock_dr",
  "us_stock",
  "us_stock_drx",
  "gold",
  "government_bond",
  "coperate_bond",
  "digital_asset",
]);

export const riskLevelType = pgEnum("risk_level_type", [
  "cash",
  "safe_core",
  "surface_core",
  "lower_satellite",
  "mid_satellite",
  "higher_satellite",
]);
