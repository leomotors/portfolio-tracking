import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AreaChart } from "./area-chart";

const sampleData = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-04-${String(i + 1).padStart(2, "0")}`,
  value: 100 + Math.sin(i / 3) * 10,
}));

describe("<AreaChart>", () => {
  it("renders an SVG path for the data", async () => {
    const screen = await render(<AreaChart data={sampleData} height={200} />);
    const svg = screen.container.querySelector("svg");
    expect(svg).toBeTruthy();
    const linePath = svg?.querySelectorAll("path");
    // Two paths: filled area + line stroke
    expect(linePath?.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the empty label when there is no data", async () => {
    const screen = await render(
      <AreaChart data={[]} emptyLabel="Nothing to show" height={200} />,
    );
    await expect
      .element(screen.getByText("Nothing to show"))
      .toBeInTheDocument();
  });

  it("reveals a tooltip on hover", async () => {
    const screen = await render(
      <AreaChart
        data={sampleData}
        height={200}
        formatY={(v) => `฿${v.toFixed(0)}`}
      />,
    );
    const svg = screen.container.querySelector("svg")!;
    const rect = svg.getBoundingClientRect();
    svg.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
    await expect
      .element(page.getByTestId("area-chart-tooltip"))
      .toBeInTheDocument();
  });
});
