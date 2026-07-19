import { expect, test } from "vitest";

import {
  detectBalanceJump,
  projectUnderlying,
  rescaleAverageCost,
} from "./staking.js";

test("projectUnderlying compounds forward by APY", () => {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2027-01-01T00:00:00Z"); // 365 days
  expect(projectUnderlying(100, 0.07, from, to)).toBeCloseTo(107, 6);
});

test("projectUnderlying over a week is a small increase", () => {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2026-01-08T00:00:00Z");
  const projected = projectUnderlying(10, 0.07, from, to);
  expect(projected).toBeGreaterThan(10);
  expect(projected).toBeLessThan(10.02);
  expect(projected).toBeCloseTo(10 * Math.pow(1.07, 7 / 365), 9);
});

test("projectUnderlying returns input when no time elapsed or inverted", () => {
  const at = new Date("2026-01-01T00:00:00Z");
  expect(projectUnderlying(10, 0.07, at, at)).toBe(10);
  expect(
    projectUnderlying(10, 0.07, at, new Date("2025-12-31T00:00:00Z")),
  ).toBe(10);
});

test("projectUnderlying keeps zero amounts untouched", () => {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2026-02-01T00:00:00Z");
  expect(projectUnderlying(0, 0.07, from, to)).toBe(0);
});

test("rescaleAverageCost keeps total cost constant", () => {
  // 10 units at cost 150 (total 1500); rewards grow it to 10.4 units.
  const next = rescaleAverageCost(10, 150, 10.4);
  expect(next).not.toBeNull();
  expect(10.4 * next!).toBeCloseTo(1500, 9);
});

test("rescaleAverageCost is stable across repeated syncs", () => {
  let amount = 10;
  let cost = 150;
  for (const nextAmount of [10.1, 10.2, 10.35, 10.5]) {
    cost = rescaleAverageCost(amount, cost, nextAmount)!;
    amount = nextAmount;
  }
  expect(amount * cost).toBeCloseTo(1500, 6);
});

test("rescaleAverageCost returns null for non-positive amounts", () => {
  expect(rescaleAverageCost(0, 150, 10)).toBeNull();
  expect(rescaleAverageCost(10, 150, 0)).toBeNull();
  expect(rescaleAverageCost(-1, 150, 10)).toBeNull();
});

test("detectBalanceJump passes normal epoch rewards", () => {
  // ~7% APY over 1 day is ~0.019% growth — well within allowance.
  expect(detectBalanceJump(10, 10.0019, 0.07, 1)).toBeNull();
  // A couple of epochs' rewards after 3 days offline.
  expect(detectBalanceJump(10, 10.006, 0.07, 3)).toBeNull();
});

test("detectBalanceJump flags deposit-like growth", () => {
  // +10% in a day cannot be yield at 7% APY.
  expect(detectBalanceJump(10, 11, 0.07, 1)).toBe("deposit");
  // Even with no APY configured, +10%/day exceeds the generous default.
  expect(detectBalanceJump(10, 11, null, 1)).toBe("deposit");
});

test("detectBalanceJump flags any decrease as withdrawal-like", () => {
  expect(detectBalanceJump(10, 9.5, 0.07, 1)).toBe("withdrawal");
});

test("detectBalanceJump skips without a baseline", () => {
  expect(detectBalanceJump(0, 10, 0.07, 1)).toBeNull();
  expect(detectBalanceJump(10, 11, 0.07, 0)).toBeNull();
});
