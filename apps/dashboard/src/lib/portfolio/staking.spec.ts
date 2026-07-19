import { describe, expect, it } from "vitest";

import {
  effectiveApy,
  rescaleAverageCost,
  type StakingDailySample,
  timeWeightedApy,
} from "./staking";

describe("effectiveApy", () => {
  it("annualizes growth since the staked-since date", () => {
    // 7% growth over exactly one year -> 7% APY. Local-midnight `now` to
    // match how stakedSince is parsed.
    const apy = effectiveApy(
      100,
      107,
      "2025-07-17",
      new Date("2026-07-17T00:00:00"),
    );
    expect(apy).not.toBeNull();
    expect(apy!).toBeCloseTo(0.07, 4);
  });

  it("annualizes short periods upward", () => {
    // ~0.13% growth over a week is roughly 7%/yr.
    const now = new Date("2026-01-08T00:00:00");
    const current = 10 * Math.pow(1.07, 7 / 365);
    const apy = effectiveApy(10, current, "2026-01-01", now);
    expect(apy).not.toBeNull();
    expect(apy!).toBeCloseTo(0.07, 6);
  });

  it("returns null without a baseline", () => {
    expect(effectiveApy(0, 10, "2026-01-01")).toBeNull();
    expect(effectiveApy(10, 0, "2026-01-01")).toBeNull();
    expect(effectiveApy(10, 10.5, null)).toBeNull();
  });

  it("returns null when staked less than a day", () => {
    expect(
      effectiveApy(10, 10.01, "2026-01-01", new Date("2026-01-01T12:00:00")),
    ).toBeNull();
  });
});

describe("timeWeightedApy", () => {
  const DAILY_7PCT = Math.pow(1.07, 1 / 365);
  const day = (i: number) => `2026-01-${String(i + 1).padStart(2, "0")}`;

  function steadyGrowth(days: number): StakingDailySample[] {
    return Array.from({ length: days + 1 }, (_, i) => ({
      date: day(i),
      currentUnderlying: 100 * Math.pow(DAILY_7PCT, i),
      depositedUnderlying: 100,
    }));
  }

  it("recovers the true APY from steady growth", () => {
    expect(timeWeightedApy(steadyGrowth(10))!).toBeCloseTo(0.07, 8);
  });

  it("is immune to a mid-period deposit, unlike the simple formula", () => {
    // 7%/yr growth; on day 5 another 100 is deposited (recorded same day).
    const samples: StakingDailySample[] = Array.from(
      { length: 11 },
      (_, i) => ({
        date: day(i),
        currentUnderlying:
          i < 5
            ? 100 * Math.pow(DAILY_7PCT, i)
            : 100 * Math.pow(DAILY_7PCT, i) + 100 * Math.pow(DAILY_7PCT, i - 5),
        depositedUnderlying: i < 5 ? 100 : 200,
      }),
    );

    expect(timeWeightedApy(samples)!).toBeCloseTo(0.07, 8);

    // The simple formula pretends the second 100 earned for all 10 days and
    // understates the rate.
    const last = samples.at(-1)!;
    const simple = effectiveApy(
      last.depositedUnderlying,
      last.currentUnderlying,
      day(0),
      new Date(day(10) + "T00:00:00"),
    );
    expect(simple!).toBeLessThan(0.06);
  });

  it("is immune to a mid-period withdrawal", () => {
    // 7%/yr growth; on day 5, 50 is withdrawn (recorded same day).
    const samples: StakingDailySample[] = Array.from(
      { length: 11 },
      (_, i) => ({
        date: day(i),
        currentUnderlying:
          i < 5
            ? 100 * Math.pow(DAILY_7PCT, i)
            : (100 * Math.pow(DAILY_7PCT, 5) - 50) *
              Math.pow(DAILY_7PCT, i - 5),
        depositedUnderlying: i < 5 ? 100 : 50,
      }),
    );
    expect(timeWeightedApy(samples)!).toBeCloseTo(0.07, 8);
  });

  it("returns null with fewer than the minimum days of history", () => {
    expect(timeWeightedApy(steadyGrowth(6))).toBeNull();
    expect(timeWeightedApy(steadyGrowth(1))).toBeNull();
    expect(timeWeightedApy([])).toBeNull();
  });

  it("respects a custom minimum", () => {
    expect(timeWeightedApy(steadyGrowth(3), 3)!).toBeCloseTo(0.07, 8);
  });
});

describe("rescaleAverageCost", () => {
  it("keeps total cost constant when the amount grows", () => {
    const next = rescaleAverageCost(2, 2000, 2.0481);
    expect(next).not.toBeNull();
    expect(2.0481 * next!).toBeCloseTo(4000, 9);
  });

  it("returns null for non-positive amounts", () => {
    expect(rescaleAverageCost(0, 2000, 2)).toBeNull();
    expect(rescaleAverageCost(2, 2000, 0)).toBeNull();
  });
});
