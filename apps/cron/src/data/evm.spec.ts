import { expect, test } from "vitest";

import {
  decodeAddressArray,
  decodeString,
  decodeUint,
  decodeUintWords,
  encodeAddressParam,
  toUnits,
} from "./evm.js";

test("encodeAddressParam left-pads to 32 bytes", () => {
  expect(encodeAddressParam("0x5f46d540b6eD704C3c8789105F30E075AA900726")).toBe(
    "0000000000000000000000005f46d540b6ed704c3c8789105f30e075aa900726",
  );
});

test("encodeAddressParam rejects malformed addresses", () => {
  expect(() => encodeAddressParam("0x1234")).toThrow(/Invalid EVM address/);
  expect(() => encodeAddressParam("not-an-address")).toThrow(
    /Invalid EVM address/,
  );
});

test("decodeUint parses the live liquidBTC getRate() result", () => {
  // Observed on-chain 2026-07-17: 1 liquidBTC = 1.03164575 WBTC.
  const raw = decodeUint(
    "0x0000000000000000000000000000000000000000000000000000000006262a9f",
  );
  expect(raw).toBe(103164575n);
  expect(toUnits(raw, 8)).toBeCloseTo(1.03164575, 10);
});

test("decodeUint rejects empty results", () => {
  expect(() => decodeUint("0x")).toThrow();
  expect(() => decodeUint("nope")).toThrow();
});

test("decodeString parses the live liquidBTC symbol() result", () => {
  const hex =
    "0x" +
    "0000000000000000000000000000000000000000000000000000000000000020" +
    "0000000000000000000000000000000000000000000000000000000000000009" +
    "6c69717569644254430000000000000000000000000000000000000000000000";
  expect(decodeString(hex)).toBe("liquidBTC");
});

test("toUnits handles 18-decimal share balances", () => {
  expect(toUnits(2_048_100_000_000_000_000n, 18)).toBeCloseTo(2.0481, 9);
});

test("decodeUintWords splits packed getAccountData words", () => {
  const hex =
    "0x" +
    "000000000000000000000000000000000000000000000000000000063b6a593c" +
    "00000000000000000000000000000000000000000000000000000003664e5511";
  const words = decodeUintWords(hex);
  expect(words).toHaveLength(2);
  expect(toUnits(words[0]!, 6)).toBeCloseTo(26766.62918, 5);
  expect(toUnits(words[1]!, 6)).toBeCloseTo(14601.311505, 6);
});

test("decodeAddressArray reads offset/length/padded addresses", () => {
  const hex =
    "0x" +
    "0000000000000000000000000000000000000000000000000000000000000020" +
    "0000000000000000000000000000000000000000000000000000000000000002" +
    "0000000000000000000000005f46d540b6ed704c3c8789105f30e075aa900726" +
    "00000000000000000000000008c6f91e2b681faf5e17227f2a44c307b3c1364c";
  expect(decodeAddressArray(hex)).toEqual([
    "0x5f46d540b6ed704c3c8789105f30e075aa900726",
    "0x08c6f91e2b681faf5e17227f2a44c307b3c1364c",
  ]);
});
