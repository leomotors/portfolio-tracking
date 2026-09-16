import { describe, expect, it } from "vitest";

import {
  etherfiCashMonitorConfigSchema,
  etherfiLiquidConfigSchema,
} from "./etherfiCash";

describe("etherfiLiquidConfigSchema", () => {
  const base = {
    chain: "optimism" as const,
    wallet: "0x1111111111111111111111111111111111111111",
    vault: "0x5f46d540b6eD704C3c8789105F30E075AA900726",
    accountant: "0xEa23aC6D7D11f6b181d6B98174D334478ADAe6b0",
    rateDecimals: 8,
    vaultSymbol: "liquidBTC",
  };

  it("still accepts the existing wallet-only config", () => {
    expect(etherfiLiquidConfigSchema.parse(base).shareSource).toBeUndefined();
  });

  it("requires lendGateway when shareSource is aave_v4", () => {
    expect(() =>
      etherfiLiquidConfigSchema.parse({ ...base, shareSource: "aave_v4" }),
    ).toThrow(/lendGateway/);
  });

  it("accepts aave_v4 with an explicit lendGateway", () => {
    const parsed = etherfiLiquidConfigSchema.parse({
      ...base,
      shareSource: "aave_v4",
      lendGateway: "0x2222222222222222222222222222222222222222",
    });
    expect(parsed.lendGateway).toBe(
      "0x2222222222222222222222222222222222222222",
    );
  });

  it("rejects unknown keys", () => {
    expect(() =>
      etherfiLiquidConfigSchema.parse({ ...base, rpcUrl: "https://evil" }),
    ).toThrow();
  });
});

describe("etherfiCashMonitorConfigSchema", () => {
  const base = {
    chain: "optimism" as const,
    lendGateway: "0x2222222222222222222222222222222222222222",
    priceProvider: "0x3333333333333333333333333333333333333333",
    cashSymbols: ["liquidUSD", "liquidRWA"],
  };

  it("accepts a complete monitor config", () => {
    expect(etherfiCashMonitorConfigSchema.parse(base).cashSymbols).toEqual([
      "liquidUSD",
      "liquidRWA",
    ]);
  });

  it("rejects a wallet in sync_config (wallet is a table column)", () => {
    expect(() =>
      etherfiCashMonitorConfigSchema.parse({
        ...base,
        wallet: "0x1111111111111111111111111111111111111111",
      }),
    ).toThrow();
  });

  it("rejects an empty cashSymbols list", () => {
    expect(() =>
      etherfiCashMonitorConfigSchema.parse({ ...base, cashSymbols: [] }),
    ).toThrow();
  });
});
