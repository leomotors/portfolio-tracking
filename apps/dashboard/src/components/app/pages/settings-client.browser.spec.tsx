import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { SettingsClient } from "./settings-client";

const actions = vi.hoisted(() => ({
  createCoingeckoSymbol: vi.fn(async () => {}),
  updateCoingeckoSymbol: vi.fn(async () => {}),
  deleteCoingeckoSymbol: vi.fn(async () => {}),
  createSecFundSymbol: vi.fn(async () => {}),
  updateSecFundSymbol: vi.fn(async () => {}),
  deleteSecFundSymbol: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/actions", () => actions);

const updatedAt = new Date("2026-09-04T04:00:00Z");

const coingeckoMaps = [
  { id: 1, symbol: "BTC", coingeckoId: "bitcoin", updatedAt },
];

const secMaps = [
  { id: 7, symbol: "SCBNDQ(E)", projectId: "M0311_2564", updatedAt },
];

async function renderSettings(overrides?: {
  secMaps?: typeof secMaps;
  secUnmapped?: string[];
}) {
  return await render(
    <SettingsClient
      maps={coingeckoMaps}
      unmapped={[]}
      secMaps={overrides?.secMaps ?? secMaps}
      secUnmapped={overrides?.secUnmapped ?? []}
    />,
  );
}

describe("<SettingsClient>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both price-source maps", async () => {
    const screen = await renderSettings();
    await expect.element(screen.getByText("CoinGecko map")).toBeInTheDocument();
    await expect.element(screen.getByText("SEC fund map")).toBeInTheDocument();
    await expect
      .element(screen.getByLabelText("Edit symbol SCBNDQ(E)"))
      .toBeInTheDocument();
  });

  it("flags held funds with no SEC mapping", async () => {
    const screen = await renderSettings({ secUnmapped: ["TESTFUND-UH-E"] });
    await expect
      .element(screen.getByRole("button", { name: "TESTFUND-UH-E" }))
      .toBeInTheDocument();
  });

  it("prefills the symbol field from an unmapped fund", async () => {
    const screen = await renderSettings({ secUnmapped: ["TESTFUND-UH-E"] });
    await screen.getByRole("button", { name: "TESTFUND-UH-E" }).click();
    await expect
      .element(screen.getByPlaceholder("SCBNDQ(E)"))
      .toHaveValue("TESTFUND-UH-E");
  });

  it("creates a SEC mapping without touching the CoinGecko action", async () => {
    const screen = await renderSettings({ secUnmapped: ["TESTFUND-UH-E"] });
    await screen.getByRole("button", { name: "TESTFUND-UH-E" }).click();
    await screen.getByPlaceholder("M0311_2564").fill("M0001_2560");
    await screen.getByRole("button", { name: "Add mapping" }).nth(1).click();

    await vi.waitFor(() => {
      expect(actions.createSecFundSymbol).toHaveBeenCalledWith(
        "TESTFUND-UH-E",
        "M0001_2560",
      );
    });
    expect(actions.createCoingeckoSymbol).not.toHaveBeenCalled();
  });

  it("surfaces a failed save as an alert", async () => {
    actions.createSecFundSymbol.mockRejectedValueOnce(
      new Error("Symbol SCBNDQ(E) is already mapped"),
    );
    const screen = await renderSettings();
    await screen.getByPlaceholder("SCBNDQ(E)").fill("SCBNDQ(E)");
    await screen.getByPlaceholder("M0311_2564").fill("M0311_2564");
    await screen.getByRole("button", { name: "Add mapping" }).nth(1).click();

    await expect
      .element(screen.getByText("Symbol SCBNDQ(E) is already mapped"))
      .toBeInTheDocument();
  });

  it("edits a SEC project id in place", async () => {
    const screen = await renderSettings();
    await screen.getByLabelText("Edit SEC project id for SCBNDQ(E)").click();
    await screen.getByRole("button", { name: "save" }).click();
    // Unchanged draft commits nothing.
    expect(actions.updateSecFundSymbol).not.toHaveBeenCalled();
  });

  it("deletes only the targeted SEC mapping", async () => {
    const screen = await renderSettings();
    await screen
      .getByRole("button", { name: "Delete mapping for SCBNDQ(E)" })
      .click();
    await vi.waitFor(() => {
      expect(actions.deleteSecFundSymbol).toHaveBeenCalledWith(7);
    });
    expect(actions.deleteCoingeckoSymbol).not.toHaveBeenCalled();
  });
});
