import { expect, test } from "vitest";

import { coingeckoPriceTarget, yahooPriceTarget } from "./priceTarget.js";

test("yahooPriceTarget splits Thai and offshore stocks", () => {
  expect(yahooPriceTarget("PTT.BK")).toEqual({
    symbol: "PTT",
    symbolType: "thai_stock",
  });
  expect(yahooPriceTarget("ABC")).toEqual({
    symbol: "ABC",
    symbolType: "offshore_stock",
  });
});

test("coingeckoPriceTarget keeps a colliding stock symbol on the token", () => {
  expect(coingeckoPriceTarget("ABC")).toEqual({
    symbol: "ABC",
    symbolType: "cryptocurrency",
  });
});

test("coingeckoPriceTarget targets untyped MTS gold rows", () => {
  expect(coingeckoPriceTarget("MTS-GOLD-OZ")).toEqual({
    symbol: "MTS-GOLD-OZ",
    symbolType: null,
  });
});
