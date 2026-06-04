import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { TimeframeToggle } from "./timeframe-toggle";

describe("<TimeframeToggle>", () => {
  it("marks the active option with aria-pressed", async () => {
    const screen = await render(
      <TimeframeToggle value="3M" onChange={() => {}} />,
    );
    await expect
      .element(screen.getByRole("button", { name: "3M" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(screen.getByRole("button", { name: "1M" }))
      .toHaveAttribute("aria-pressed", "false");
    await expect
      .element(screen.getByRole("button", { name: "ALL" }))
      .toBeInTheDocument();
  });

  it("calls onChange with the clicked timeframe", async () => {
    const onChange = vi.fn();
    const screen = await render(
      <TimeframeToggle value="1M" onChange={onChange} />,
    );
    await screen.getByRole("button", { name: "1Y" }).click();
    expect(onChange).toHaveBeenCalledWith("1Y");
  });
});
