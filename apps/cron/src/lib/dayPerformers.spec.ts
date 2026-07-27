import { describe, expect, it } from "vitest";

import {
  type AssetSnapshot,
  dayPnlDelta,
  findTopAndWorstPerformers,
} from "./dayPerformers";

describe("dayPnlDelta", () => {
  it("is the change in unrealized P/L (value − cost)", () => {
    expect(
      dayPnlDelta({ cost: 100, value: 120 }, { cost: 100, value: 110 }),
    ).toBe(10);
  });

  it("ignores deposits that raise cost and value equally", () => {
    expect(
      dayPnlDelta({ cost: 200, value: 220 }, { cost: 100, value: 120 }),
    ).toBe(0);
  });
});

describe("findTopAndWorstPerformers", () => {
  const current: AssetSnapshot[] = [
    {
      id: 1,
      name: "Alpha Stock",
      symbol: "ALP",
      assetClass: "stock",
      cost: 100,
      value: 150,
    },
    {
      id: 2,
      name: "Beta Fund",
      symbol: "BET",
      assetClass: "bond",
      cost: 200,
      value: 180,
    },
    {
      id: 3,
      name: "Gamma Bond",
      symbol: "GAM",
      assetClass: "bond",
      cost: 50,
      value: 55,
    },
  ];

  const previousById = new Map([
    [1, { cost: 100, value: 120 }],
    [2, { cost: 200, value: 210 }],
    [3, { cost: 50, value: 60 }],
  ]);

  it("returns null when no assets overlap with previous", () => {
    expect(
      findTopAndWorstPerformers(
        current,
        new Map([[99, { cost: 1, value: 1 }]]),
      ),
    ).toBeNull();
  });

  it("picks highest and lowest day P/L contribution", () => {
    // Alpha: +30, Beta: -30, Gamma: -5
    expect(findTopAndWorstPerformers(current, previousById)).toEqual({
      top: { name: "Alpha Stock", pnlDelta: 30 },
      worst: { name: "Beta Fund", pnlDelta: -30 },
    });
  });

  it("skips assets missing from the previous snapshot", () => {
    const prev = new Map([
      [2, { cost: 200, value: 210 }],
      [3, { cost: 50, value: 60 }],
    ]);
    expect(findTopAndWorstPerformers(current, prev)).toEqual({
      top: { name: "Gamma Bond", pnlDelta: -5 },
      worst: { name: "Beta Fund", pnlDelta: -30 },
    });
  });

  it("allows the same asset to be both top and worst", () => {
    expect(
      findTopAndWorstPerformers(
        [
          {
            id: 1,
            name: "Only",
            symbol: "ONLY",
            assetClass: "stock",
            cost: 10,
            value: 12,
          },
        ],
        new Map([[1, { cost: 10, value: 11 }]]),
      ),
    ).toEqual({
      top: { name: "Only", pnlDelta: 1 },
      worst: { name: "Only", pnlDelta: 1 },
    });
  });
});
