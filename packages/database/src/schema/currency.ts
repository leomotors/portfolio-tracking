import {
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const currencyTable = pgTable(
  "currency",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    symbol: text().notNull(),
    variant: text(),
    valueInTHB: decimal("value_in_thb").notNull().default("0"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [unique().on(table.symbol, table.variant).nullsNotDistinct()],
);
