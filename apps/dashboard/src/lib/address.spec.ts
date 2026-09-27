import { describe, expect, it } from "vitest";

import {
  detectAddressKind,
  parseAccountNo,
  shortenAddress,
  splitHlvSymbol,
} from "./address";

const EVM = "0x1111111111111111111111111111111111111111";
const SOL = "So11111111111111111111111111111111111111112";

describe("detectAddressKind", () => {
  it("detects EVM and Solana addresses", () => {
    expect(detectAddressKind(EVM)).toBe("evm");
    expect(detectAddressKind(SOL)).toBe("solana");
  });

  it("rejects bank/broker numbers and other text", () => {
    expect(detectAddressKind("123456789012345678901234567890123")).toBeNull();
    expect(detectAddressKind("12-3456-7")).toBeNull();
    expect(detectAddressKind("exchange:login")).toBeNull();
    expect(detectAddressKind("0x1234")).toBeNull();
  });
});

describe("shortenAddress", () => {
  it("keeps 6 leading and 4 trailing characters", () => {
    expect(shortenAddress(EVM)).toBe("0x1111…1111");
  });

  it("leaves short values alone", () => {
    expect(shortenAddress("short")).toBe("short");
  });
});

describe("splitHlvSymbol", () => {
  it("splits a vault symbol case-insensitively", () => {
    expect(splitHlvSymbol(`hlv:${EVM}`)).toEqual({
      prefix: "hlv:",
      address: EVM,
    });
  });

  it("returns null for other symbols", () => {
    expect(splitHlvSymbol("BTC")).toBeNull();
    expect(splitHlvSymbol("HLV:not-an-address")).toBeNull();
  });
});

describe("parseAccountNo", () => {
  it("splits lines and optional labels", () => {
    expect(
      parseAccountNo(`Fund: 123\n${EVM}\n\n  Cash Balance: 45-6  `),
    ).toEqual([
      { label: "Fund", value: "123" },
      { label: null, value: EVM },
      { label: "Cash Balance", value: "45-6" },
    ]);
  });

  it("does not split a colon without a following space", () => {
    expect(parseAccountNo("exchange:login")).toEqual([
      { label: null, value: "exchange:login" },
    ]);
  });
});
