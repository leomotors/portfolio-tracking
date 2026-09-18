import { describe, expect, it } from "vitest";

import {
  assetClassType,
  assetType,
  riskLevelType,
  symbolType,
} from "@repo/database/schema";

import {
  ASSET_CLASSES,
  ASSET_TYPES,
  parseCreateAssetFields,
  RISK_LEVELS,
  SYMBOL_TYPES,
} from "./asset-fields";

describe("asset field catalog", () => {
  it("matches the database enums", () => {
    expect([...ASSET_CLASSES]).toEqual([...assetClassType.enumValues]);
    expect([...ASSET_TYPES]).toEqual([...assetType.enumValues]);
    expect([...RISK_LEVELS]).toEqual([...riskLevelType.enumValues]);
    expect([...SYMBOL_TYPES]).toEqual([...symbolType.enumValues]);
  });

  it("defaults currentPrice to averageCost and clears empty symbol", () => {
    expect(
      parseCreateAssetFields({
        investmentAccountId: 3,
        name: "Solana",
        symbol: "  ",
        assetType: "digital_asset",
        assetClass: "digital_asset",
        riskLevel: "higher_satellite",
        amount: 2,
        unit: "SOL",
        averageCost: 150,
        currencyId: 7,
      }),
    ).toMatchObject({
      symbol: null,
      symbolType: null,
      currentPrice: 150,
    });
  });

  it("rejects a type that does not match class", () => {
    expect(() =>
      parseCreateAssetFields({
        investmentAccountId: 3,
        name: "Bitcoin",
        symbol: "BTC",
        assetType: "thai_stock",
        assetClass: "digital_asset",
        riskLevel: "higher_satellite",
        amount: 1,
        unit: "BTC",
        averageCost: 1,
        currencyId: 7,
      }),
    ).toThrow(/not valid for class/);
  });

  it("requires a symbol when a price source is set", () => {
    expect(() =>
      parseCreateAssetFields({
        investmentAccountId: 3,
        name: "Bitcoin",
        symbolType: "cryptocurrency",
        assetType: "digital_asset",
        assetClass: "digital_asset",
        riskLevel: "higher_satellite",
        amount: 1,
        unit: "BTC",
        averageCost: 1,
        currencyId: 7,
      }),
    ).toThrow(/symbol is required/);
  });
});
