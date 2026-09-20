import { count, eq, isNull, sql, sum } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  bankAccountTable,
  bankDailyBalanceTable,
  currencyTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
  realEstateDailyBalanceTable,
  realEstatePropertyTable,
} from "@repo/database/schema";

import { formatDate, getYesterday } from "@/lib/date";
import {
  type AssetSnapshot,
  type DayPerformer,
  findTopAndWorstPerformers,
  loadHeldAssetSnapshots,
} from "@/lib/dayPerformers";
import { circleEmojiSuffix } from "@/lib/summaryCircles";
import { loadTakenPnlThb } from "@/lib/takenPnl";

export type PreviousDailySnapshot = {
  date: string;
  totalBank: number;
  totalCost: number;
  totalValue: number;
  totalRealEstate: number;
  /** Cumulative withdrawn P/L as of `date`, in THB. */
  takenPnl: number;
};

export type SummaryResult = {
  /** Space + circle emojis, or empty */
  circleSuffix: string;
  bank: number;
  investCost: number;
  investValue: number;
  realEstate: number;
  netWorth: number;
  takenPnl: number;
  bankDelta: number | null;
  investCostDelta: number | null;
  investValueDelta: number | null;
  realEstateDelta: number | null;
  netWorthDelta: number | null;
  allTimePnl: number;
  allTimePnlDelta: number | null;
  hasTakenPnl: boolean;
  hasRealEstate: boolean;
  performers: { top: DayPerformer; worst: DayPerformer } | null;
};

const f = Intl.NumberFormat("en-US");

function formatSignedThbDelta(delta: number): string {
  if (Object.is(delta, 0) || Math.abs(delta) < 1e-6) {
    return "";
  }
  const sign = delta >= 0 ? "+" : "-";
  return ` (${sign}${f.format(Math.abs(delta))} THB)`;
}

/**
 * The P/L line(s).
 *
 * A `withdrawn` pnl_event drops `current_value` by the withdrawal and
 * `current_cost` by (withdrawal − profit), so account P/L falls by exactly
 * the profit taken. Reporting `value − cost` alone would post that as a
 * day's loss and then understate P/L forever after. Adding the ledger's
 * taken total back gives the dashboard's All-time P/L (`open + taken`),
 * and its day-over-day delta carries no withdrawal artifact.
 *
 * With no withdrawals ever booked the two are identical, so the original
 * single `Current P/L` line is kept.
 */
export function pnlLines(
  current: { openPnl: number; cost: number; taken: number },
  previous: { openPnl: number; taken: number } | null,
): string {
  const pct = current.cost === 0 ? 0 : (current.openPnl / current.cost) * 100;
  const pctStr = `${pct.toFixed(2)}%`;

  if (current.taken === 0 && (previous?.taken ?? 0) === 0) {
    const delta = previous ? current.openPnl - previous.openPnl : 0;
    return `Current P/L: ${pctStr}${previous ? formatSignedThbDelta(delta) : ""}`;
  }

  const allTime = current.openPnl + current.taken;
  const delta = previous ? allTime - (previous.openPnl + previous.taken) : 0;

  return `All-time P/L: ${f.format(allTime)} THB${previous ? formatSignedThbDelta(delta) : ""}`;
}

async function loadDayPerformers(
  previousAssets: AssetSnapshot[],
): Promise<{ top: DayPerformer; worst: DayPerformer } | null> {
  const previousById = new Map(
    previousAssets.map((asset) => [
      asset.id,
      { cost: asset.cost, value: asset.value },
    ]),
  );

  return findTopAndWorstPerformers(
    await loadHeldAssetSnapshots(),
    previousById,
  );
}

async function hasActiveRealEstate(): Promise<boolean> {
  const [reCount] = await db
    .select({ n: count() })
    .from(realEstatePropertyTable)
    .where(isNull(realEstatePropertyTable.closedAt));
  return (reCount?.n ?? 0) > 0;
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

  if (!(await hasActiveRealEstate())) {
    return (b?.n ?? 0) > 0 && (i?.n ?? 0) > 0;
  }

  const [re] = await db
    .select({ n: count() })
    .from(realEstateDailyBalanceTable)
    .where(eq(realEstateDailyBalanceTable.date, dateStr));

  return (b?.n ?? 0) > 0 && (i?.n ?? 0) > 0 && (re?.n ?? 0) > 0;
}

async function maxIntersectionDate(): Promise<string | null> {
  const query = (await hasActiveRealEstate())
    ? sql`SELECT MAX(date)::text AS d FROM (
        SELECT date FROM bank_daily_balance
        INTERSECT
        SELECT date FROM investment_daily_balance
        INTERSECT
        SELECT date FROM real_estate_daily_balance
      ) t`
    : sql`SELECT MAX(date)::text AS d FROM (
        SELECT date FROM bank_daily_balance
        INTERSECT
        SELECT date FROM investment_daily_balance
      ) t`;

  const rows = await db.execute<{ d: string | null }>(query);

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

  const [reRow] = await db
    .select({ total: sum(realEstateDailyBalanceTable.value) })
    .from(realEstateDailyBalanceTable)
    .where(eq(realEstateDailyBalanceTable.date, dateStr));

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
    totalRealEstate: Number(reRow?.total ?? 0),
    takenPnl: await loadTakenPnlThb(dateStr),
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
  previousAssets: AssetSnapshot[],
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

  const realEstateRows = await db
    .select({
      currentValue: realEstatePropertyTable.currentValue,
      valueInTHB: currencyTable.valueInTHB,
    })
    .from(realEstatePropertyTable)
    .innerJoin(
      currencyTable,
      eq(realEstatePropertyTable.currencyId, currencyTable.id),
    )
    .where(isNull(realEstatePropertyTable.closedAt));

  const totalRealEstate = realEstateRows.reduce((sum, row) => {
    const value = Number(row.currentValue ?? 0);
    const fx = Number(row.valueInTHB ?? 1);
    return sum + value * fx;
  }, 0);

  const takenPnl = await loadTakenPnlThb(null);
  const openPnl = totalValue - totalCost;
  const allTimePnl = openPnl + takenPnl;
  const hasTakenPnl =
    takenPnl !== 0 || (previous != null && previous.takenPnl !== 0);
  const allTimePnlDelta = previous
    ? allTimePnl -
      (previous.totalValue - previous.totalCost + previous.takenPnl)
    : null;

  const currentNetWorth = totalBalance + totalValue + totalRealEstate;
  const performers = await loadDayPerformers(previousAssets);
  const hasRealEstate = await hasActiveRealEstate();

  if (!previous) {
    return {
      circleSuffix: "",
      bank: totalBalance,
      investCost: totalCost,
      investValue: totalValue,
      realEstate: totalRealEstate,
      netWorth: currentNetWorth,
      takenPnl,
      bankDelta: null,
      investCostDelta: null,
      investValueDelta: null,
      realEstateDelta: null,
      netWorthDelta: null,
      allTimePnl,
      allTimePnlDelta,
      hasTakenPnl,
      hasRealEstate,
      performers,
    };
  }

  const prevNw =
    previous.totalBank + previous.totalValue + previous.totalRealEstate;
  const netDeltaThb = currentNetWorth - prevNw;
  const percentDiffNetWorth =
    prevNw === 0 ? null : (netDeltaThb / prevNw) * 100;

  return {
    circleSuffix: circleEmojiSuffix(netDeltaThb, percentDiffNetWorth),
    bank: totalBalance,
    investCost: totalCost,
    investValue: totalValue,
    realEstate: totalRealEstate,
    netWorth: currentNetWorth,
    takenPnl,
    bankDelta: totalBalance - previous.totalBank,
    investCostDelta: totalCost - previous.totalCost,
    investValueDelta: totalValue - previous.totalValue,
    realEstateDelta: totalRealEstate - previous.totalRealEstate,
    netWorthDelta: netDeltaThb,
    allTimePnl,
    allTimePnlDelta,
    hasTakenPnl,
    hasRealEstate,
    performers,
  };
}

export async function getSummary(
  previous: PreviousDailySnapshot | null,
  previousAssets: AssetSnapshot[],
): Promise<SummaryResult> {
  return buildSummary(previous, previousAssets);
}
