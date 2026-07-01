import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { currencyTable } from "./currency.ts";
import { riskLevelType } from "./types.ts";

export const realEstatePropertyType = pgEnum("real_estate_property_type", [
  "condominium",
  "detached_house",
  "townhouse",
  "land",
  "commercial",
  "other",
]);

export const realEstatePropertyTable = pgTable("real_estate_property", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  propertyType: realEstatePropertyType("property_type")
    .notNull()
    .default("other"),
  address: text(),
  latitude: numeric({ precision: 9, scale: 6 }),
  longitude: numeric({ precision: 9, scale: 6 }),
  areaSqm: numeric("area_sqm", { precision: 12, scale: 2 }),
  currencyId: integer("currency_id")
    .references(() => currencyTable.id)
    .notNull(),
  purchaseCost: numeric("purchase_cost").notNull().default("0"),
  currentValue: numeric("current_value").notNull().default("0"),
  valueUpdatedAt: timestamp("value_updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
  riskLevel: riskLevelType("risk_level").notNull().default("lower_satellite"),
  acquiredAt: date("acquired_at"),
  closedAt: date("closed_at"),
  notes: text()
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
});

export const realEstateDailyBalanceTable = pgTable(
  "real_estate_daily_balance",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    realEstatePropertyId: integer("real_estate_property_id")
      .references(() => realEstatePropertyTable.id, { onDelete: "cascade" })
      .notNull(),
    cost: numeric().notNull(),
    value: numeric().notNull(),
    date: date().notNull(),
  },
  (t) => [unique().on(t.realEstatePropertyId, t.date)],
);
