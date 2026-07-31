import { expect, test } from "vitest";

import { parseHlvSymbol, walletFromAccountNo } from "./hyperliquidVault.js";

/** Synthetic fixtures — not real wallets/vaults. */
const FAKE_VAULT = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const FAKE_WALLET = "0x1111111111111111111111111111111111111111";
const FAKE_SOLANA = "DummySolanaAddress111111111111111111111111";

test("parseHlvSymbol extracts vault address", () => {
  expect(parseHlvSymbol(`HLV:${FAKE_VAULT}`)).toBe(FAKE_VAULT);
  expect(parseHlvSymbol("hlv:0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD")).toBe(
    FAKE_VAULT,
  );
});

test("parseHlvSymbol rejects bad symbols", () => {
  expect(parseHlvSymbol("HYPE")).toBeNull();
  expect(parseHlvSymbol("HLV:not-an-address")).toBeNull();
  expect(parseHlvSymbol(FAKE_VAULT)).toBeNull();
});

test("walletFromAccountNo reads first EVM line", () => {
  expect(walletFromAccountNo(`${FAKE_WALLET}\n${FAKE_SOLANA}`)).toBe(
    FAKE_WALLET,
  );
  expect(walletFromAccountNo(FAKE_SOLANA)).toBe(null);
});
