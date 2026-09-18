import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { AddAssetForm } from "./investments-add-asset";

const actions = vi.hoisted(() => ({
  createAsset: vi.fn(async () => {}),
  updateInvestmentAccountCost: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/actions", () => actions);

const currencies = [
  {
    id: 1,
    symbol: "THB",
    variant: null,
    valueInTHB: 1,
    updatedAt: null,
  },
  {
    id: 2,
    symbol: "USD",
    variant: null,
    valueInTHB: 32,
    updatedAt: null,
  },
];

describe("<AddAssetForm>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a position on the current account and adds cost by default", async () => {
    const onDone = vi.fn();
    const screen = await render(
      <AddAssetForm
        accountId={3}
        accountCost={80_000}
        currencies={currencies}
        existingSymbols={["BTC"]}
        onDone={onDone}
      />,
    );

    await screen.getByPlaceholder("Bitcoin").fill("Solana");
    await screen.getByPlaceholder("BTC").fill("SOL");
    await screen.getByLabelText("Class").selectOptions("digital_asset");
    await screen.getByLabelText("Risk").selectOptions("higher_satellite");
    await screen.getByLabelText("Currency").selectOptions("2");
    await screen.getByLabelText("Amount (SOL)").fill("2");
    await screen.getByLabelText("Avg cost (USD)").fill("150");
    await screen.getByRole("button", { name: "Add position" }).click();

    await vi.waitFor(() => {
      expect(actions.createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          investmentAccountId: 3,
          name: "Solana",
          symbol: "SOL",
          assetClass: "digital_asset",
          assetType: "digital_asset",
          symbolType: "cryptocurrency",
          riskLevel: "higher_satellite",
          amount: 2,
          averageCost: 150,
          currentPrice: 150,
          currencyId: 2,
        }),
      );
    });
    expect(actions.updateInvestmentAccountCost).toHaveBeenCalledWith(
      3,
      80_000 + 2 * 150 * 32,
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("warns when the account already has that symbol", async () => {
    const screen = await render(
      <AddAssetForm
        accountId={3}
        accountCost={0}
        currencies={currencies}
        existingSymbols={["SOL"]}
        onDone={() => {}}
      />,
    );

    await screen.getByPlaceholder("BTC").fill("sol");
    await expect
      .element(
        screen.getByText("This account already has sol.", { exact: false }),
      )
      .toBeInTheDocument();
  });
});
