import { expect, test } from "vitest";

import { partitionCoingeckoSymbols } from "./coingecko.js";

test("partitionCoingeckoSymbols keeps mapped symbols and lists misses", () => {
  expect(
    partitionCoingeckoSymbols(["BTC", "FOO", "UNKNOWN"], {
      BTC: "bitcoin",
      FOO: "foo-token",
    }),
  ).toEqual({
    mapped: ["BTC", "FOO"],
    missing: ["UNKNOWN"],
  });
});

test("partitionCoingeckoSymbols is exact on symbol spelling", () => {
  expect(
    partitionCoingeckoSymbols(["FOO", "FOOon"], {
      FOOon: "foo-token",
    }),
  ).toEqual({
    mapped: ["FOOon"],
    missing: ["FOO"],
  });
});
