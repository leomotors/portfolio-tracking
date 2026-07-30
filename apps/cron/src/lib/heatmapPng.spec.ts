import { describe, expect, it } from "vitest";

import { type AssetSnapshot } from "./dayPerformers";
import { renderDayHeatmapPng } from "./heatmapPng";

describe("renderDayHeatmapPng", () => {
  it("returns a PNG buffer for overlapping assets", async () => {
    const current: AssetSnapshot[] = [
      {
        id: 1,
        name: "Alpha",
        symbol: "ALP",
        assetClass: "stock",
        cost: 100,
        value: 150,
      },
      {
        id: 2,
        name: "Beta",
        symbol: "BET",
        assetClass: "digital_asset",
        cost: 200,
        value: 180,
      },
    ];
    const previousById = new Map([
      [1, { cost: 100, value: 120 }],
      [2, { cost: 200, value: 210 }],
    ]);

    const png = await renderDayHeatmapPng(current, previousById, {
      width: 640,
      height: 360,
    });

    expect(png).not.toBeNull();
    // PNG signature
    expect(png!.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it("returns null when there is nothing to plot", async () => {
    await expect(renderDayHeatmapPng([], new Map())).resolves.toBeNull();
  });
});
