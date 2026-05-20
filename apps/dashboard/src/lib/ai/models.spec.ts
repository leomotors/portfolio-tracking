import { describe, expect, it } from "vitest";

import {
  AI_MODELS,
  getModelConfig,
  isAiProvider,
  normalizeModelSelection,
} from "./models";

describe("AI model registry", () => {
  it("contains models for all planned providers", () => {
    expect(new Set(AI_MODELS.map((m) => m.provider))).toEqual(
      new Set(["openai", "anthropic", "xai"]),
    );
  });

  it("validates providers", () => {
    expect(isAiProvider("openai")).toBe(true);
    expect(isAiProvider("anthropic")).toBe(true);
    expect(isAiProvider("xai")).toBe(true);
    expect(isAiProvider("sql")).toBe(false);
  });

  it("normalizes invalid model selections to provider defaults", () => {
    expect(normalizeModelSelection("anthropic", "gpt-5.4")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("looks up pricing config by model id", () => {
    expect(getModelConfig("grok-4.3")?.provider).toBe("xai");
  });
});
