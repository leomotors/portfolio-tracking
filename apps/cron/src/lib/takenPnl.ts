import { and, eq, lte, sql } from "drizzle-orm";

import { db } from "@repo/database/client";
import { pnlEventTable } from "@repo/database/schema";

import { logger } from "@/core/logger.js";

/**
 * A `withdrawn` pnl_event takes profit out of an investment account: the
 * positions leave (`current_value` −W) and the ledger writes
 * `cost_delta = −(W − P) × fx` into `current_cost`. Account P/L therefore
 * drops by exactly the realized profit P on the day of the withdrawal,
 * even though nothing lost value.
 *
 * Summing the withdrawn rows adds that profit back, so the summary reports
 * the same all-time figure as the dashboard's All-time P/L KPI
 * (`open + taken`) instead of a phantom loss.
 *
 * `pnl` is native to `currency_id`; `value_in_thb` is the FX snapshot taken
 * when the event was booked, so the THB total does not drift with the live
 * rate. `in_account` / `undocumented` rows touch neither cost nor value and
 * are excluded.
 */
export async function loadTakenPnlThb(asOf: string | null): Promise<number> {
  const withdrawn = eq(pnlEventTable.kind, "withdrawn");

  try {
    const [row] = await db
      .select({
        total: sql<
          string | null
        >`sum(${pnlEventTable.pnl} * ${pnlEventTable.valueInTHB})`,
      })
      .from(pnlEventTable)
      .where(
        asOf == null
          ? withdrawn
          : and(withdrawn, lte(pnlEventTable.occurredOn, asOf)),
      )
      .execute();

    const total = Number(row?.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  } catch (error) {
    if (!isPnlEventUnavailable(error)) throw error;
    logger.log("pnl_event is not migrated yet; taken P/L treated as 0.");
    return 0;
  }
}

/**
 * Soft-fail only for a missing `pnl_event` table/column, so a cron running
 * ahead of the migration still posts its summary. Any other undefined
 * table — a real schema drift — must still surface as an error.
 */
function isPnlEventUnavailable(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    const code = "code" in current ? String(current.code) : "";
    const message = "message" in current ? String(current.message) : "";
    const namesTable =
      message.includes("pnl_event") ||
      ("table" in current && String(current.table) === "pnl_event");
    if (namesTable && (code === "42P01" || code === "42703")) return true;
    if (namesTable && message.toLowerCase().includes("does not exist")) {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
