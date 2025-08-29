import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { investmentType } from "./types.ts";

export const investmentAccountTable = pgTable("investment_account", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  accountNo: text("account_no").notNull().unique(),
  currentCost: numeric("current_cost").notNull().default("0"),
  currentValue: numeric("current_value").notNull().default("0"),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  investmentTypes: investmentType("investment_types")
    .array()
    .default(sql`ARRAY[]::investment_type[]`),
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
