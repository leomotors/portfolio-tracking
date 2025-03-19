import { pgEnum } from "drizzle-orm/pg-core";

export const investmentType = pgEnum("investment_type", [
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

export const symbolType = pgEnum("symbol_type", [
  "thai_stock",
  "thai_mutual_fund",
  "offshore_stock",
  "cryptocurrency",
]);

export const assetType = pgEnum("asset_type", [
  "thai_cash",
  "thai_fixed_cash",
  "foreign_cash",
  "thai_stock",
  "offshore_stock",
  "gold",
  "thai_government_bond",
  "thai_coperate_bond",
  "foreign_government_bond",
  "foreign_coperate_bond",
  "digital_asset",
]);

export const assetClassType = pgEnum("asset_class_type", [
  "cash",
  "bond",
  "stock",
  "gold",
  "digital_asset",
]);

export const riskLevelType = pgEnum("risk_level_type", [
  "safe_core",
  "surface_core",
  "lower_satellite",
  "mid_satellite",
  "higher_satellite",
]);
