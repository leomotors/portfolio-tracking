import { expect, test } from "vitest";

import { normalizeCoingeckoId, normalizeSymbol } from "./coingecko-map";

test("normalizeSymbol trims and keeps case", () => {
  expect(normalizeSymbol("  BTC  ")).toBe("BTC");
});

test("normalizeSymbol rejects empty and overly long values", () => {
  expect(() => normalizeSymbol("   ")).toThrow(/required/);
  expect(() => normalizeSymbol("x".repeat(65))).toThrow(/too long/);
});

test("normalizeCoingeckoId lowercases slugs", () => {
  expect(normalizeCoingeckoId(" Bitcoin ")).toBe("bitcoin");
  expect(normalizeCoingeckoId(" Wrapped-Bitcoin ")).toBe("wrapped-bitcoin");
});

test("normalizeCoingeckoId rejects empty and non-slug values", () => {
  expect(() => normalizeCoingeckoId("  ")).toThrow(/required/);
  expect(() => normalizeCoingeckoId("NOT A SLUG")).toThrow(/slug/);
  expect(() => normalizeCoingeckoId("foo_bar")).toThrow(/slug/);
});
