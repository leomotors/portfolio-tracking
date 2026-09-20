import { describe, expect, it } from "vitest";

import { type SummaryResult } from "@/summary";

import { renderBentoPngs, toBentoMovers } from "./bentoPng";
import { type LendingHealthSnapshot } from "./lendingHealth";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function summary(overrides: Partial<SummaryResult> = {}): SummaryResult {
  return {
    circleSuffix: " 🟢",
    bank: 80_000.25,
    investCost: 900_000,
    investValue: 1_050_000.25,
    realEstate: 120_000,
    netWorth: 1_250_000.5,
    takenPnl: 30_000,
    bankDelta: 0,
    investCostDelta: 0,
    investValueDelta: 1_200,
    realEstateDelta: 0,
    netWorthDelta: 1_200,
    allTimePnl: 180_000.25,
    allTimePnlDelta: 1_200,
    hasTakenPnl: true,
    hasRealEstate: true,
    performers: {
      top: { name: "Alpha", pnlDelta: 10 },
      worst: { name: "Beta", pnlDelta: -8 },
    },
    ...overrides,
  };
}

const lending: LendingHealthSnapshot[] = [
  {
    name: "Ether.fi Cash",
    cash: [],
    borrowed: [],
    cashUsd: 9_000,
    borrowedUsd: 9_500,
    leftoverUsd: -500,
    protocolHealthFactor: 1.42,
  },
];

describe("toBentoMovers", () => {
  const now = new Date("2026-09-20T13:05:00+07:00");

  it("returns null when there are no movers and no lending", () => {
    expect(toBentoMovers(summary({ performers: null }), [], now)).toBeNull();
  });

  it("keeps lending-only cards", () => {
    const data = toBentoMovers(summary({ performers: null }), lending, now);
    expect(data).not.toBeNull();
    expect(data!.lending).toHaveLength(1);
    expect(data!.top).toBeNull();
  });
});

describe("renderBentoPngs", () => {
  const now = new Date("2026-09-20T13:05:00+07:00");

  it("returns PNG buffers for net worth and movers", async () => {
    const { networth, movers } = await renderBentoPngs(summary(), lending, now);
    expect(networth.subarray(0, 8)).toEqual(PNG);
    expect(movers).not.toBeNull();
    expect(movers!.subarray(0, 8)).toEqual(PNG);
  });

  it("omits movers when there is nothing to plot", async () => {
    const { movers } = await renderBentoPngs(
      summary({ performers: null }),
      [],
      now,
    );
    expect(movers).toBeNull();
  });
});
