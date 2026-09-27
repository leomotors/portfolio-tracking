import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { AccountNo, AssetSymbol } from "./address";

const EVM = "0x1111111111111111111111111111111111111111";
const SOL = "So11111111111111111111111111111111111111112";

describe("<AccountNo>", () => {
  it("shortens addresses and leaves other lines as-is", async () => {
    const screen = await render(
      <AccountNo value={`${EVM}\n${SOL}\nFund: 123-4`} />,
    );

    await expect.element(screen.getByText("0x1111…1111")).toBeVisible();
    await expect.element(screen.getByText("So1111…1112")).toBeVisible();
    await expect.element(screen.getByText("Fund: 123-4")).toBeVisible();
  });

  it("copies the full address without triggering a parent click", async () => {
    const onSelect = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const screen = await render(
      <button type="button" onClick={onSelect}>
        <AccountNo value={EVM} />
      </button>,
    );

    await userEvent.hover(screen.getByText("0x1111…1111"));
    await expect.element(page.getByText(EVM)).toBeVisible();
    await page.getByRole("button", { name: "Copy address" }).click();

    expect(writeText).toHaveBeenCalledWith(EVM);
    expect(onSelect).not.toHaveBeenCalled();
    await expect
      .element(page.getByRole("button", { name: "Copied" }))
      .toBeVisible();
  });
});

describe("<AssetSymbol>", () => {
  it("shortens the vault address and keeps other symbols", async () => {
    const screen = await render(
      <>
        <AssetSymbol symbol={`HLV:${EVM}`} />
        <AssetSymbol symbol="BTC" />
        <AssetSymbol symbol={null} />
      </>,
    );

    await expect.element(screen.getByText("HLV:0x1111…1111")).toBeVisible();
    await expect.element(screen.getByText("BTC")).toBeVisible();
    await expect.element(screen.getByText("—")).toBeVisible();
  });
});
