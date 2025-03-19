import {
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { currencyTable } from "./currency.ts";
import {
  assetClassType,
  assetType,
  riskLevelType,
  symbolType,
} from "./types.ts";
import { investmentAccountTable } from "./investmentAccount.ts";

export const assetTable = pgTable("asset", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  symbol: text(),
  investmentAccountId: integer("investment_account_id")
    .references(() => investmentAccountTable.id)
    .notNull(),
  symbolType: symbolType("symbol_type"),
  assetType: assetType("asset_type").notNull(),
  assetClass: assetClassType("asset_class").notNull(),
  riskLevel: riskLevelType("risk_level").notNull(),
  amount: decimal().notNull().default("0"),
  unit: text().notNull(),
  averageCost: decimal("average_cost").notNull().default("1"),
  currentPrice: decimal("current_price").notNull().default("1"),
  currencyId: integer("currency_id")
    .references(() => currencyTable.id)
    .notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
