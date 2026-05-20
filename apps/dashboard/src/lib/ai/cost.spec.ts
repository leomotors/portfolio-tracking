import { describe, expect, it } from "vitest";

import {
  estimateModelCostMicroUsd,
  estimateToolCostMicroUsd,
  formatMicroUsd,
} from "./cost";

describe("AI cost accounting", () => {
  it("estimates model token cost in micro USD", () => {
    expect(
      estimateModelCostMicroUsd("gpt-5.4", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(17_500_000);
  });

  it("uses cached input rates when cache read tokens are present", () => {
    expect(
      estimateModelCostMicroUsd("gpt-5.4-mini", {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cachedInputTokens: 500_000,
      }),
    ).toBe(412_500);
  });

  it("tracks provider search tool invocation costs", () => {
    expect(estimateToolCostMicroUsd("searchWeb")).toBe(10_000);
    expect(estimateToolCostMicroUsd("searchGrokWeb")).toBe(5_000);
    expect(estimateToolCostMicroUsd("searchX")).toBe(5_000);
  });

  it("formats micro USD for compact display", () => {
    expect(formatMicroUsd(12_345)).toBe("$0.012345");
  });
});
