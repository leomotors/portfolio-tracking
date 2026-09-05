import "server-only";

import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  assetTable,
  bankAccountTable,
  bankDailyBalanceTable,
  coingeckoSymbolTable,
  creditCardAccountTable,
  currencyTable,
  fcdAccountTable,
  heatmapDailyTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
  personalLoanAccountTable,
  realEstateDailyBalanceTable,
  realEstatePropertyTable,
  stakedPositionDailyTable,
  stakedPositionTable,
} from "@repo/database/schema";
import { type HeatmapCell } from "@repo/heatmap";

import {
  type AssetRow,
  type BankAccountRow,
  type CurrencyRow,
  type InvestmentAccountRow,
} from "../portfolio/aggregate";

const toNum = (v: string | number | null | undefined, fallback = 0) => {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

export interface InvestmentAccount extends InvestmentAccountRow {
  accountNo: string;
  openedAt: string | null;
  closedAt: string | null;
  investmentTypes: string[];
}

export interface BankAccount extends BankAccountRow {
  name: string;
  bank: string;
  branch: string | null;
  accountNo: string;
  interestRate: number;
  accountType: string | null;
  openedAt: string | null;
  closedAt: string | null;
  remarks: string[];
}

export interface FcdAccount {
  id: number;
  name: string;
  bank: string;
  branch: string | null;
  accountNo: string;
  currency: string;
  interestRate: number;
  openedAt: string | null;
  closedAt: string | null;
  remarks: string[];
}

export interface Asset extends AssetRow {
  symbolType: string | null;
  assetType: string;
  unit: string;
  priceUpdatedAt: Date | null;
}

export interface CreditCard {
  id: number;
  name: string;
  issuedBy: string;
  cardType: string;
  cardNo: string;
  creditLimit: number;
  creditLine: number;
  statementDate: number;
  interestFreePeriod: number;
  interestRate: number;
  openedAt: string;
  closedAt: string | null;
}

export interface PersonalLoan {
  id: number;
  name: string;
  issuedBy: string;
  accountNo: string | null;
  creditLimit: number;
  openedAt: string;
  closedAt: string | null;
}

export interface RealEstateProperty {
  id: number;
  name: string;
  propertyType: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  areaSqm: number | null;
  currencyId: number;
  currency: string;
  purchaseCost: number;
  currentValue: number;
  costValue: number;
  marketValue: number;
  valueUpdatedAt: Date | null;
  riskLevel: string;
  acquiredAt: string | null;
  closedAt: string | null;
  notes: string[];
}

export interface RealEstateDailyPoint {
  propertyId: number;
  date: string;
  cost: number;
  value: number;
}

export interface StakedPosition {
  id: number;
  assetId: number | null;
  name: string;
  provider: string;
  underlyingSymbol: string;
  depositedUnderlying: number;
  currentUnderlying: number;
  /** Receipt/share token actually held (e.g. liquidBTC); null for native staking */
  receiptSymbol: string | null;
  receiptAmount: number | null;
  projectedApy: number | null;
  stakedSince: string | null;
  syncSource: string | null;
  syncedAt: Date | null;
  syncError: string | null;
  /** From the linked asset row; null when the position is unlinked. */
  currentPrice: number | null;
  currencyId: number | null;
  investmentAccountId: number | null;
}

export interface StakedDailyPoint {
  stakedPositionId: number;
  date: string;
  currentUnderlying: number;
  depositedUnderlying: number;
}

export interface InvestmentDailyPoint {
  accountId: number;
  date: string;
  cost: number;
  value: number;
}

export interface BankDailyPoint {
  accountId: number;
  date: string;
  balance: number;
}

export async function getInvestmentAccounts(): Promise<InvestmentAccount[]> {
  const rows = await db
    .select()
    .from(investmentAccountTable)
    .orderBy(desc(investmentAccountTable.currentValue));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    accountNo: r.accountNo,
    currentCost: toNum(r.currentCost),
    currentValue: toNum(r.currentValue),
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    investmentTypes: (r.investmentTypes ?? []) as string[],
  }));
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const rows = await db
    .select()
    .from(bankAccountTable)
    .orderBy(desc(bankAccountTable.currentBalance));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    bank: r.bank,
    branch: r.branch,
    accountNo: r.accountNo,
    currentBalance: toNum(r.currentBalance),
    interestRate: toNum(r.interestRate),
    accountType: r.accountType,
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    remarks: r.remarks ?? [],
  }));
}

export async function getFcdAccounts(): Promise<FcdAccount[]> {
  const rows = await db.select().from(fcdAccountTable);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    bank: r.bank,
    branch: r.branch,
    accountNo: r.accountNo,
    currency: r.currency,
    interestRate: toNum(r.interestRate),
    openedAt: r.openedAt,
    closedAt: r.closedAt,
    remarks: r.remarks ?? [],
  }));
}

export async function getAssets(): Promise<Asset[]> {
  const rows = await db.select().from(assetTable);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    symbol: r.symbol,
    investmentAccountId: r.investmentAccountId,
    currencyId: r.currencyId,
    symbolType: r.symbolType,
    assetType: r.assetType,
    assetClass: r.assetClass,
    riskLevel: r.riskLevel,
    amount: toNum(r.amount),
    unit: r.unit,
    averageCost: toNum(r.averageCost),
    currentPrice: toNum(r.currentPrice),
    priceUpdatedAt: r.priceUpdatedAt,
  }));
}

export async function getCurrencies(): Promise<CurrencyRow[]> {
  const rows = await db.select().from(currencyTable);
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    variant: r.variant,
    valueInTHB: toNum(r.valueInTHB, 1),
    updatedAt: r.updatedAt,
  }));
}

export async function getStakedPositions(): Promise<StakedPosition[]> {
  const rows = await db
    .select({
      id: stakedPositionTable.id,
      assetId: stakedPositionTable.assetId,
      name: stakedPositionTable.name,
      provider: stakedPositionTable.provider,
      underlyingSymbol: stakedPositionTable.underlyingSymbol,
      depositedUnderlying: stakedPositionTable.depositedUnderlying,
      currentUnderlying: stakedPositionTable.currentUnderlying,
      receiptSymbol: stakedPositionTable.receiptSymbol,
      receiptAmount: stakedPositionTable.receiptAmount,
      projectedApy: stakedPositionTable.projectedApy,
      stakedSince: stakedPositionTable.stakedSince,
      syncSource: stakedPositionTable.syncSource,
      syncedAt: stakedPositionTable.syncedAt,
      syncError: stakedPositionTable.syncError,
      currentPrice: assetTable.currentPrice,
      currencyId: assetTable.currencyId,
      investmentAccountId: assetTable.investmentAccountId,
    })
    .from(stakedPositionTable)
    .leftJoin(assetTable, eq(stakedPositionTable.assetId, assetTable.id))
    .orderBy(asc(stakedPositionTable.id));

  return rows.map((r) => ({
    id: r.id,
    assetId: r.assetId,
    name: r.name,
    provider: r.provider,
    underlyingSymbol: r.underlyingSymbol,
    depositedUnderlying: toNum(r.depositedUnderlying),
    currentUnderlying: toNum(r.currentUnderlying),
    receiptSymbol: r.receiptSymbol,
    receiptAmount: r.receiptAmount == null ? null : toNum(r.receiptAmount),
    projectedApy: r.projectedApy == null ? null : toNum(r.projectedApy),
    stakedSince: r.stakedSince,
    syncSource: r.syncSource,
    syncedAt: r.syncedAt,
    syncError: r.syncError,
    currentPrice: r.currentPrice == null ? null : toNum(r.currentPrice),
    currencyId: r.currencyId,
    investmentAccountId: r.investmentAccountId,
  }));
}

export async function getStakedDaily(): Promise<StakedDailyPoint[]> {
  const rows = await db
    .select()
    .from(stakedPositionDailyTable)
    .orderBy(asc(stakedPositionDailyTable.date));
  return rows.map((r) => ({
    stakedPositionId: r.stakedPositionId,
    date: r.date,
    currentUnderlying: toNum(r.currentUnderlying),
    depositedUnderlying: toNum(r.depositedUnderlying),
  }));
}

export async function getInvestmentDaily(): Promise<InvestmentDailyPoint[]> {
  const rows = await db
    .select()
    .from(investmentDailyBalanceTable)
    .orderBy(asc(investmentDailyBalanceTable.date));
  return rows.map((r) => ({
    accountId: r.investmentAccountId,
    date: r.date,
    cost: toNum(r.cost),
    value: toNum(r.value),
  }));
}

export async function getBankDaily(): Promise<BankDailyPoint[]> {
  const rows = await db
    .select()
    .from(bankDailyBalanceTable)
    .orderBy(asc(bankDailyBalanceTable.date));
  return rows.map((r) => ({
    accountId: r.bankAccountId,
    date: r.date,
    balance: toNum(r.balance),
  }));
}

export async function getInvestmentDailyForAccount(
  accountId: number,
): Promise<InvestmentDailyPoint[]> {
  const rows = await db
    .select()
    .from(investmentDailyBalanceTable)
    .where(eq(investmentDailyBalanceTable.investmentAccountId, accountId))
    .orderBy(asc(investmentDailyBalanceTable.date));
  return rows.map((r) => ({
    accountId: r.investmentAccountId,
    date: r.date,
    cost: toNum(r.cost),
    value: toNum(r.value),
  }));
}

export async function getBankDailyForAccount(
  accountId: number,
): Promise<BankDailyPoint[]> {
  const rows = await db
    .select()
    .from(bankDailyBalanceTable)
    .where(eq(bankDailyBalanceTable.bankAccountId, accountId))
    .orderBy(asc(bankDailyBalanceTable.date));
  return rows.map((r) => ({
    accountId: r.bankAccountId,
    date: r.date,
    balance: toNum(r.balance),
  }));
}

export async function getCreditCards(): Promise<CreditCard[]> {
  const rows = await db
    .select()
    .from(creditCardAccountTable)
    .where(isNull(creditCardAccountTable.closedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    issuedBy: r.issuedBy,
    cardType: r.cardType,
    cardNo: r.cardNo,
    creditLimit: toNum(r.creditLimit),
    creditLine: toNum(r.creditLine),
    statementDate: r.statementDate,
    interestFreePeriod: r.interestFreePeriod,
    interestRate: toNum(r.interestRate),
    openedAt: r.openedAt,
    closedAt: r.closedAt,
  }));
}

export async function getPersonalLoans(): Promise<PersonalLoan[]> {
  const rows = await db
    .select()
    .from(personalLoanAccountTable)
    .where(isNull(personalLoanAccountTable.closedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    issuedBy: r.issuedBy,
    accountNo: r.accountNo,
    creditLimit: toNum(r.creditLimit),
    openedAt: r.openedAt,
    closedAt: r.closedAt,
  }));
}

export async function getRealEstateProperties(): Promise<RealEstateProperty[]> {
  const rows = await db
    .select({
      id: realEstatePropertyTable.id,
      name: realEstatePropertyTable.name,
      propertyType: realEstatePropertyTable.propertyType,
      address: realEstatePropertyTable.address,
      latitude: realEstatePropertyTable.latitude,
      longitude: realEstatePropertyTable.longitude,
      areaSqm: realEstatePropertyTable.areaSqm,
      currencyId: realEstatePropertyTable.currencyId,
      purchaseCost: realEstatePropertyTable.purchaseCost,
      currentValue: realEstatePropertyTable.currentValue,
      valueUpdatedAt: realEstatePropertyTable.valueUpdatedAt,
      riskLevel: realEstatePropertyTable.riskLevel,
      acquiredAt: realEstatePropertyTable.acquiredAt,
      closedAt: realEstatePropertyTable.closedAt,
      notes: realEstatePropertyTable.notes,
      currency: currencyTable.symbol,
      valueInTHB: currencyTable.valueInTHB,
    })
    .from(realEstatePropertyTable)
    .innerJoin(
      currencyTable,
      eq(realEstatePropertyTable.currencyId, currencyTable.id),
    )
    .where(isNull(realEstatePropertyTable.closedAt))
    .orderBy(desc(realEstatePropertyTable.currentValue));

  return rows.map((r) => {
    const fx = toNum(r.valueInTHB, 1);
    const purchaseCost = toNum(r.purchaseCost);
    const currentValue = toNum(r.currentValue);
    return {
      id: r.id,
      name: r.name,
      propertyType: r.propertyType,
      address: r.address,
      latitude: r.latitude == null ? null : toNum(r.latitude),
      longitude: r.longitude == null ? null : toNum(r.longitude),
      areaSqm: r.areaSqm == null ? null : toNum(r.areaSqm),
      currencyId: r.currencyId,
      currency: r.currency,
      purchaseCost,
      currentValue,
      costValue: purchaseCost * fx,
      marketValue: currentValue * fx,
      valueUpdatedAt: r.valueUpdatedAt,
      riskLevel: r.riskLevel,
      acquiredAt: r.acquiredAt,
      closedAt: r.closedAt,
      notes: r.notes ?? [],
    };
  });
}

export async function getRealEstateDaily(): Promise<RealEstateDailyPoint[]> {
  const rows = await db
    .select()
    .from(realEstateDailyBalanceTable)
    .orderBy(asc(realEstateDailyBalanceTable.date));
  return rows.map((r) => ({
    propertyId: r.realEstatePropertyId,
    date: r.date,
    cost: toNum(r.cost),
    value: toNum(r.value),
  }));
}

export interface CoingeckoSymbol {
  id: number;
  symbol: string;
  coingeckoId: string;
  updatedAt: Date;
}

export async function getCoingeckoSymbols(): Promise<CoingeckoSymbol[]> {
  const rows = await db
    .select()
    .from(coingeckoSymbolTable)
    .orderBy(asc(coingeckoSymbolTable.symbol));
  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    coingeckoId: r.coingeckoId,
    updatedAt: r.updatedAt,
  }));
}

/** Held cryptocurrency symbols with no CoinGecko map. The cron skips these. */
export async function getUnmappedCryptoSymbols(): Promise<string[]> {
  const [assets, mapped] = await Promise.all([
    db
      .select({ symbol: assetTable.symbol })
      .from(assetTable)
      .where(
        and(
          eq(assetTable.symbolType, "cryptocurrency"),
          gt(assetTable.amount, "0"),
        ),
      ),
    getCoingeckoSymbols(),
  ]);
  const have = new Set(mapped.map((m) => m.symbol));
  return [
    ...new Set(
      assets
        .map((a) => a.symbol)
        .filter((s): s is string => s != null && s.length > 0 && !have.has(s)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export interface HeatmapDailySnapshot {
  date: string;
  cells: HeatmapCell[];
  colorScaleMax: number;
  generatedAt: Date;
}

function isMissingHeatmapTable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    code === "42P01" ||
    (message.includes("heatmap_daily") &&
      message.toLowerCase().includes("does not exist"))
  );
}

/** Newest first. Empty when the table has not been migrated yet. */
export async function listHeatmapDates(): Promise<string[]> {
  try {
    const rows = await db
      .select({ date: heatmapDailyTable.date })
      .from(heatmapDailyTable)
      .orderBy(desc(heatmapDailyTable.date));
    return rows.map((row) => row.date);
  } catch (error) {
    if (isMissingHeatmapTable(error)) return [];
    throw error;
  }
}

export async function getHeatmapByDate(
  date: string,
): Promise<HeatmapDailySnapshot | null> {
  try {
    const [row] = await db
      .select()
      .from(heatmapDailyTable)
      .where(eq(heatmapDailyTable.date, date))
      .limit(1);
    if (!row) return null;
    return {
      date: row.date,
      cells: row.cells ?? [],
      colorScaleMax: toNum(row.colorScaleMax),
      generatedAt: row.generatedAt,
    };
  } catch (error) {
    if (isMissingHeatmapTable(error)) return null;
    throw error;
  }
}
