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

export const bankAccountType = pgEnum("bank_account_type", [
  "savings",
  "e_savings",
  "fixed",
]);

export const bankAccountTable = pgTable(
  "bank_account",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    bank: text().notNull(),
    branch: text(),
    accountNo: text("account_no").notNull(),
    currentBalance: numeric("current_balance").notNull().default("0"),
    interestRate: numeric("interest_rate").notNull().default("0"),
    accountType: bankAccountType("account_type"),
    openedAt: date("opened_at"),
    closedAt: date("closed_at"),
    remarks: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
  },
  (t) => [unique().on(t.bank, t.accountNo)],
);

export const fcdAccountTable = pgTable(
  "fcd_account",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    bank: text().notNull(),
    branch: text(),
    accountNo: text("account_no").notNull(),
    currency: text().notNull(),
    interestRate: numeric("interest_rate").notNull().default("0"),
    openedAt: date("opened_at"),
    closedAt: date("closed_at"),
    remarks: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
  },
  (t) => [unique().on(t.bank, t.accountNo)],
);

export const bankDailyBalanceTable = pgTable(
  "bank_daily_balance",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    bankAccountId: integer("bank_account_id")
      .references(() => bankAccountTable.id, { onDelete: "cascade" })
      .notNull(),
    balance: numeric().notNull(),
    date: date().notNull(),
  },
  (t) => [unique().on(t.bankAccountId, t.date)],
);
