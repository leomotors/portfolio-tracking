import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { currencyTable } from "./currency.ts";
import { investmentAccountTable } from "./investmentAccount.ts";

/**
 * Realized P/L ledger. Two jobs, one table:
 *
 * - `in_account` / `undocumented`: explain the residual between account P/L
 *   and open-position P/L. Log only; never changes cost.
 * - `withdrawn`: cash left the account. Writes `cost_delta` so remaining
 *   return % stays honest, and the row is the portfolio add-back for P/L
 *   that is no longer inside any investment account.
 *
 * `undocumented` is optional. The unexplained leftover is derived live;
 * booking a row just closes that line as a lump.
 *
 * `pnl` and `withdraw_amount` are native to `currency_id`. `value_in_thb`
 * is the FX snapshot so leftover / lifetime / `cost_delta` stay in THB
 * without drifting when the live rate moves. `cost_delta` is always THB:
 * `-(withdraw − pnl) × fx`, matching `investment_account.current_cost`.
 */
export const pnlEventKind = pgEnum("pnl_event_kind", [
  "in_account",
  "withdrawn",
  "undocumented",
]);

export const pnlEventTable = pgTable(
  "pnl_event",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    investmentAccountId: integer("investment_account_id")
      .references(() => investmentAccountTable.id, { onDelete: "cascade" })
      .notNull(),
    kind: pnlEventKind("kind").notNull(),
    occurredOn: date("occurred_on").notNull(),
    currencyId: integer("currency_id")
      .references(() => currencyTable.id)
      .notNull(),
    /** FX at event time. Native `pnl` / `withdraw_amount` × this is THB. */
    valueInTHB: numeric("value_in_thb").notNull(),
    pnl: numeric("pnl").notNull(),
    withdrawAmount: numeric("withdraw_amount"),
    costDelta: numeric("cost_delta").notNull().default("0"),
    note: text(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pnl_event_account_occurred_on_idx").on(
      t.investmentAccountId,
      t.occurredOn,
    ),
    index("pnl_event_kind_occurred_on_idx").on(t.kind, t.occurredOn),
    check(
      "pnl_event_kind_shape",
      sql`(
        (
          ${t.kind} in ('in_account', 'undocumented')
          and ${t.withdrawAmount} is null
          and ${t.costDelta} = 0
        )
        or (
          ${t.kind} = 'withdrawn'
          and ${t.withdrawAmount} is not null
          and ${t.withdrawAmount} > 0
        )
      )`,
    ),
  ],
);
