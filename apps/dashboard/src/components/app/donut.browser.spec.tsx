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
});
