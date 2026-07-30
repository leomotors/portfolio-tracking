import { describe, expect, it } from "vitest";

import { type AssetSnapshot } from "./dayPerformers";
import {
  buildHeatmapCells,
  changeToColor,
  colorScaleMax,
  heatmapLabel,
  layoutHeatmap,
  renderHeatmapSvg,
} from "./heatmap";

function asset(
  partial: Partial<AssetSnapshot> &
    Pick<AssetSnapshot, "id" | "name" | "cost" | "value">,
): AssetSnapshot {
  return {
    symbol: partial.symbol ?? null,
    assetClass: partial.assetClass ?? "stock",
    ...partial,
  };
}

describe("heatmapLabel", () => {
  it("prefers symbol when present", () => {
    expect(heatmapLabel({ symbol: "AAPL", name: "Apple Inc." })).toBe("AAPL");
  });

  it("falls back to a truncated name", () => {
    expect(
      heatmapLabel({
        symbol: null,
        name: "Very Long Mutual Fund Name XYZ",
      }),
    ).toBe("Very Long Mutual…");
  });
});

describe("buildHeatmapCells", () => {
  const current = [
    asset({
      id: 1,
      name: "Alpha",
      symbol: "ALP",
      assetClass: "stock",
      cost: 100,
      value: 150,
    }),
    asset({
      id: 2,
      name: "Beta",
      symbol: "BET",
      assetClass: "digital_asset",
      cost: 200,
      value: 180,
    }),
    asset({
      id: 3,
      name: "Zero",
      symbol: "ZRO",
      assetClass: "bond",
      cost: 10,
      value: 0,
    }),
  ];

  const previousById = new Map([
    [1, { cost: 100, value: 120 }],
    [2, { cost: 200, value: 210 }],
    [3, { cost: 10, value: 10 }],
  ]);

  it("skips assets with no previous snapshot or non-positive value", () => {
    const cells = buildHeatmapCells(current, previousById);
    expect(cells.map((c) => c.id)).toEqual([2, 1]);
  });

  it("sizes by current value and colors by day P/L % of previous value", () => {
    const cells = buildHeatmapCells(current, previousById);
    expect(cells).toEqual([
      {
        id: 2,
        label: "BET",
        assetClass: "digital_asset",
        value: 180,
        pnlDelta: -30,
        changePct: (-30 / 210) * 100,
      },
      {
        id: 1,
        label: "ALP",
        assetClass: "stock",
        value: 150,
        pnlDelta: 30,
        changePct: (30 / 120) * 100,
      },
    ]);
  });

  it("returns an empty list when nothing overlaps", () => {
    expect(buildHeatmapCells(current, new Map())).toEqual([]);
  });
});

describe("changeToColor", () => {
  it("uses neutral gray near zero", () => {
    expect(changeToColor(0, 3)).toBe("#3d4450");
    expect(changeToColor(0.01, 3)).toBe("#3d4450");
  });

  it("moves toward green for gains and red for losses", () => {
    const gain = changeToColor(3, 3);
    const loss = changeToColor(-3, 3);
    expect(gain).toMatch(/^#[0-9a-f]{6}$/);
    expect(loss).toMatch(/^#[0-9a-f]{6}$/);
    expect(gain).not.toBe(loss);
    // Full-scale gain lands on the bright green stop.
    expect(gain).toBe("#2dc653");
    expect(loss).toBe("#e63946");
  });
});

describe("colorScaleMax", () => {
  it("floors at 0.5 so tiny moves still get a usable scale", () => {
    expect(
      colorScaleMax([
        {
          id: 1,
          label: "A",
          assetClass: "stock",
          value: 1,
          pnlDelta: 0,
          changePct: 0.1,
        },
      ]),
    ).toBe(0.5);
  });

  it("uses the largest absolute change when above the floor", () => {
    expect(
      colorScaleMax([
        {
          id: 1,
          label: "A",
          assetClass: "stock",
          value: 1,
          pnlDelta: 1,
          changePct: 2.5,
        },
        {
          id: 2,
          label: "B",
          assetClass: "stock",
          value: 1,
          pnlDelta: -1,
          changePct: -4,
        },
      ]),
    ).toBe(4);
  });
});

describe("layoutHeatmap / renderHeatmapSvg", () => {
  const cells = buildHeatmapCells(
    [
      asset({
        id: 1,
        name: "Alpha",
        symbol: "ALP",
        assetClass: "stock",
        cost: 100,
        value: 150,
      }),
      asset({
        id: 2,
        name: "Beta",
        symbol: "BET",
        assetClass: "digital_asset",
        cost: 200,
        value: 180,
      }),
      asset({
        id: 3,
        name: "Gamma",
        symbol: "GAM",
        assetClass: "stock",
        cost: 50,
        value: 55,
      }),
    ],
    new Map([
      [1, { cost: 100, value: 120 }],
      [2, { cost: 200, value: 210 }],
      [3, { cost: 50, value: 60 }],
    ]),
  );

  it("lays out class groups and leaf assets", () => {
    const rects = layoutHeatmap(cells, { width: 800, height: 500 });
    const groups = rects.filter((r) => r.depth === 1).map((r) => r.label);
    const leaves = rects.filter((r) => r.depth === 2);

    expect(groups).toEqual(["Stock", "Digital"]);
    expect(leaves.map((r) => r.label).sort()).toEqual(["ALP", "BET", "GAM"]);
    expect(leaves.every((r) => r.x1 > r.x0 && r.y1 > r.y0)).toBe(true);

    const areas = Object.fromEntries(
      leaves.map((r) => [r.label, (r.x1 - r.x0) * (r.y1 - r.y0)]),
    );
    // BET (180) should be larger than ALP (150) which should be larger than GAM (55).
    expect(areas["BET"]!).toBeGreaterThan(areas["ALP"]!);
    expect(areas["ALP"]!).toBeGreaterThan(areas["GAM"]!);
  });

  it("renders an SVG document with title and asset labels", () => {
    const svg = renderHeatmapSvg(cells, {
      width: 800,
      height: 500,
      title: "Test Heatmap",
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("Test Heatmap");
    expect(svg).toContain("ALP");
    expect(svg).toContain("BET");
    expect(svg).toContain("+25.00%");
    expect(svg).toContain("−14.29%");
    expect(renderHeatmapSvg([])).toBeNull();
  });

  it("escapes XML special characters in labels", () => {
    const svg = renderHeatmapSvg(
      [
        {
          id: 1,
          label: `A&B <C>"D"`,
          assetClass: "stock",
          value: 100,
          pnlDelta: 1,
          changePct: 1,
        },
      ],
      { width: 400, height: 300 },
    );

    expect(svg).toContain("A&amp;B &lt;C&gt;&quot;D&quot;");
    expect(svg).not.toContain(`A&B <C>"D"`);
  });
});
