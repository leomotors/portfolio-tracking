import { describe, expect, it } from "vitest";

import {
  type BentoMoversData,
  type BentoNetworthData,
  renderMoversSvg,
  renderNetworthSvg,
  wrapLines,
} from "./bentoSvg";

const THAI_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
const SAMPLE_THAI_FUND = "กองทุนเปิดทดสอบยาวมาก XYZ100 - SAMPLE ชนิด A";

const networth: BentoNetworthData = {
  asOfLabel: "SUN 20 SEP 2026",
  asOfTime: "AS OF 20:05 ICT",
  netWorth: 1_250_000.5,
  netDelta: 1_200,
  bank: 80_000.25,
  bankDelta: 0,
  investCost: 900_000,
  investValue: 1_050_000.25,
  investValueDelta: 1_200,
  realEstate: 120_000,
  realEstateDelta: 0,
  hasRealEstate: true,
  allTimePnl: 180_000.25,
  allTimePnlDelta: 1_200,
  takenPnl: 30_000,
  hasTakenPnl: true,
};

const lendingOne = {
  name: "Ether.fi Cash",
  leftoverUsd: -500,
  cashUsd: 9_000,
  borrowedUsd: 9_500,
  protocolHealthFactor: 1.42,
};

describe("wrapLines", () => {
  it("keeps a short Latin name on one line", () => {
    expect(
      wrapLines("Example Coin (Staked)", 360, 20, { maxLines: 2 }),
    ).toEqual(["Example Coin (Staked)"]);
  });

  it("wraps a long Thai fund name without splitting graphemes", () => {
    const lines = wrapLines(SAMPLE_THAI_FUND, 280, 20, { maxLines: 2 });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("XYZ100");
    expect(lines.join("")).toContain("กองทุนเปิดทดสอบยาวมาก");
  });

  it("does not start a line with a Thai combining mark", () => {
    const lines = wrapLines("กิ่".repeat(30), 80, 20, { maxLines: 4 });
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line[0] ?? "").not.toMatch(THAI_MARK);
    }
  });
});

describe("renderNetworthSvg", () => {
  it("includes the hero total and day delta", () => {
    const svg = renderNetworthSvg(networth);
    expect(svg).toContain("1,250,000.50 THB");
    expect(svg).toContain("Today +1,200.00 THB");
    expect(svg).toContain("ALL-TIME P/L");
    expect(svg).toContain("Open 150,000.25");
  });

  it("labels Current P/L when nothing was taken", () => {
    const svg = renderNetworthSvg({
      ...networth,
      hasTakenPnl: false,
      takenPnl: 0,
    });
    expect(svg).toContain("CURRENT P/L");
    expect(svg).not.toContain("ALL-TIME P/L");
    expect(svg).not.toContain("Taken");
  });

  it("marks missing real estate instead of 0.00 THB", () => {
    const svg = renderNetworthSvg({
      ...networth,
      hasRealEstate: false,
      realEstate: 0,
    });
    expect(svg).toContain("Not tracked");
    expect(svg).not.toContain("Real estate 0.00%");
  });

  it("says day change unavailable on a first run", () => {
    const svg = renderNetworthSvg({ ...networth, netDelta: null });
    expect(svg).toContain("Day change unavailable");
  });
});

describe("renderMoversSvg", () => {
  const movers: BentoMoversData = {
    asOfLabel: "SUN 20 SEP 2026",
    top: {
      name: SAMPLE_THAI_FUND,
      delta: 250.5,
    },
    worst: { name: "Example Coin (Staked)", delta: -120.25 },
    lending: [lendingOne],
  };

  it("renders Thai top name, worst, and leftover", () => {
    const svg = renderMoversSvg(movers);
    expect(svg).toContain("กองทุนเปิดทดสอบยาวมาก");
    expect(svg).toContain("Example Coin (Staked)");
    expect(svg).toContain("−$500.00");
    expect(svg).toContain("SHORTFALL");
    expect(svg).toContain("1 POSITION");
  });

  it("compacts three lending rows and sorts by health factor", () => {
    const svg = renderMoversSvg({
      ...movers,
      lending: [
        lendingOne,
        {
          name: "Aave v3 ETH",
          leftoverUsd: 420.5,
          cashUsd: 8_200,
          borrowedUsd: 7_779.5,
          protocolHealthFactor: 2.08,
        },
        {
          name: "Morpho USDC",
          leftoverUsd: -80.25,
          cashUsd: 4_100,
          borrowedUsd: 4_180.25,
          protocolHealthFactor: 1.35,
        },
      ],
    });
    expect(svg).toContain("3 POSITIONS");
    const morpho = svg!.indexOf("Morpho USDC");
    const ether = svg!.indexOf("Ether.fi Cash");
    const aave = svg!.indexOf("Aave v3 ETH");
    expect(morpho).toBeGreaterThan(-1);
    expect(morpho).toBeLessThan(ether);
    expect(ether).toBeLessThan(aave);
  });

  it("returns null when there is nothing to show", () => {
    expect(
      renderMoversSvg({
        asOfLabel: "SUN 20 SEP 2026",
        top: null,
        worst: null,
        lending: [],
      }),
    ).toBeNull();
  });

  it("keeps lending when movers are missing", () => {
    const svg = renderMoversSvg({
      asOfLabel: "SUN 20 SEP 2026",
      top: null,
      worst: null,
      lending: [lendingOne],
    });
    expect(svg).toContain("Day movers available from the next run");
    expect(svg).toContain("Ether.fi Cash");
  });
});
