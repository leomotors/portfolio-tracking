import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const assetType = pgEnum("asset_type", [
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

export const investmentAccountTable = pgTable("investment_account", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  accountNo: text("account_no").notNull().unique(),
  currentCost: numeric("current_cost").notNull().default("0"),
  currentValue: numeric("current_value").notNull().default("0"),
  openedAt: date("opened_at"),
  assetTypes: assetType("asset_types")
    .array()
    .default(sql`ARRAY[]::asset_type[]`),
});

export const investmentDailyBalanceTable = pgTable(
  "investment_daily_balance",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    investmentAccountId: integer("investment_account_id")
      .references(() => investmentAccountTable.id, { onDelete: "cascade" })
      .notNull(),
    cost: numeric().notNull(),
    value: numeric().notNull(),
    date: date().notNull(),
  },
  (t) => [unique().on(t.investmentAccountId, t.date)],
);
