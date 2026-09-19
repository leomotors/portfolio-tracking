import {
  CLASS_COLOR,
  CLASS_LABEL,
  CURRENCY_PALETTE,
  CUSTODY_COLOR,
  CUSTODY_LABEL,
  CUSTODY_ORDER,
  RISK_COLOR,
  RISK_LABEL,
  RISK_ORDER,
  TYPE_COLOR,
  TYPE_LABEL,
  UNCLASSIFIED_CUSTODY,
} from "./colors";

export interface AssetRow {
  id: number;
  name: string;
  symbol: string | null;
  investmentAccountId: number;
  currencyId: number;
  assetType: string;
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
  name?: string;
  bank?: string;
  currentBalance: number;
}

export interface RealEstatePropertyRow {
  id?: number;
  name?: string;
  currencyId: number;
  currency: string;
  riskLevel: string;
  costValue: number;
  marketValue: number;
}

export interface InvestmentAccountRow {
  id: number;
  name: string;
  currentCost: number;
  currentValue: number;
  custody: string | null;
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
  realEstateProperties: RealEstatePropertyRow[] = [],
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
  const realEstateTotal = realEstateProperties.reduce(
    (sum, property) => sum + property.marketValue,
    0,
  );
  if (realEstateTotal > 0) {
    totals.set(
      "real_estate",
      (totals.get("real_estate") ?? 0) + realEstateTotal,
    );
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

export function byAssetType(
  assets: AssetRow[],
  currencies: CurrencyRow[],
  bankAccounts: BankAccountRow[] = [],
  realEstateProperties: RealEstatePropertyRow[] = [],
): AllocationBucket[] {
  const fx = fxLookup(currencies);
  const totals = new Map<string, number>();
  for (const a of assets) {
    const v = a.amount * a.currentPrice * fx(a.currencyId);
    totals.set(a.assetType, (totals.get(a.assetType) ?? 0) + v);
  }
  for (const b of bankAccounts) {
    totals.set("thai_cash", (totals.get("thai_cash") ?? 0) + b.currentBalance);
  }
  const realEstateTotal = realEstateProperties.reduce(
    (sum, property) => sum + property.marketValue,
    0,
  );
  if (realEstateTotal > 0) {
    totals.set(
      "real_estate",
      (totals.get("real_estate") ?? 0) + realEstateTotal,
    );
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: TYPE_LABEL[key] ?? key,
      value,
      color: TYPE_COLOR[key] ?? "oklch(0.72 0.10 235)",
    }))
    .sort((a, b) => b.value - a.value);
}

export function byRiskLevel(
  assets: AssetRow[],
  currencies: CurrencyRow[],
  bankAccounts: BankAccountRow[] = [],
  realEstateProperties: RealEstatePropertyRow[] = [],
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
  for (const property of realEstateProperties) {
    totals.set(
      property.riskLevel,
      (totals.get(property.riskLevel) ?? 0) + property.marketValue,
    );
  }
  return RISK_ORDER.filter((k) => (totals.get(k) ?? 0) > 0).map((k) => ({
    key: k,
    label: RISK_LABEL[k] ?? k,
    value: totals.get(k) ?? 0,
    color: RISK_COLOR[k] ?? "oklch(0.72 0.10 235)",
  }));
}

export function byCustody(
  accounts: InvestmentAccountRow[],
  bankAccounts: BankAccountRow[] = [],
  realEstateProperties: RealEstatePropertyRow[] = [],
): AllocationBucket[] {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    const key = account.custody ?? UNCLASSIFIED_CUSTODY;
    totals.set(key, (totals.get(key) ?? 0) + account.currentValue);
  }
  for (const b of bankAccounts) {
    totals.set(
      "thai_custodial",
      (totals.get("thai_custodial") ?? 0) + b.currentBalance,
    );
  }
  const realEstateTotal = realEstateProperties.reduce(
    (sum, property) => sum + property.marketValue,
    0,
  );
  if (realEstateTotal > 0) {
    totals.set(
      "thai_custodial",
      (totals.get("thai_custodial") ?? 0) + realEstateTotal,
    );
  }
  return CUSTODY_ORDER.filter((k) => (totals.get(k) ?? 0) > 0).map((k) => ({
    key: k,
    label: CUSTODY_LABEL[k] ?? k,
    value: totals.get(k) ?? 0,
    color: CUSTODY_COLOR[k] ?? "oklch(0.72 0.10 235)",
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
  realEstateProperties: RealEstatePropertyRow[] = [],
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
  for (const property of realEstateProperties) {
    totals.set(
      property.currency,
      (totals.get(property.currency) ?? 0) + property.marketValue,
    );
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

export function byInvestmentAccount(
  accounts: InvestmentAccountRow[],
): AllocationBucket[] {
  return accounts
    .filter((account) => account.currentValue > 0)
    .map((account) => ({
      key: String(account.id),
      label: account.name,
      value: account.currentValue,
    }))
    .sort((a, b) => b.value - a.value)
    .map((bucket, i) => ({
      ...bucket,
      color: CURRENCY_PALETTE[i % CURRENCY_PALETTE.length]!,
    }));
}

export const ALLOCATION_RESIDUAL_THRESHOLD = 0.005;

export type AllocationDimension =
  "class" | "type" | "custody" | "risk" | "currency" | "account";

export const ACCOUNT_OUTSIDE_BANKS = "banks";
export const ACCOUNT_OUTSIDE_REAL_ESTATE = "real_estate";

export interface AllocationMember {
  key: string;
  label: string;
  sublabel: string | null;
  value: number;
  origin: "asset" | "bank" | "real_estate" | "residual" | "account";
}

export interface AllocationMemberInput {
  assets: AssetRow[];
  currencies: CurrencyRow[];
  bankAccounts: BankAccountRow[];
  realEstateProperties: RealEstatePropertyRow[];
  investmentAccounts: InvestmentAccountRow[];
}

export function allocationMembers(
  dimension: AllocationDimension,
  input: AllocationMemberInput,
): Record<string, AllocationMember[]> {
  const {
    assets,
    currencies,
    bankAccounts,
    realEstateProperties,
    investmentAccounts,
  } = input;
  const fx = fxLookup(currencies);
  const cById = new Map<number, CurrencyRow>();
  for (const c of currencies) cById.set(c.id, c);
  const accountName = new Map<number, string>();
  for (const account of investmentAccounts) {
    accountName.set(account.id, account.name);
  }

  const grouped = new Map<string, AllocationMember[]>();
  const push = (bucket: string | null, member: AllocationMember) => {
    if (bucket == null || member.value === 0) return;
    const list = grouped.get(bucket);
    if (list) list.push(member);
    else grouped.set(bucket, [member]);
  };

  for (const a of assets) {
    if (dimension === "custody") continue;
    const value = a.amount * a.currentPrice * fx(a.currencyId);
    const label = a.symbol?.trim() || a.name;
    const sublabel =
      dimension === "account"
        ? (CLASS_LABEL[a.assetClass] ?? a.assetClass)
        : (accountName.get(a.investmentAccountId) ?? null);
    push(assetBucketKey(dimension, a, cById), {
      key: `asset:${a.id}`,
      label,
      sublabel,
      value,
      origin: "asset",
    });
  }

  for (const b of bankAccounts) {
    push(bankBucketKey(dimension), {
      key: `bank:${b.id}`,
      label: b.name?.trim() || `Bank ${b.id}`,
      sublabel: b.bank?.trim() || "Bank account",
      value: b.currentBalance,
      origin: "bank",
    });
  }

  realEstateProperties.forEach((property, index) => {
    push(propertyBucketKey(dimension, property), {
      key: `property:${property.id ?? index}`,
      label: property.name?.trim() || "Property",
      sublabel: "Real estate",
      value: property.marketValue,
      origin: "real_estate",
    });
  });

  if (dimension === "custody") {
    for (const account of investmentAccounts) {
      push(account.custody ?? UNCLASSIFIED_CUSTODY, {
        key: `account:${account.id}`,
        label: account.name,
        sublabel: null,
        value: account.currentValue,
        origin: "account",
      });
    }
  }

  if (dimension === "account") {
    for (const account of investmentAccounts) {
      const members = grouped.get(String(account.id)) ?? [];
      const assetSum = members
        .filter((m) => m.origin === "asset")
        .reduce((sum, m) => sum + m.value, 0);
      const residual = account.currentValue - assetSum;
      if (Math.abs(residual) < ALLOCATION_RESIDUAL_THRESHOLD) continue;
      push(String(account.id), {
        key: `residual:acct-${account.id}`,
        label: "Unallocated in account",
        sublabel: null,
        value: residual,
        origin: "residual",
      });
    }
  }

  const result: Record<string, AllocationMember[]> = {};
  for (const [key, list] of grouped) {
    const rest = list
      .filter((m) => m.origin !== "residual")
      .sort((a, b) => b.value - a.value);
    const residual = list.filter((m) => m.origin === "residual");
    result[key] = [...rest, ...residual];
  }
  return result;
}

function assetBucketKey(
  dimension: AllocationDimension,
  asset: AssetRow,
  cById: Map<number, CurrencyRow>,
): string | null {
  switch (dimension) {
    case "class":
      return asset.assetClass;
    case "type":
      return asset.assetType;
    case "risk":
      return asset.riskLevel;
    case "currency":
      return cById.get(asset.currencyId)?.symbol ?? null;
    case "account":
      return String(asset.investmentAccountId);
    case "custody":
      return null;
  }
}

function bankBucketKey(dimension: AllocationDimension): string {
  switch (dimension) {
    case "class":
      return "cash";
    case "type":
      return "thai_cash";
    case "custody":
      return "thai_custodial";
    case "risk":
      return "safe_core";
    case "currency":
      return "THB";
    case "account":
      return ACCOUNT_OUTSIDE_BANKS;
  }
}

function propertyBucketKey(
  dimension: AllocationDimension,
  property: RealEstatePropertyRow,
): string {
  switch (dimension) {
    case "class":
    case "type":
    case "account":
      return ACCOUNT_OUTSIDE_REAL_ESTATE;
    case "custody":
      return "thai_custodial";
    case "risk":
      return property.riskLevel;
    case "currency":
      return property.currency;
  }
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

export interface RealEstateDailyRow {
  propertyId: number;
  date: string;
  value: number;
}

export function aggregateRealEstateValueByDate(
  rows: RealEstateDailyRow[],
): DailySnapshotPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.value);
  }
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function realEstateTotals(properties: RealEstatePropertyRow[]) {
  const cost = properties.reduce(
    (sum, property) => sum + property.costValue,
    0,
  );
  const value = properties.reduce(
    (sum, property) => sum + property.marketValue,
    0,
  );
  const pl = value - cost;
  const plPct = cost === 0 ? 0 : pl / cost;
  return { cost, value, pl, plPct };
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
      value: valueAsOf(date, costSeries) + valueAsOf(date, savingsSeries),
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
  return valueFlowSeries(chartDates, aggregateBalanceByDate(savingsBankDaily));
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
  realEstateDaily: RealEstateDailyRow[] = [],
): DailySnapshotPoint[] {
  const byDate = new Map<string, number>();
  for (const r of investmentDaily) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.value);
  }
  for (const r of bankDaily) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.balance);
  }
  for (const r of realEstateDaily) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.value);
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

export interface AccountPnlBreakdown {
  accountPnl: number;
  accountPnlPct: number;
  unrealizedPnl: number;
  realizedPnl: number;
  /**
   * THB cost basis of open positions held in a non-THB currency, at today's
   * rate. Non-zero means `realizedPnl` also carries FX translation on cost
   * and is an estimate, not a booked figure.
   */
  fxBasisExposure: number;
}

/**
 * Account P/L minus the sum of open-position P/Ls.
 *
 * Selling one asset to buy another leaves account P/L unchanged (until
 * money leaves) while position P/Ls no longer sum to it. The residual is
 * realized P/L. `investmentTotals` only rolls up account rows and cannot
 * produce this split.
 *
 * The residual reduces to `Σ(amount × averageCost × fx) − currentCost`, so
 * for a non-THB position it also absorbs FX translation on cost basis:
 * `currentCost` was booked at the purchase-day rate, the sum uses today's.
 * That part moves with no trade, which is why `fxBasisExposure` is reported
 * — callers must not treat the residual as booked when it is non-zero.
 */
export function accountPnlBreakdown(
  account: InvestmentAccountRow,
  assets: AssetRow[],
  currencies: CurrencyRow[],
): AccountPnlBreakdown {
  const accountPnl = account.currentValue - account.currentCost;
  const accountPnlPct =
    account.currentCost === 0 ? 0 : accountPnl / account.currentCost;
  const fx = fxLookup(currencies);
  const isThb = new Map(currencies.map((c) => [c.id, c.symbol === "THB"]));
  let unrealizedPnl = 0;
  let fxBasisExposure = 0;
  for (const asset of assets) {
    const rate = fx(asset.currencyId);
    unrealizedPnl +=
      asset.amount * (asset.currentPrice - asset.averageCost) * rate;
    if (!isThb.get(asset.currencyId)) {
      fxBasisExposure += asset.amount * asset.averageCost * rate;
    }
  }
  return {
    accountPnl,
    accountPnlPct,
    unrealizedPnl,
    realizedPnl: accountPnl - unrealizedPnl,
    fxBasisExposure,
  };
}

export type PnlEventKind = "in_account" | "withdrawn" | "undocumented";

export interface PnlEventAmounts {
  kind: PnlEventKind;
  pnl: number;
  valueInTHB: number;
}

export function roundThb(value: number) {
  return Math.round(value * 100) / 100;
}

export function eventPnlThb(event: PnlEventAmounts) {
  return event.pnl * event.valueInTHB;
}

/** Cost change for a withdrawal: remove (W − P) from cost basis, in THB. */
export function withdrawCostDelta(
  withdrawAmount: number,
  pnl: number,
  valueInTHB = 1,
) {
  const delta = roundThb(-(withdrawAmount - pnl) * valueInTHB);
  return delta === 0 ? 0 : delta;
}

export function inAccountLoggedPnl(events: readonly PnlEventAmounts[]) {
  return events.reduce((sum, event) => {
    if (event.kind === "in_account" || event.kind === "undocumented") {
      return sum + eventPnlThb(event);
    }
    return sum;
  }, 0);
}

export function takenPnl(events: readonly PnlEventAmounts[]) {
  return events.reduce((sum, event) => {
    if (event.kind === "withdrawn") return sum + eventPnlThb(event);
    return sum;
  }, 0);
}

export interface DatedTakenPnl {
  occurredOn: string;
  pnlThb: number;
}

/** Cumulative withdrawn P/L booked on or before `asOf`. */
export function takenPnlAsOf(
  events: readonly DatedTakenPnl[],
  asOf: string,
): number {
  return events.reduce((sum, event) => {
    if (event.occurredOn <= asOf) return sum + event.pnlThb;
    return sum;
  }, 0);
}

/**
 * Daily all-time P/L: open (`value − cost`) plus taken P/L booked on or
 * before that day. A withdrawal drops open P/L by exactly the profit taken;
 * adding the ledger back removes that cliff, matching the All-time P/L KPI.
 */
export function allTimePnlSeries(
  daily: readonly { date: string; value: number; cost: number }[],
  takenEvents: readonly DatedTakenPnl[],
): DailySnapshotPoint[] {
  const byDate = new Map<string, { value: number; cost: number }>();
  for (const row of daily) {
    const prev = byDate.get(row.date) ?? { value: 0, cost: 0 };
    byDate.set(row.date, {
      value: prev.value + row.value,
      cost: prev.cost + row.cost,
    });
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, { value, cost }]) => ({
      date,
      value: value - cost + takenPnlAsOf(takenEvents, date),
    }));
}

export interface SnapshotCostShift {
  accountId: number;
  date: string;
  oldCost: number;
  newCost: number;
  value: number;
}

/**
 * Proposed `investment_daily_balance.cost` updates after withdrawn events.
 * Snapshots on/after `occurredOn` pick up each event's THB `costDelta`.
 */
export function snapshotCostShifts(
  snapshots: readonly {
    accountId: number;
    date: string;
    cost: number;
    value: number;
  }[],
  events: readonly {
    accountId: number;
    occurredOn: string;
    costDelta: number;
  }[],
): SnapshotCostShift[] {
  const shifts: SnapshotCostShift[] = [];
  for (const snapshot of snapshots) {
    let delta = 0;
    for (const event of events) {
      if (
        event.accountId === snapshot.accountId &&
        snapshot.date >= event.occurredOn
      ) {
        delta += event.costDelta;
      }
    }
    if (delta === 0) continue;
    shifts.push({
      accountId: snapshot.accountId,
      date: snapshot.date,
      oldCost: snapshot.cost,
      newCost: roundThb(snapshot.cost + delta),
      value: snapshot.value,
    });
  }
  return shifts.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.accountId - b.accountId,
  );
}

/** Computed in-account realized minus logged rotations / write-offs. */
export function undocumentedLeftover(
  computedRealized: number,
  events: readonly PnlEventAmounts[],
) {
  return computedRealized - inAccountLoggedPnl(events);
}
