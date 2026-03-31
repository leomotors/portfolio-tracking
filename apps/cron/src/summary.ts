import { count, eq, sql, sum } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  bankAccountTable,
  bankDailyBalanceTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
} from "@repo/database/schema";

import { formatDate, getYesterday } from "@/lib/date";
import { circleEmojiSuffix } from "@/lib/summaryCircles";

export type PreviousDailySnapshot = {
  date: string;
  totalBank: number;
  totalCost: number;
  totalValue: number;
};

export type SummaryResult = {
  /** Space + circle emojis, or empty */
  circleSuffix: string;
  /** Body lines (no leading ##) */
  body: string;
};

const f = Intl.NumberFormat("en-US");

function formatSignedThbDelta(delta: number): string {
  if (Object.is(delta, 0) || Math.abs(delta) < 1e-6) {
    return "";
  }
  const sign = delta >= 0 ? "+" : "-";
  return ` (${sign}${f.format(Math.abs(delta))} THB)`;
}

async function hasFullSnapshotForDate(dateStr: string): Promise<boolean> {
  const [b] = await db
    .select({ n: count() })
    .from(bankDailyBalanceTable)
    .where(eq(bankDailyBalanceTable.date, dateStr));

  const [i] = await db
    .select({ n: count() })
    .from(investmentDailyBalanceTable)
    .where(eq(investmentDailyBalanceTable.date, dateStr));

  return (b?.n ?? 0) > 0 && (i?.n ?? 0) > 0;
}

async function maxIntersectionDate(): Promise<string | null> {
  const rows = await db.execute<{ d: string | null }>(
    sql`SELECT MAX(date)::text AS d FROM (
      SELECT date FROM bank_daily_balance
      INTERSECT
      SELECT date FROM investment_daily_balance
    ) t`,
  );

  const row = rows[0];
  const d = row?.d;
  return d && d.length > 0 ? d : null;
}

async function getTotalsForDate(
  dateStr: string,
): Promise<PreviousDailySnapshot | null> {
  const [bankRow] = await db
    .select({ total: sum(bankDailyBalanceTable.balance) })
    .from(bankDailyBalanceTable)
    .where(eq(bankDailyBalanceTable.date, dateStr));

  const [invRow] = await db
    .select({
      cost: sum(investmentDailyBalanceTable.cost),
      value: sum(investmentDailyBalanceTable.value),
    })
    .from(investmentDailyBalanceTable)
    .where(eq(investmentDailyBalanceTable.date, dateStr));

  const tb = bankRow?.total;
  const tc = invRow?.cost;
  const tv = invRow?.value;

  if (tb == null || tc == null || tv == null) {
    return null;
  }

  return {
    date: dateStr,
    totalBank: Number(tb),
    totalCost: Number(tc),
    totalValue: Number(tv),
  };
}

/**
 * Loads the comparison snapshot **before** dailyBalance inserts today's batch.
 * Prefers calendar yesterday if both tables have rows for that date; else latest date in the intersection of both.
 */
export async function loadPreviousDailySnapshot(): Promise<PreviousDailySnapshot | null> {
  const yesterdayStr = formatDate(getYesterday(new Date()));

  const dateStr = (await hasFullSnapshotForDate(yesterdayStr))
    ? yesterdayStr
    : await maxIntersectionDate();

  if (!dateStr) {
    return null;
  }

  return getTotalsForDate(dateStr);
}

export async function buildSummary(
  previous: PreviousDailySnapshot | null,
): Promise<SummaryResult> {
  const { totalBalance: _totalBalance } = (
    await db
      .select({
        totalBalance: sum(bankAccountTable.currentBalance),
      })
      .from(bankAccountTable)
  )[0];

  const totalBalance = +(_totalBalance || 0);

  const { totalCost: _totalCost, totalValue: _totalValue } = (
    await db
      .select({
        totalCost: sum(investmentAccountTable.currentCost),
        totalValue: sum(investmentAccountTable.currentValue),
      })
      .from(investmentAccountTable)
  )[0];

  const totalCost = +(_totalCost || 0);
  const totalValue = +(_totalValue || 0);

  const pnl =
    totalCost === 0 ? 0 : ((totalValue - totalCost) / totalCost) * 100;
  const pnlStr = `${pnl.toFixed(2)}%`;

  const currentNetWorth = totalBalance + totalValue;

  let circleSuffix = "";
  let body: string;

  if (!previous) {
    body =
      `Total Bank Balance: ${f.format(totalBalance)} THB` +
      `\nTotal Investment Cost: ${f.format(totalCost)} THB` +
      `\nTotal Investment Value: ${f.format(totalValue)} THB` +
      `\nCurrent P/L: ${pnlStr}` +
      `\n**Total Net Worth: ${f.format(currentNetWorth)} THB**` +
      `\n_No prior daily snapshot for day-over-day comparison._`;
  } else {
    const prevNw = previous.totalBank + previous.totalValue;
    const netDeltaThb = currentNetWorth - prevNw;
    const percentDiffNetWorth =
      prevNw === 0 ? null : (netDeltaThb / prevNw) * 100;

    circleSuffix = circleEmojiSuffix(netDeltaThb, percentDiffNetWorth);

    const dBank = totalBalance - previous.totalBank;
    const dCost = totalCost - previous.totalCost;
    const dValue = totalValue - previous.totalValue;

    const prevUnrealized = previous.totalValue - previous.totalCost;
    const unrealized = totalValue - totalCost;
    const dUnrealized = unrealized - prevUnrealized;

    body =
      `Total Bank Balance: ${f.format(totalBalance)} THB${formatSignedThbDelta(dBank)}` +
      `\nTotal Investment Cost: ${f.format(totalCost)} THB${formatSignedThbDelta(dCost)}` +
      `\nTotal Investment Value: ${f.format(totalValue)} THB${formatSignedThbDelta(dValue)}` +
      `\nCurrent P/L: ${pnlStr}${formatSignedThbDelta(dUnrealized)}` +
      `\n**Total Net Worth: ${f.format(currentNetWorth)} THB${formatSignedThbDelta(netDeltaThb)}**`;
  }

  return { circleSuffix, body };
}

export async function getSummary(
  previous: PreviousDailySnapshot | null,
): Promise<SummaryResult> {
  return buildSummary(previous);
}
