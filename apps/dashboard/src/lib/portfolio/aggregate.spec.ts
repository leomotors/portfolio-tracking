import { describe, expect, it } from "vitest";

import {
  type AssetRow,
  byAssetClass,
  byCurrency,
  byRiskLevel,
  combineNetWorthSeries,
  combineCapitalSeries,
  capitalFlowSeries,
  costBasisFlowSeries,
  coreSatelliteSplit,
  type CurrencyRow,
  dayDelta,
  dayMovers,
  investmentTotals,
  isCapitalBankAccount,
  savingsFlowSeries,
  sliceTimeframe,
  valueFlowSeries,
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
  assetClass: "stock",
  riskLevel: "safe_core",
  amount: 1,
  averageCost: 1,
  currentPrice: 1,
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
    const out = valueFlowSeries(["2026-05-08", "2026-05-09"], [
      { date: "2026-05-08", value: 100 },
      { date: "2026-05-09", value: 130 },
    ]);
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
      { id: 1, name: "A", currentCost: 100, currentValue: 150 },
      { id: 2, name: "B", currentCost: 200, currentValue: 180 },
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
