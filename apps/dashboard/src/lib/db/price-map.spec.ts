import { expect, test } from "vitest";

import {
  normalizeCoingeckoId,
  normalizeSecProjectId,
  normalizeSymbol,
} from "./price-map";

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

test("normalizeSecProjectId uppercases and trims", () => {
  expect(normalizeSecProjectId(" m0311_2564 ")).toBe("M0311_2564");
  expect(normalizeSecProjectId("M0311_2564")).toBe("M0311_2564");
});

test("normalizeSecProjectId rejects empty and malformed ids", () => {
  expect(() => normalizeSecProjectId("   ")).toThrow(/required/);
  expect(() => normalizeSecProjectId("M0311")).toThrow(/M0311_2564/);
  expect(() => normalizeSecProjectId("0311_2564")).toThrow(/M0311_2564/);
  expect(() => normalizeSecProjectId("M0311_25")).toThrow(/M0311_2564/);
});
