import "server-only";

import { asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  assetTable,
  bankAccountTable,
  bankDailyBalanceTable,
  creditCardAccountTable,
  currencyTable,
  fcdAccountTable,
  investmentAccountTable,
  investmentDailyBalanceTable,
  personalLoanAccountTable,
  realEstateDailyBalanceTable,
  realEstatePropertyTable,
} from "@repo/database/schema";

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
