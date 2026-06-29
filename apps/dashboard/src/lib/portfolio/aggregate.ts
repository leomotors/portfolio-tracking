import {
  CLASS_COLOR,
  CLASS_LABEL,
  CURRENCY_PALETTE,
  RISK_COLOR,
  RISK_LABEL,
  RISK_ORDER,
} from "./colors";

export interface AssetRow {
  id: number;
  name: string;
  symbol: string | null;
  investmentAccountId: number;
  currencyId: number;
  assetClass: string;
  riskLevel: string;
  amount: number;
  averageCost: number;
  currentPrice: number;
}

export interface CurrencyRow {
  id: number;
  symbol: string;
  variant: string | null;
  valueInTHB: number;
  updatedAt: Date | null;
}

export interface BankAccountRow {
  id: number;
  currentBalance: number;
}

export interface InvestmentAccountRow {
  id: number;
  name: string;
  currentCost: number;
  currentValue: number;
}

export interface DailySnapshotPoint {
  date: string;
  value: number;
}

export interface BankDailyPoint {
  date: string;
  balance: number;
}

export interface AllocationBucket {
  key: string;
  label: string;
  value: number;
  color: string;
}

const fxLookup = (currencies: CurrencyRow[]) => {
  const map = new Map<number, number>();
  for (const c of currencies) map.set(c.id, c.valueInTHB);
  return (id: number) => map.get(id) ?? 1;
};

export function assetValueInTHB(asset: AssetRow, currencies: CurrencyRow[]) {
  const fx = fxLookup(currencies);
  return asset.amount * asset.currentPrice * fx(asset.currencyId);
}

export function assetCostInTHB(asset: AssetRow, currencies: CurrencyRow[]) {
  const fx = fxLookup(currencies);
  return asset.amount * asset.averageCost * fx(asset.currencyId);
}

// Mirrors the Grafana SQL: bank balances are treated as
// asset_class='cash' and risk_level='safe_core' so allocation views
// reflect the whole portfolio, not just brokerage positions.
export function byAssetClass(
  assets: AssetRow[],
  currencies: CurrencyRow[],
  bankAccounts: BankAccountRow[] = [],
): AllocationBucket[] {
  const fx = fxLookup(currencies);
  const totals = new Map<string, number>();
  for (const a of assets) {
    const v = a.amount * a.currentPrice * fx(a.currencyId);
    totals.set(a.assetClass, (totals.get(a.assetClass) ?? 0) + v);
  }
  for (const b of bankAccounts) {
    totals.set("cash", (totals.get("cash") ?? 0) + b.currentBalance);
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: CLASS_LABEL[key] ?? key,
      value,
      color: CLASS_COLOR[key] ?? "oklch(0.72 0.10 235)",
    }))
    .sort((a, b) => b.value - a.value);
}

export function byRiskLevel(
  assets: AssetRow[],
  currencies: CurrencyRow[],
  bankAccounts: BankAccountRow[] = [],
): AllocationBucket[] {
  const fx = fxLookup(currencies);
  const totals = new Map<string, number>();
  for (const a of assets) {
    const v = a.amount * a.currentPrice * fx(a.currencyId);
    totals.set(a.riskLevel, (totals.get(a.riskLevel) ?? 0) + v);
  }
  for (const b of bankAccounts) {
    totals.set("safe_core", (totals.get("safe_core") ?? 0) + b.currentBalance);
  }
  return RISK_ORDER.filter((k) => (totals.get(k) ?? 0) > 0).map((k) => ({
    key: k,
    label: RISK_LABEL[k] ?? k,
    value: totals.get(k) ?? 0,
    color: RISK_COLOR[k] ?? "oklch(0.72 0.10 235)",
  }));
}

export function coreSatelliteSplit(buckets: AllocationBucket[]) {
  const core = buckets
    .filter((b) => b.key.endsWith("_core"))
    .reduce((s, b) => s + b.value, 0);
  const satellite = buckets
    .filter((b) => b.key.endsWith("_satellite"))
    .reduce((s, b) => s + b.value, 0);
  return { core, satellite };
}

export function byCurrency(
  assets: AssetRow[],
  currencies: CurrencyRow[],
  bankAccounts: BankAccountRow[],
): AllocationBucket[] {
  const totals = new Map<string, number>();
  totals.set("THB", 0);
  const cById = new Map<number, CurrencyRow>();
  for (const c of currencies) cById.set(c.id, c);

  for (const a of assets) {
    const cur = cById.get(a.currencyId);
    if (!cur) continue;
    const v = a.amount * a.currentPrice * cur.valueInTHB;
    totals.set(cur.symbol, (totals.get(cur.symbol) ?? 0) + v);
  }
  for (const b of bankAccounts) {
    totals.set("THB", (totals.get("THB") ?? 0) + b.currentBalance);
  }
  return Array.from(totals.entries())
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      key,
      label: key,
      value,
      color: CURRENCY_PALETTE[i % CURRENCY_PALETTE.length]!,
    }))
    .sort((a, b) => b.value - a.value);
}

export interface DailyBalanceRow {
  accountId: number;
  date: string;
  value: number;
}

export interface InvestmentCostDailyRow {
  accountId: number;
  date: string;
  cost: number;
}

export interface BankBalanceRow {
  accountId: number;
  date: string;
  balance: number;
}

export const CAPITAL_BANK_ACCOUNT_TYPES = [
  "savings",
  "e_savings",
  "fixed",
] as const;

export type CapitalBankAccountType =
  (typeof CAPITAL_BANK_ACCOUNT_TYPES)[number];

export function isCapitalBankAccount(
  accountType: string | null,
): accountType is CapitalBankAccountType {
  return (
    accountType != null &&
    (CAPITAL_BANK_ACCOUNT_TYPES as readonly string[]).includes(accountType)
  );
}

export function aggregateBalanceByDate(
  rows: BankBalanceRow[],
): DailySnapshotPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.balance);
  }
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function valueAsOf(date: string, series: DailySnapshotPoint[]): number {
  let value = 0;
  for (const point of series) {
    if (point.date <= date) value = point.value;
    else break;
  }
  return value;
}

/** Daily level change aligned to chart dates (positive = money in). */
export function valueFlowSeries(
  chartDates: readonly string[],
  levelSeries: DailySnapshotPoint[],
): DailySnapshotPoint[] {
  if (chartDates.length === 0) return [];

  return chartDates.map((date, i) => {
    const current = valueAsOf(date, levelSeries);
    const previousDate = i > 0 ? chartDates[i - 1]! : null;
    const previous =
      previousDate != null
        ? valueAsOf(previousDate, levelSeries)
        : (() => {
            let value = 0;
            for (const point of levelSeries) {
              if (point.date < date) value = point.value;
              else break;
            }
            return value;
          })();
    return { date, value: current - previous };
  });
}

export function combineCapitalSeries(
  investmentDaily: InvestmentCostDailyRow[],
  savingsBankDaily: BankBalanceRow[],
): DailySnapshotPoint[] {
  const costSeries = aggregateCostByDate(investmentDaily);
  const savingsSeries = aggregateBalanceByDate(savingsBankDaily);
  const dates = new Set([
    ...costSeries.map((point) => point.date),
    ...savingsSeries.map((point) => point.date),
  ]);

  return Array.from(dates)
    .sort()
    .map((date) => ({
      date,
      value:
        valueAsOf(date, costSeries) + valueAsOf(date, savingsSeries),
    }));
}

export function aggregateCostByDate(
  rows: InvestmentCostDailyRow[],
): DailySnapshotPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.cost);
  }
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Daily investment cost-basis change aligned to chart dates. */
export function costBasisFlowSeries(
  chartDates: readonly string[],
  costDaily: InvestmentCostDailyRow[],
): DailySnapshotPoint[] {
  return valueFlowSeries(chartDates, aggregateCostByDate(costDaily));
}

/** Daily savings balance change aligned to chart dates. */
export function savingsFlowSeries(
  chartDates: readonly string[],
  savingsBankDaily: BankBalanceRow[],
): DailySnapshotPoint[] {
  return valueFlowSeries(
    chartDates,
    aggregateBalanceByDate(savingsBankDaily),
  );
}

/** Combined capital flow: investment cost + high-yield savings. */
export function capitalFlowSeries(
  chartDates: readonly string[],
  investmentDaily: InvestmentCostDailyRow[],
  savingsBankDaily: BankBalanceRow[],
): DailySnapshotPoint[] {
  return valueFlowSeries(
    chartDates,
    combineCapitalSeries(investmentDaily, savingsBankDaily),
  );
}

export function combineNetWorthSeries(
  investmentDaily: DailyBalanceRow[],
  bankDaily: BankBalanceRow[],
): DailySnapshotPoint[] {
  const byDate = new Map<string, number>();
  for (const r of investmentDaily) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.value);
  }
  for (const r of bankDaily) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.balance);
  }
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface DayDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
}

export function dayDelta(series: DailySnapshotPoint[]): DayDelta {
  if (series.length === 0) {
    return { current: 0, previous: 0, delta: 0, deltaPct: 0 };
  }
  const current = series.at(-1)!.value;
  const previous = series.length > 1 ? series.at(-2)!.value : current;
  const delta = current - previous;
  const deltaPct = previous === 0 ? 0 : delta / previous;
  return { current, previous, delta, deltaPct };
}

export function sliceTimeframe(
  series: DailySnapshotPoint[],
  timeframe: "1M" | "3M" | "6M" | "1Y" | "ALL",
): DailySnapshotPoint[] {
  if (timeframe === "ALL") return series;
  const days = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[timeframe];
  return series.slice(-days);
}

export interface MoverInput {
  accountId: number;
  name: string;
  current: number;
  previous: number;
}

export interface Mover {
  accountId: number;
  name: string;
  value: number;
  delta: number;
  deltaPct: number;
}

export function dayMovers(rows: MoverInput[]): Mover[] {
  return rows
    .map((r) => ({
      accountId: r.accountId,
      name: r.name,
      value: r.current,
      delta: r.current - r.previous,
      deltaPct: r.previous === 0 ? 0 : (r.current - r.previous) / r.previous,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export interface InvestmentTotals {
  total: number;
  cost: number;
  pl: number;
  plPct: number;
}

export function investmentTotals(
  accounts: InvestmentAccountRow[],
): InvestmentTotals {
  const total = accounts.reduce((s, a) => s + a.currentValue, 0);
  const cost = accounts.reduce((s, a) => s + a.currentCost, 0);
  const pl = total - cost;
  const plPct = cost === 0 ? 0 : pl / cost;
  return { total, cost, pl, plPct };
}
