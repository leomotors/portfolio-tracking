import { describe, expect, it } from "vitest";

import {
  ACCOUNT_OUTSIDE_BANKS,
  ACCOUNT_OUTSIDE_REAL_ESTATE,
  accountPnlBreakdown,
  allocationMembers,
  allTimePnlSeries,
  type AssetRow,
  byAssetClass,
  byAssetType,
  byCurrency,
  byCustody,
  byInvestmentAccount,
  byRiskLevel,
  capitalFlowSeries,
  combineCapitalSeries,
  combineNetWorthSeries,
  coreSatelliteSplit,
  costBasisFlowSeries,
  type CurrencyRow,
  dayDelta,
  dayMovers,
  inAccountLoggedPnl,
  type InvestmentAccountRow,
  investmentTotals,
  isCapitalBankAccount,
  savingsFlowSeries,
  sliceTimeframe,
  snapshotCostShifts,
  takenPnl,
  takenPnlAsOf,
  undocumentedLeftover,
  valueFlowSeries,
  withdrawCostDelta,
} from "./aggregate";

const thb: CurrencyRow = {
  id: 1,
  symbol: "THB",
  variant: null,
  valueInTHB: 1,
  updatedAt: null,
};
const usd: CurrencyRow = {
  id: 2,
  symbol: "USD",
  variant: null,
  valueInTHB: 33.42,
  updatedAt: null,
};
const eur: CurrencyRow = {
  id: 3,
  symbol: "EUR",
  variant: null,
  valueInTHB: 36,
  updatedAt: null,
};

const asset = (overrides: Partial<AssetRow>): AssetRow => ({
  id: 1,
  name: "Test",
  symbol: "T",
  investmentAccountId: 1,
  currencyId: 1,
  assetType: "thai_stock",
  assetClass: "stock",
  riskLevel: "safe_core",
  amount: 1,
  averageCost: 1,
  currentPrice: 1,
  ...overrides,
});

const inv = (
  overrides: Partial<InvestmentAccountRow>,
): InvestmentAccountRow => ({
  id: 1,
  name: "Test",
  currentCost: 0,
  currentValue: 0,
  custody: null,
  ...overrides,
});

describe("byAssetClass", () => {
  it("sums positions in THB by asset class, descending by value", () => {
    const buckets = byAssetClass(
      [
        asset({ id: 1, assetClass: "stock", amount: 100, currentPrice: 10 }),
        asset({ id: 2, assetClass: "stock", amount: 50, currentPrice: 4 }),
        asset({ id: 3, assetClass: "bond", amount: 200, currentPrice: 1 }),
        asset({
          id: 4,
          assetClass: "digital_asset",
          currencyId: 2,
          amount: 1,
          currentPrice: 100,
        }),
      ],
      [thb, usd],
    );
    expect(buckets.map((b) => b.key)).toEqual([
      "digital_asset",
      "stock",
      "bond",
    ]);
    expect(buckets[0]!.value).toBeCloseTo(3342);
    expect(buckets[1]!.value).toBe(1200);
    expect(buckets[2]!.value).toBe(200);
  });

  it("returns empty array for no assets", () => {
    expect(byAssetClass([], [thb])).toEqual([]);
  });

  it("adds bank balances into the cash bucket (matches Grafana SQL)", () => {
    const buckets = byAssetClass(
      [asset({ id: 1, assetClass: "stock", amount: 10, currentPrice: 100 })],
      [thb],
      [
        { id: 1, currentBalance: 500 },
        { id: 2, currentBalance: 1500 },
      ],
    );
    const cash = buckets.find((b) => b.key === "cash");
    const stock = buckets.find((b) => b.key === "stock");
    expect(cash?.value).toBe(2000);
    expect(stock?.value).toBe(1000);
  });
});

describe("byAssetType", () => {
  it("splits Thai stock from offshore stock", () => {
    const buckets = byAssetType(
      [
        asset({
          id: 1,
          assetType: "thai_stock",
          amount: 10,
          currentPrice: 100,
        }),
        asset({
          id: 2,
          assetType: "offshore_stock",
          amount: 5,
          currentPrice: 80,
        }),
        asset({
          id: 3,
          assetType: "thai_stock",
          amount: 2,
          currentPrice: 50,
        }),
      ],
      [thb],
    );
    expect(buckets.map((b) => b.key)).toEqual(["thai_stock", "offshore_stock"]);
    expect(buckets[0]!.value).toBe(1100);
    expect(buckets[1]!.value).toBe(400);
    expect(buckets[0]!.label).toBe("Thai stock");
    expect(buckets[1]!.label).toBe("Offshore stock");
  });

  it("adds bank balances into Thai cash and real estate as its own type", () => {
    const buckets = byAssetType(
      [
        asset({
          id: 1,
          assetType: "digital_asset",
          assetClass: "digital_asset",
          amount: 1,
          currentPrice: 100,
        }),
      ],
      [thb],
      [{ id: 1, currentBalance: 700 }],
      [
        {
          currencyId: 1,
          currency: "THB",
          riskLevel: "safe_core",
          costValue: 1,
          marketValue: 300,
        },
      ],
    );
    expect(buckets.map((b) => b.key)).toEqual([
      "thai_cash",
      "real_estate",
      "digital_asset",
    ]);
    expect(buckets.map((b) => b.value)).toEqual([700, 300, 100]);
  });
});

describe("byRiskLevel", () => {
  it("orders buckets safe_core → higher_satellite", () => {
    const buckets = byRiskLevel(
      [
        asset({
          id: 1,
          riskLevel: "higher_satellite",
          amount: 1,
          currentPrice: 100,
        }),
        asset({ id: 2, riskLevel: "safe_core", amount: 1, currentPrice: 50 }),
      ],
      [thb],
    );
    expect(buckets.map((b) => b.key)).toEqual([
      "safe_core",
      "higher_satellite",
    ]);
  });

  it("adds bank balances into the safe_core bucket (matches Grafana SQL)", () => {
    const buckets = byRiskLevel(
      [
        asset({
          id: 1,
          riskLevel: "higher_satellite",
          amount: 1,
          currentPrice: 100,
        }),
      ],
      [thb],
      [{ id: 1, currentBalance: 700 }],
    );
    const safe = buckets.find((b) => b.key === "safe_core");
    expect(safe?.value).toBe(700);
    expect(buckets[0]!.key).toBe("safe_core");
  });
});

describe("coreSatelliteSplit", () => {
  it("totals core (suffix _core) vs satellite (suffix _satellite)", () => {
    const buckets = byRiskLevel(
      [
        asset({ id: 1, riskLevel: "safe_core", amount: 1, currentPrice: 100 }),
        asset({
          id: 2,
          riskLevel: "surface_core",
          amount: 1,
          currentPrice: 50,
        }),
        asset({
          id: 3,
          riskLevel: "higher_satellite",
          amount: 1,
          currentPrice: 30,
        }),
      ],
      [thb],
    );
    const split = coreSatelliteSplit(buckets);
    expect(split.core).toBe(150);
    expect(split.satellite).toBe(30);
  });
});

describe("byCurrency", () => {
  it("includes THB bank balances under THB and converts foreign assets via FX", () => {
    const buckets = byCurrency(
      [asset({ currencyId: 2, amount: 1, currentPrice: 100 })],
      [thb, usd],
      [{ id: 1, currentBalance: 500 }],
    );
    const thbBucket = buckets.find((b) => b.key === "THB");
    const usdBucket = buckets.find((b) => b.key === "USD");
    expect(thbBucket?.value).toBe(500);
    expect(usdBucket?.value).toBeCloseTo(3342);
  });

  it("excludes zero-value buckets", () => {
    const buckets = byCurrency([], [thb, usd, eur], []);
    expect(buckets).toEqual([]);
  });
});

describe("byCustody", () => {
  it("orders unclassified then Thai → foreign → self → protocol", () => {
    const buckets = byCustody([
      inv({
        id: 1,
        name: "Protocol",
        custody: "protocol_custodial",
        currentValue: 40,
      }),
      inv({
        id: 2,
        name: "Wallet",
        custody: "self_custodial",
        currentValue: 80,
      }),
      inv({
        id: 3,
        name: "IBKR",
        custody: "foreign_custodial",
        currentValue: 60,
      }),
      inv({
        id: 4,
        name: "Dime",
        custody: "thai_custodial",
        currentValue: 20,
      }),
      inv({ id: 5, name: "Unset", custody: null, currentValue: 10 }),
    ]);
    expect(buckets.map((b) => b.key)).toEqual([
      "unclassified",
      "thai_custodial",
      "foreign_custodial",
      "self_custodial",
      "protocol_custodial",
    ]);
    expect(buckets.map((b) => b.value)).toEqual([10, 20, 60, 80, 40]);
  });

  it("adds bank balances and real estate into Thai custodial", () => {
    const buckets = byCustody(
      [
        inv({
          id: 1,
          name: "Wallet",
          custody: "self_custodial",
          currentValue: 100,
        }),
      ],
      [{ id: 1, currentBalance: 700 }],
      [
        {
          currencyId: 1,
          currency: "THB",
          riskLevel: "safe_core",
          costValue: 1,
          marketValue: 300,
        },
      ],
    );
    const thai = buckets.find((b) => b.key === "thai_custodial");
    const self = buckets.find((b) => b.key === "self_custodial");
    expect(thai?.value).toBe(1000);
    expect(self?.value).toBe(100);
  });
});

describe("byInvestmentAccount", () => {
  it("buckets accounts by name, descending by current value", () => {
    const buckets = byInvestmentAccount([
      inv({ id: 2, name: "Small", currentCost: 1, currentValue: 100 }),
      inv({ id: 1, name: "Large", currentCost: 1, currentValue: 900 }),
      inv({ id: 3, name: "Empty", currentCost: 0, currentValue: 0 }),
    ]);
    expect(buckets.map((b) => b.label)).toEqual(["Large", "Small"]);
    expect(buckets.map((b) => b.key)).toEqual(["1", "2"]);
    expect(buckets[0]!.value).toBe(900);
  });

  it("returns empty array when every account is zero", () => {
    expect(
      byInvestmentAccount([
        inv({ id: 1, name: "Closed", currentCost: 0, currentValue: 0 }),
      ]),
    ).toEqual([]);
  });
});

describe("allocationMembers", () => {
  const dime = inv({
    id: 1,
    name: "Dime",
    currentCost: 1,
    currentValue: 1500,
  });
  const banks = [{ id: 1, name: "Savings", bank: "SCB", currentBalance: 700 }];
  const condo = {
    id: 1,
    name: "Condo",
    currencyId: 1,
    currency: "THB",
    riskLevel: "safe_core",
    costValue: 1,
    marketValue: 300,
  };

  it("lists Thai vs offshore holdings with the account as sublabel", () => {
    const members = allocationMembers("type", {
      assets: [
        asset({
          id: 1,
          name: "PTT",
          symbol: "PTT",
          assetType: "thai_stock",
          amount: 10,
          currentPrice: 100,
        }),
        asset({
          id: 2,
          name: "Vanguard",
          symbol: "VOO",
          assetType: "offshore_stock",
          amount: 5,
          currentPrice: 80,
        }),
      ],
      currencies: [thb],
      bankAccounts: [],
      realEstateProperties: [],
      investmentAccounts: [dime],
    });
    expect(members.thai_stock?.map((m) => m.label)).toEqual(["PTT"]);
    expect(members.thai_stock?.[0]?.sublabel).toBe("Dime");
    expect(members.thai_stock?.[0]?.value).toBe(1000);
    expect(members.offshore_stock?.map((m) => m.label)).toEqual(["VOO"]);
  });

  it("folds banks and properties into cash / Thai cash / Thai custodial", () => {
    const input = {
      assets: [
        asset({
          id: 1,
          assetClass: "digital_asset",
          assetType: "digital_asset",
          amount: 1,
          currentPrice: 100,
        }),
      ],
      currencies: [thb],
      bankAccounts: banks,
      realEstateProperties: [condo],
      investmentAccounts: [dime],
    };
    expect(allocationMembers("class", input).cash?.[0]).toMatchObject({
      key: "bank:1",
      label: "Savings",
      origin: "bank",
      value: 700,
    });
    expect(allocationMembers("type", input).thai_cash?.[0]?.label).toBe(
      "Savings",
    );
    expect(
      allocationMembers("class", input).real_estate?.map((m) => m.label),
    ).toEqual(["Condo"]);
    const thai = allocationMembers("custody", input).thai_custodial;
    expect(thai?.map((m) => m.origin)).toEqual(["bank", "real_estate"]);
  });

  it("puts a residual on an account when stored value disagrees with assets", () => {
    const members = allocationMembers("account", {
      assets: [
        asset({
          id: 1,
          name: "PTT",
          symbol: "PTT",
          amount: 10,
          currentPrice: 100,
        }),
      ],
      currencies: [thb],
      bankAccounts: banks,
      realEstateProperties: [condo],
      investmentAccounts: [dime],
    });
    expect(members["1"]?.map((m) => m.origin)).toEqual(["asset", "residual"]);
    expect(members["1"]?.[1]).toMatchObject({
      label: "Unallocated in account",
      value: 500,
      origin: "residual",
    });
    expect(members[ACCOUNT_OUTSIDE_BANKS]?.map((m) => m.label)).toEqual([
      "Savings",
    ]);
    expect(members[ACCOUNT_OUTSIDE_REAL_ESTATE]?.map((m) => m.label)).toEqual([
      "Condo",
    ]);
  });
});

describe("isCapitalBankAccount", () => {
  it("accepts high-yield savings account types", () => {
    expect(isCapitalBankAccount("savings")).toBe(true);
    expect(isCapitalBankAccount("e_savings")).toBe(true);
    expect(isCapitalBankAccount("fixed")).toBe(true);
  });

  it("rejects unknown or missing types", () => {
    expect(isCapitalBankAccount("spending")).toBe(false);
    expect(isCapitalBankAccount(null)).toBe(false);
  });
});

describe("combineCapitalSeries", () => {
  it("sums investment cost and savings balance by date", () => {
    const out = combineCapitalSeries(
      [
        { accountId: 1, date: "2026-05-08", cost: 100 },
        { accountId: 1, date: "2026-05-09", cost: 120 },
      ],
      [
        { accountId: 1, date: "2026-05-08", balance: 50 },
        { accountId: 1, date: "2026-05-10", balance: 80 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 150 },
      { date: "2026-05-09", value: 170 },
      { date: "2026-05-10", value: 200 },
    ]);
  });
});

describe("capitalFlowSeries", () => {
  it("combines investment cost and savings balance changes", () => {
    const out = capitalFlowSeries(
      ["2026-05-08", "2026-05-09"],
      [
        { accountId: 1, date: "2026-05-08", cost: 100 },
        { accountId: 1, date: "2026-05-09", cost: 150 },
      ],
      [
        { accountId: 1, date: "2026-05-08", balance: 50 },
        { accountId: 1, date: "2026-05-09", balance: 30 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 150 },
      { date: "2026-05-09", value: 30 },
    ]);
  });
});

describe("savingsFlowSeries", () => {
  it("tracks savings balance changes only", () => {
    const out = savingsFlowSeries(
      ["2026-05-08", "2026-05-09"],
      [
        { accountId: 1, date: "2026-05-08", balance: 100 },
        { accountId: 1, date: "2026-05-09", balance: 80 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: -20 },
    ]);
  });
});

describe("valueFlowSeries", () => {
  it("derives flow from a level series", () => {
    const out = valueFlowSeries(
      ["2026-05-08", "2026-05-09"],
      [
        { date: "2026-05-08", value: 100 },
        { date: "2026-05-09", value: 130 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: 30 },
    ]);
  });
});

describe("costBasisFlowSeries", () => {
  it("computes day-over-day cost changes aligned to chart dates", () => {
    const out = costBasisFlowSeries(
      ["2026-05-08", "2026-05-09", "2026-05-10"],
      [
        { accountId: 1, date: "2026-05-08", cost: 100 },
        { accountId: 1, date: "2026-05-09", cost: 150 },
        { accountId: 2, date: "2026-05-09", cost: 50 },
        { accountId: 1, date: "2026-05-10", cost: 140 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: 100 },
      { date: "2026-05-10", value: -60 },
    ]);
  });

  it("carries cost forward across chart dates without new snapshots", () => {
    const out = costBasisFlowSeries(
      ["2026-05-08", "2026-05-09", "2026-05-10"],
      [
        { accountId: 1, date: "2026-05-08", cost: 100 },
        { accountId: 1, date: "2026-05-10", cost: 120 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: 0 },
      { date: "2026-05-10", value: 20 },
    ]);
  });

  it("returns empty for no chart dates", () => {
    expect(costBasisFlowSeries([], [])).toEqual([]);
  });
});

describe("combineNetWorthSeries", () => {
  it("sums investments + banks per date and sorts ascending", () => {
    const out = combineNetWorthSeries(
      [
        { accountId: 1, date: "2026-05-08", value: 100 },
        { accountId: 1, date: "2026-05-09", value: 110 },
        { accountId: 2, date: "2026-05-09", value: 50 },
      ],
      [
        { accountId: 1, date: "2026-05-08", balance: 200 },
        { accountId: 1, date: "2026-05-09", balance: 210 },
      ],
    );
    expect(out).toEqual([
      { date: "2026-05-08", value: 300 },
      { date: "2026-05-09", value: 370 },
    ]);
  });

  it("returns empty for no input", () => {
    expect(combineNetWorthSeries([], [])).toEqual([]);
  });
});

describe("dayDelta", () => {
  it("computes today vs yesterday delta + pct", () => {
    const out = dayDelta([
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: 110 },
    ]);
    expect(out.current).toBe(110);
    expect(out.previous).toBe(100);
    expect(out.delta).toBe(10);
    expect(out.deltaPct).toBeCloseTo(0.1);
  });

  it("returns zeros on empty series", () => {
    expect(dayDelta([])).toEqual({
      current: 0,
      previous: 0,
      delta: 0,
      deltaPct: 0,
    });
  });

  it("treats single-point series as no delta", () => {
    const out = dayDelta([{ date: "2026-05-09", value: 100 }]);
    expect(out.current).toBe(100);
    expect(out.previous).toBe(100);
    expect(out.delta).toBe(0);
  });

  it("handles previous=0 without dividing by zero", () => {
    const out = dayDelta([
      { date: "2026-05-08", value: 0 },
      { date: "2026-05-09", value: 50 },
    ]);
    expect(out.deltaPct).toBe(0);
  });
});

describe("sliceTimeframe", () => {
  const series = Array.from({ length: 400 }, (_, i) => ({
    date: `d${i}`,
    value: i,
  }));

  it("keeps the trailing N days based on timeframe", () => {
    expect(sliceTimeframe(series, "1M")).toHaveLength(30);
    expect(sliceTimeframe(series, "3M")).toHaveLength(90);
    expect(sliceTimeframe(series, "6M")).toHaveLength(180);
    expect(sliceTimeframe(series, "1Y")).toHaveLength(365);
    expect(sliceTimeframe(series, "ALL")).toHaveLength(400);
  });
});

describe("dayMovers", () => {
  it("sorts by absolute delta descending", () => {
    const movers = dayMovers([
      { accountId: 1, name: "Small up", current: 105, previous: 100 },
      { accountId: 2, name: "Big down", current: 80, previous: 100 },
      { accountId: 3, name: "Medium up", current: 120, previous: 110 },
    ]);
    expect(movers.map((m) => m.accountId)).toEqual([2, 3, 1]);
    expect(movers[0]!.delta).toBe(-20);
    expect(movers[0]!.deltaPct).toBeCloseTo(-0.2);
  });
});

describe("investmentTotals", () => {
  it("sums values and costs and computes P/L", () => {
    const out = investmentTotals([
      inv({ id: 1, name: "A", currentCost: 100, currentValue: 150 }),
      inv({ id: 2, name: "B", currentCost: 200, currentValue: 180 }),
    ]);
    expect(out.total).toBe(330);
    expect(out.cost).toBe(300);
    expect(out.pl).toBe(30);
    expect(out.plPct).toBeCloseTo(0.1);
  });

  it("returns zeros and avoids div-by-zero on empty input", () => {
    const out = investmentTotals([]);
    expect(out).toEqual({ total: 0, cost: 0, pl: 0, plPct: 0 });
  });
});

describe("accountPnlBreakdown", () => {
  const account = inv({
    id: 1,
    name: "Broker",
    currentCost: 10_000,
    currentValue: 12_000,
  });

  it("treats the gap between account P/L and position P/Ls as realized", () => {
    const out = accountPnlBreakdown(
      account,
      [
        asset({
          id: 1,
          amount: 50,
          averageCost: 100,
          currentPrice: 140,
        }),
      ],
      [thb],
    );
    expect(out.accountPnl).toBe(2_000);
    expect(out.unrealizedPnl).toBe(2_000);
    expect(out.realizedPnl).toBe(0);
    expect(out.accountPnlPct).toBeCloseTo(0.2);
  });

  it("keeps account P/L after a rotation and assigns the sold gain to realized", () => {
    // Sold a 10k-cost lot for 12k and bought a new lot at 12k. Account
    // cost/value stay 10k/12k; the open position now has zero unrealized.
    const out = accountPnlBreakdown(
      account,
      [
        asset({
          id: 2,
          amount: 100,
          averageCost: 120,
          currentPrice: 120,
        }),
      ],
      [thb],
    );
    expect(out.accountPnl).toBe(2_000);
    expect(out.unrealizedPnl).toBe(0);
    expect(out.realizedPnl).toBe(2_000);
  });

  it("applies FX to open-position P/L before taking the residual", () => {
    const out = accountPnlBreakdown(
      inv({ id: 1, name: "USD", currentCost: 33_420, currentValue: 40_104 }),
      [
        asset({
          id: 1,
          currencyId: 2,
          amount: 10,
          averageCost: 100,
          currentPrice: 120,
        }),
      ],
      [thb, usd],
    );
    expect(out.unrealizedPnl).toBeCloseTo(10 * 20 * 33.42);
    expect(out.realizedPnl).toBeCloseTo(0);
  });

  it("reports no FX exposure when every position is priced in THB", () => {
    const out = accountPnlBreakdown(
      account,
      [asset({ id: 1, amount: 50, averageCost: 100, currentPrice: 140 })],
      [thb],
    );
    expect(out.fxBasisExposure).toBe(0);
  });

  it("reports the THB cost basis of foreign positions as FX exposure", () => {
    const out = accountPnlBreakdown(
      inv({ id: 1, name: "USD", currentCost: 33_420, currentValue: 40_104 }),
      [
        asset({
          id: 1,
          currencyId: 2,
          amount: 10,
          averageCost: 100,
          currentPrice: 120,
        }),
      ],
      [thb, usd],
    );
    expect(out.fxBasisExposure).toBeCloseTo(10 * 100 * 33.42);
  });

  it("counts only the foreign leg when a mixed account holds both", () => {
    const out = accountPnlBreakdown(
      inv({ id: 1, name: "Mixed", currentCost: 43_420, currentValue: 52_104 }),
      [
        asset({ id: 1, amount: 100, averageCost: 100, currentPrice: 120 }),
        asset({
          id: 2,
          currencyId: 2,
          amount: 10,
          averageCost: 100,
          currentPrice: 120,
        }),
      ],
      [thb, usd],
    );
    expect(out.fxBasisExposure).toBeCloseTo(10 * 100 * 33.42);
  });

  it("calls the whole account P/L realized when there are no positions", () => {
    const out = accountPnlBreakdown(account, [], [thb]);
    expect(out.unrealizedPnl).toBe(0);
    expect(out.realizedPnl).toBe(2_000);
    expect(out.accountPnlPct).toBeCloseTo(0.2);
  });

  it("returns a zero percent when account cost is zero", () => {
    const out = accountPnlBreakdown(
      inv({ id: 1, name: "Empty", currentCost: 0, currentValue: 0 }),
      [],
      [thb],
    );
    expect(out).toEqual({
      accountPnl: 0,
      accountPnlPct: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
      fxBasisExposure: 0,
    });
  });
});

describe("withdrawCostDelta", () => {
  it("removes cost equal to withdraw minus the P/L taken out", () => {
    expect(withdrawCostDelta(50, 20)).toBe(-30);
    expect(withdrawCostDelta(50, 50)).toBe(0);
    expect(withdrawCostDelta(50, 0)).toBe(-50);
  });

  it("increases the cost reduction when the taken P/L is a loss", () => {
    expect(withdrawCostDelta(80, -20)).toBe(-100);
  });

  it("converts native withdraw and P/L through the snapshotted FX", () => {
    expect(withdrawCostDelta(2071.7, 726.19, 32.9)).toBe(-44267.28);
  });
});

describe("in-account vs taken P/L logs", () => {
  const events = [
    { kind: "in_account" as const, pnl: 12_000, valueInTHB: 1 },
    { kind: "undocumented" as const, pnl: 8_000, valueInTHB: 1 },
    { kind: "withdrawn" as const, pnl: 5_000, valueInTHB: 1 },
  ];

  it("sums only in-account explanations toward the residual log", () => {
    expect(inAccountLoggedPnl(events)).toBe(20_000);
  });

  it("sums only withdrawn rows as taken P/L", () => {
    expect(takenPnl(events)).toBe(5_000);
  });

  it("treats leftover as computed realized minus logged in-account rows", () => {
    expect(undocumentedLeftover(22_000, events)).toBe(2_000);
  });

  it("leaves leftover equal to computed realized when the log is empty", () => {
    expect(undocumentedLeftover(20_000, [])).toBe(20_000);
  });

  it("converts native in-account P/L to THB with the snapshotted FX", () => {
    expect(
      inAccountLoggedPnl([
        { kind: "in_account", pnl: 726.19, valueInTHB: 32.9 },
      ]),
    ).toBeCloseTo(23_891.651);
  });
});

describe("allTimePnlSeries", () => {
  it("equals open P/L when nothing has been withdrawn", () => {
    expect(
      allTimePnlSeries(
        [
          { date: "2026-09-10", value: 130, cost: 100 },
          { date: "2026-09-11", value: 140, cost: 100 },
        ],
        [],
      ),
    ).toEqual([
      { date: "2026-09-10", value: 30 },
      { date: "2026-09-11", value: 40 },
    ]);
  });

  it("adds taken P/L from the occurred-on date so a withdrawal is not a loss", () => {
    expect(
      allTimePnlSeries(
        [
          { date: "2026-09-10", value: 130_000, cost: 100_000 },
          { date: "2026-09-11", value: 30_000, cost: 30_000 },
        ],
        [{ occurredOn: "2026-09-11", pnlThb: 30_000 }],
      ),
    ).toEqual([
      { date: "2026-09-10", value: 30_000 },
      { date: "2026-09-11", value: 30_000 },
    ]);
  });

  it("keeps a same-day market move after adding taken P/L back", () => {
    const series = allTimePnlSeries(
      [
        { date: "2026-09-10", value: 130_000, cost: 100_000 },
        { date: "2026-09-11", value: 30_500, cost: 30_000 },
      ],
      [{ occurredOn: "2026-09-11", pnlThb: 30_000 }],
    );
    expect(series[1]!.value).toBe(30_500);
  });

  it("sums open P/L across accounts before adding taken", () => {
    expect(
      allTimePnlSeries(
        [
          { date: "2026-09-11", value: 10, cost: 8 },
          { date: "2026-09-11", value: 20, cost: 20 },
        ],
        [{ occurredOn: "2026-09-11", pnlThb: 5 }],
      ),
    ).toEqual([{ date: "2026-09-11", value: 7 }]);
  });
});

describe("takenPnlAsOf", () => {
  it("includes only events on or before the as-of date", () => {
    const events = [
      { occurredOn: "2026-09-10", pnlThb: 10 },
      { occurredOn: "2026-09-12", pnlThb: 7 },
    ];
    expect(takenPnlAsOf(events, "2026-09-09")).toBe(0);
    expect(takenPnlAsOf(events, "2026-09-10")).toBe(10);
    expect(takenPnlAsOf(events, "2026-09-12")).toBe(17);
  });
});

describe("snapshotCostShifts", () => {
  it("applies cost_delta to snapshots on or after occurredOn", () => {
    expect(
      snapshotCostShifts(
        [
          { accountId: 1, date: "2026-09-09", cost: 100, value: 130 },
          { accountId: 1, date: "2026-09-10", cost: 100, value: 40 },
          { accountId: 1, date: "2026-09-11", cost: 100, value: 42 },
          { accountId: 2, date: "2026-09-10", cost: 50, value: 50 },
        ],
        [{ accountId: 1, occurredOn: "2026-09-10", costDelta: -70 }],
      ),
    ).toEqual([
      {
        accountId: 1,
        date: "2026-09-10",
        oldCost: 100,
        newCost: 30,
        value: 40,
      },
      {
        accountId: 1,
        date: "2026-09-11",
        oldCost: 100,
        newCost: 30,
        value: 42,
      },
    ]);
  });
});
