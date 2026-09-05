import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { HeatmapClient } from "./heatmap-client";

const snapshot = {
  date: "2026-09-03",
  colorScaleMax: 5,
  generatedAt: new Date("2026-09-04T04:00:00Z"),
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

describe("<HeatmapClient>", () => {
  it("explains the empty archive", async () => {
    const screen = await render(
      <HeatmapClient dates={[]} selectedDate={null} snapshot={null} />,
    );
    await expect
      .element(screen.getByText("No heatmap rows yet", { exact: false }))
      .toBeInTheDocument();
  });

  it("renders the treemap and lists every holding", async () => {
    const screen = await render(
      <HeatmapClient
        dates={["2026-09-03"]}
        selectedDate="2026-09-03"
        snapshot={snapshot}
      />,
    );
    expect(screen.container.querySelector("svg")).toBeTruthy();
    expect(screen.container.textContent).toContain("ALP");
    expect(screen.container.textContent).toContain("BET");
    await expect.element(screen.getByText("2 holdings")).toBeInTheDocument();
  });

  it("shows a tooltip with the holding name on hover", async () => {
    const screen = await render(
      <HeatmapClient
        dates={["2026-09-03"]}
        selectedDate="2026-09-03"
        snapshot={snapshot}
      />,
    );
    const leaf = screen.container.querySelector("svg g.cursor-pointer");
    expect(leaf).toBeTruthy();
    leaf!.dispatchEvent(
      new PointerEvent("pointerenter", {
        bubbles: true,
        clientX: 40,
        clientY: 40,
      }),
    );
    await expect
      .element(page.getByTestId("heatmap-tooltip"))
      .toBeInTheDocument();
  });
});
