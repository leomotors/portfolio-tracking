import { describe, expect, it } from "vitest";

import { circleEmojiSuffix } from "./summaryCircles";

describe("circleEmojiSuffix", () => {
  it("returns empty when percent is null", () => {
    expect(circleEmojiSuffix(100, null)).toBe("");
  });

  it("returns empty when net delta is zero", () => {
    expect(circleEmojiSuffix(0, 0.5)).toBe("");
  });

  it("uses one green circle when |%| < 1 and net delta > 0", () => {
    expect(circleEmojiSuffix(100, 0.5)).toBe(" 🟢");
  });

  it("uses two green circles when 1% <= |%| < 3%", () => {
    expect(circleEmojiSuffix(100, 1)).toBe(" 🟢🟢");
    expect(circleEmojiSuffix(100, 2.99)).toBe(" 🟢🟢");
  });

  it("uses three green circles when |%| >= 3%", () => {
    expect(circleEmojiSuffix(100, 3)).toBe(" 🟢🟢🟢");
    expect(circleEmojiSuffix(100, 10)).toBe(" 🟢🟢🟢");
  });

  it("uses red when net delta < 0 with same tier bands", () => {
    expect(circleEmojiSuffix(-50, -0.5)).toBe(" 🔴");
    expect(circleEmojiSuffix(-50, -2)).toBe(" 🔴🔴");
    expect(circleEmojiSuffix(-50, -5)).toBe(" 🔴🔴🔴");
  });

  it("uses absolute percent for tier (negative percent, positive delta)", () => {
    expect(circleEmojiSuffix(100, -0.5)).toBe(" 🟢");
  });
});
