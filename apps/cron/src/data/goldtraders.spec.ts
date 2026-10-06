import { expect, test } from "vitest";

import {
  estimateThaiGold965,
  parseGoldTradersPage,
  parseGoldTradersTime,
} from "./goldtraders.js";

const page = `
  ประจำวันที่ <span id="DetailPlace_uc_goldprices1_lblAsTime"><b><font size="3">03/10/2569 เวลา 09:02 น. (ครั้งที่ 1)</font></b></span></td>
  <span id="DetailPlace_uc_goldprices1_lblBLSell"><b><font color="Red">65,900.00</font></b></span>
  <span id="DetailPlace_uc_goldprices1_lblBLBuy"><b><font color="Red">65,700.00</font></b></span>
  <span id="DetailPlace_uc_goldprices1_lblOMBuy"><b><font color="Red">64,384.52</font></b></span>
`;

test("parseGoldTradersPage reads the gold bar buy price", () => {
  expect(parseGoldTradersPage(page)).toEqual({
    symbol: "TH-GOLD-965",
    price: 65700,
    date: "2026-10-03T09:02:00+07:00",
  });
});

test("parseGoldTradersPage throws when the label is missing or empty", () => {
  expect(() => parseGoldTradersPage("<html></html>")).toThrow();
  expect(() =>
    parseGoldTradersPage(
      `<span id="DetailPlace_uc_goldprices1_lblBLBuy"><b><font></font></b></span>`,
    ),
  ).toThrow();
});

test("parseGoldTradersTime converts Buddhist Era dates", () => {
  expect(parseGoldTradersTime("31/12/2568")).toBe("2025-12-31T00:00:00+07:00");
  expect(parseGoldTradersTime("garbage")).toBeNull();
});

test("estimateThaiGold965 tracks the association price", () => {
  // 4 Oct 2026 XAUT 4142.18, USDC/THB 33.53 vs the 3 Oct bar buy of 65,700
  expect(estimateThaiGold965(4142.18, 33.53) / 65700).toBeCloseTo(1, 2);
});
