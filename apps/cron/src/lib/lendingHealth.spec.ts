import { describe, expect, it } from "vitest";

import {
  buildLendingHealthSnapshot,
  formatLendingDiscordLines,
  isUnderDebt,
  leftoverUsd,
} from "./lendingHealth";

describe("leftoverUsd", () => {
  it("is cash minus borrowed", () => {
    expect(leftoverUsd(14_941.5, 14_601.31)).toBeCloseTo(340.19, 2);
  });

  it("is negative when the borrow exceeds cash", () => {
    expect(leftoverUsd(10_000, 14_601)).toBeCloseTo(-4_601, 2);
    expect(isUnderDebt(leftoverUsd(10_000, 14_601))).toBe(true);
  });

  it("is not under debt at exactly zero", () => {
    expect(isUnderDebt(0)).toBe(false);
  });
});

describe("buildLendingHealthSnapshot", () => {
  it("prices leftover from cash USD minus protocol debtUsd", () => {
    const snapshot = buildLendingHealthSnapshot({
      name: "Ether.fi Cash",
      cash: [
        { symbol: "liquidUSD", amount: 10_039.16, usd: 11_824.7 },
        { symbol: "liquidRWA", amount: 3_057.27, usd: 3_116.8 },
      ],
      borrowed: [{ symbol: "USDC", amount: 14_601.31, usd: 14_601.31 }],
      borrowedUsd: 14_601.31,
      protocolHealthFactor: 1.49,
    });

    expect(snapshot.cashUsd).toBeCloseTo(14_941.5, 1);
    expect(snapshot.leftoverUsd).toBeCloseTo(340.19, 1);
    expect(isUnderDebt(snapshot.leftoverUsd)).toBe(false);
  });

  it("falls back to summing borrowed positions when debtUsd is omitted", () => {
    const snapshot = buildLendingHealthSnapshot({
      name: "Test",
      cash: [{ symbol: "liquidUSD", amount: 1, usd: 100 }],
      borrowed: [{ symbol: "USDC", amount: 40, usd: 40 }],
    });
    expect(snapshot.borrowedUsd).toBe(40);
    expect(snapshot.leftoverUsd).toBe(60);
  });
});

describe("formatLendingDiscordLines", () => {
  const healthy = buildLendingHealthSnapshot({
    name: "Ether.fi Cash",
    cash: [
      { symbol: "liquidUSD", amount: 10_039, usd: 11_825 },
      { symbol: "liquidRWA", amount: 3_057, usd: 3_117 },
    ],
    borrowed: [{ symbol: "USDC", amount: 14_601, usd: 14_601 }],
    borrowedUsd: 14_601,
  });

  it("is empty when no monitors ran", () => {
    expect(formatLendingDiscordLines([])).toBe("");
  });

  it("is one USD net line", () => {
    expect(formatLendingDiscordLines([healthy])).toBe("Ether.fi Cash: $341.00");
  });

  it("warns when leftover is negative", () => {
    const text = formatLendingDiscordLines([{ ...healthy, leftoverUsd: -200 }]);
    expect(text).toBe("⚠️ **Ether.fi Cash: -$200.00**");
  });
});
