import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Maps `asset.symbol` → SEC project id for the cron price step.
 *
 * One row per fund class (not per holding): a project can list several
 * classes, so `SCBNDQ(A)` and `SCBNDQ(E)` both point at `M0311_2564` and the
 * symbol doubles as the `fund_class_name` filter. Edit via SQL or the
 * dashboard Settings page. `symbol_type = thai_mutual_fund` still selects the
 * SEC scraper; this table only supplies the remote id.
 */
export const secFundSymbolTable = pgTable("sec_fund_symbol", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  symbol: text().notNull().unique(),
  projectId: text("project_id").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
