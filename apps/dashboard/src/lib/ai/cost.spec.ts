import { describe, expect, it } from "vitest";

import {
  estimateModelCostMicroUsd,
  estimateToolCostMicroUsd,
  formatMicroUsd,
} from "./cost";

describe("AI cost accounting", () => {
  it("estimates model token cost in micro USD", () => {
    expect(
      estimateModelCostMicroUsd("gpt-6-luna", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(600_000);
  });

  it("uses current standard list prices for Sol, Opus 5.5, Sonnet 5, and Fable 5.1 cache", () => {
    expect(
      estimateModelCostMicroUsd("gpt-6-sol", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(12_000_000);
    expect(
      estimateModelCostMicroUsd("claude-opus-5-5", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(24_000_000);
    expect(
      estimateModelCostMicroUsd("claude-sonnet-5", {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBe(12_000_000);
    expect(
      estimateModelCostMicroUsd("claude-fable-5-1", {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cachedInputTokens: 1_000_000,
      }),
    ).toBe(250_000);
  });

  it("uses cached input rates when cache read tokens are present", () => {
    expect(
      estimateModelCostMicroUsd("gpt-6-luna", {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cachedInputTokens: 500_000,
      }),
    ).toBe(55_000);
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
