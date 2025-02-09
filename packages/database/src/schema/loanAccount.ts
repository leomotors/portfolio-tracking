import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const creditCardType = pgEnum("credit_card_type", [
  "visa",
  "mastercard",
  "american_express",
  "jcb",
  "unionpay",
]);

export const creditCardAccountTable = pgTable("credit_card_account", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  issuedBy: text("issued_by").notNull(),
  cardType: creditCardType("card_type").notNull(),
  cardNo: text("card_no").notNull(),
  creditLimit: numeric("credit_limit", { precision: 3, scale: 2 }).notNull(),
  creditLine: numeric("credit_line", { precision: 3, scale: 2 }).notNull(),
  statementDate: integer("statement_date").notNull(),
  interestFreePeriod: integer("interest_free_period").notNull(),
  openedAt: date("opened_at").notNull(),
});

export const personalLoanAccountTable = pgTable("personal_loan_account", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  issuedBy: text("issued_by").notNull(),
  creditLimit: numeric("credit_limit", { precision: 3, scale: 2 }).notNull(),
  openedAt: date("opened_at").notNull(),
});
