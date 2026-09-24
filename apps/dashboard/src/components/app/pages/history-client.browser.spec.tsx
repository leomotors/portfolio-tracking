import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { HistoryClient } from "./history-client";

const snapshot = {
  date: "2026-09-03",
  colorScaleMax: 5,
  generatedAt: new Date("2026-09-04T04:00:00Z"),
  networth: {
    asOfLabel: "THU 03 SEP 2026",
    asOfTime: "AS OF 04:00 ICT",
    netWorth: 1_250_000,
    netDelta: 1_200,
    bank: 80_000,
    bankDelta: 0,
    investCost: 900_000,
    investValue: 1_050_000,
    investValueDelta: 1_200,
    realEstate: 120_000,
    realEstateDelta: 0,
    hasRealEstate: true,
    allTimePnl: 180_000,
    allTimePnlDelta: 1_200,
    takenPnl: 30_000,
    hasTakenPnl: true,
  },
  movers: {
    asOfLabel: "THU 03 SEP 2026",
    top: { name: "Alpha", delta: 10 },
    worst: { name: "Beta", delta: -8 },
    lending: [
      {
        name: "Ether.fi Cash",
        leftoverUsd: -500,
        cashUsd: 9_000,
        borrowedUsd: 9_500,
        protocolHealthFactor: 1.42,
      },
    ],
  },
  cells: [
    {
      id: 1,
      label: "ALP",
      assetClass: "stock",
      value: 150_000,
      pnlDelta: 3000,
      changePct: 2.5,
    },
    {
      id: 2,
      label: "BET",
      assetClass: "digital_asset",
      value: 80_000,
      pnlDelta: -4000,
      changePct: -4.8,
    },
  ],
};

describe("<HistoryClient>", () => {
  it("explains the empty archive", async () => {
    const screen = await render(
      <HistoryClient dates={[]} selectedDate={null} snapshot={null} />,
    );
    await expect
      .element(screen.getByText("No daily reports yet", { exact: false }))
      .toBeInTheDocument();
  });

  it("renders the three cron cards and lists every holding", async () => {
    const screen = await render(
      <HistoryClient
        dates={["2026-09-03"]}
        selectedDate="2026-09-03"
        snapshot={snapshot}
      />,
    );
    expect(screen.container.querySelector('svg[role="img"]')).toBeTruthy();
    expect(screen.container.textContent).toContain("ALP");
    expect(screen.container.textContent).toContain("BET");
    expect(screen.container.textContent).toContain("Alpha");
    expect(screen.container.textContent).toContain("Ether.fi Cash");
    await expect.element(screen.getByText("2 holdings")).toBeInTheDocument();
    await expect.element(screen.getByText("Net worth")).toBeInTheDocument();
  });
});
