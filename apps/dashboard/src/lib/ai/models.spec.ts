import { describe, expect, it } from "vitest";

import {
  AI_MODELS,
  availableModelOptions,
  getModelConfig,
  isAiProvider,
  isRetiredModel,
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

  it("excludes retired models from selectable options", () => {
    expect(availableModelOptions().every((m) => !isRetiredModel(m.id))).toBe(
      true,
    );
    expect(isRetiredModel("claude-opus-4-7")).toBe(true);
  });

  it("rejects retired models for new selections", () => {
    expect(normalizeModelSelection("anthropic", "claude-opus-4-7")).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
  });

  it("keeps retired models when continuing an existing conversation", () => {
    expect(
      normalizeModelSelection("anthropic", "claude-opus-4-7", {
        allowRetired: true,
      }),
    ).toEqual({
      provider: "anthropic",
      model: "claude-opus-4-7",
    });
  });
});
