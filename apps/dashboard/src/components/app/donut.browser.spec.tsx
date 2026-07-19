import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Donut } from "./donut";

describe("<Donut>", () => {
  it("renders segments, center text, and legend percentages", async () => {
    const screen = await render(
      <Donut
        data={[
          { label: "Stock", value: 60, color: "green" },
          { label: "Gold", value: 40, color: "gold" },
        ]}
        centerLabel="Portfolio"
        centerValue="฿2,000,000"
      />,
    );

    await expect.element(screen.getByText("Portfolio")).toBeInTheDocument();
    await expect.element(screen.getByText("Stock")).toBeInTheDocument();
    await expect.element(screen.getByText("60.0%")).toBeInTheDocument();
  });

  it("shows an empty label when there is no data", async () => {
    const screen = await render(<Donut data={[]} emptyLabel="No slices" />);
    await expect.element(screen.getByText("No slices")).toBeInTheDocument();
  });

  it("draws segment arcs that tile the ring and close at 12 o'clock", async () => {
    const screen = await render(
      <Donut
        data={[
          { label: "Stock", value: 60, color: "green" },
          { label: "Gold", value: 40, color: "gold" },
        ]}
      />,
    );

    const ds = Array.from(screen.container.querySelectorAll("svg path"), (p) =>
      p.getAttribute("d")!,
    );
    expect(ds).toHaveLength(2);

    // d = "M x0 y0 A r r 0 largeArc 1 x1 y1"
    const nums = (d: string) => d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const [first, second] = ds.map(nums) as [number[], number[]];

    // size 200, thickness 22 → c=100, r=89; 12 o'clock is (100, 11).
    expect(first[0]).toBeCloseTo(100);
    expect(first[1]).toBeCloseTo(11);
    // First segment ends where the second starts…
    expect(second[0]).toBeCloseTo(first[7]!);
    expect(second[1]).toBeCloseTo(first[8]!);
    // …and the last segment ends back at 12 o'clock, no seam overlap.
    expect(second[7]).toBeCloseTo(100);
    expect(second[8]).toBeCloseTo(11);
  });

  it("renders a single 100% segment as a full ring", async () => {
    const screen = await render(
      <Donut data={[{ label: "Cash", value: 123, color: "green" }]} />,
    );

    const d = screen.container.querySelector("svg path")!.getAttribute("d")!;
    expect(d.match(/A/g)).toHaveLength(2);
  });
});
