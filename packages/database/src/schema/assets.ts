import {
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { currencyTable } from "./currency.ts";
import { assetType, riskLevelType } from "./types.ts";

export const assetTable = pgTable("asset", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  symbol: text().notNull(),
  assetType: assetType("asset_type").notNull(),
  riskLevel: riskLevelType("risk_level").notNull(),
  amount: decimal().notNull().default("0"),
  unit: text().notNull(),
  averageCost: decimal("average_cost").notNull().default("0"),
  currentPrice: decimal("current_price").notNull().default("0"),
  currencyId: integer("currency_id")
    .references(() => currencyTable.id)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
