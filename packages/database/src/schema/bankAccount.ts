import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const bankAccountType = pgEnum("bank_account_type", [
  "savings",
  "e_savings",
  "fixed",
  "fcd",
]);

export const bankAccountTable = pgTable("bank_account", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  bank: text().notNull(),
  branch: text(),
  accountNo: text("account_no").notNull().unique(),
  currentBalance: numeric("current_balance").notNull().default("0"),
  interestRate: numeric("interest_rate").notNull().default("0"),
  accountType: bankAccountType("account_type"),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  remarks: text()
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});

export const bankDailyBalanceTable = pgTable("bank_daily_balance", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  bankAccountId: integer("bank_account_id")
    .references(() => bankAccountTable.id, { onDelete: "cascade" })
    .notNull(),
  balance: numeric().notNull(),
  date: date().notNull(),
});
