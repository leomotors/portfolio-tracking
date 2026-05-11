import { describe, expect, it } from "vitest";

import { isStale, nativeAmount, ordinal, pct, thb } from "./format";

describe("thb", () => {
  it("formats positive integers with the baht symbol", () => {
    expect(thb(1234567)).toBe("฿1,234,567");
  });

  it("prefixes a unicode minus for negatives", () => {
    expect(thb(-100)).toBe("−฿100");
  });

  it("emits an explicit sign when sign:true", () => {
    expect(thb(50, { sign: true })).toBe("+฿50");
    expect(thb(-50, { sign: true })).toBe("−฿50");
  });

  it("respects decimals option", () => {
    expect(thb(1.234, { decimals: 2 })).toBe("฿1.23");
  });

  it("guards against non-finite values", () => {
    expect(thb(Number.NaN)).toBe("—");
    expect(thb(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("pct", () => {
  it("formats fractional values as percentages with explicit sign", () => {
    expect(pct(0.0123)).toBe("+1.23%");
    expect(pct(-0.05)).toBe("−5.00%");
  });

  it("respects decimals", () => {
    expect(pct(0.1, 0)).toBe("+10%");
  });

  it("returns dash for non-finite", () => {
    expect(pct(Number.NaN)).toBe("—");
  });
});

describe("nativeAmount", () => {
  it("uses 0 decimals for JPY", () => {
    expect(nativeAmount(280000, "JPY")).toBe("280,000 JPY");
  });

  it("uses 2 decimals by default for non-JPY", () => {
    expect(nativeAmount(4200.5, "USD")).toBe("4,200.50 USD");
  });

  it("respects an explicit decimals override", () => {
    expect(nativeAmount(0.082, "BTC", 4)).toBe("0.0820 BTC");
  });
});

describe("isStale", () => {
  const now = new Date("2026-05-09T12:00:00Z");

  it("treats null/undefined as stale", () => {
    expect(isStale(null, now)).toBe(true);
    expect(isStale(undefined, now)).toBe(true);
  });

  it("returns false within 24 hours", () => {
    const recent = new Date("2026-05-09T00:00:00Z");
    expect(isStale(recent, now)).toBe(false);
  });

  it("returns true past 24 hours", () => {
    const old = new Date("2026-05-07T00:00:00Z");
    expect(isStale(old, now)).toBe(true);
  });

  it("accepts ISO date strings", () => {
    expect(isStale("2026-05-09T08:00:00Z", now)).toBe(false);
    expect(isStale("2026-05-01", now)).toBe(true);
  });
});

describe("ordinal", () => {
  it("handles the standard 1st/2nd/3rd suffixes", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
  });

  it("handles teens correctly (11th/12th/13th)", () => {
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
  });

  it("handles 21st/22nd/23rd", () => {
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
  });
});
