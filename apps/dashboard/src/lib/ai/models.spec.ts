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
    expect(normalizeModelSelection("anthropic", "gpt-6-luna")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5",
    });
  });

  it("looks up pricing config by model id", () => {
    expect(getModelConfig("grok-4.5")?.provider).toBe("xai");
  });

  it("excludes retired models from selectable options", () => {
    expect(availableModelOptions().every((m) => !isRetiredModel(m.id))).toBe(
      true,
    );
    expect(isRetiredModel("gpt-5.4")).toBe(true);
    expect(isRetiredModel("claude-sonnet-4-6")).toBe(true);
    expect(isRetiredModel("claude-fable-5")).toBe(true);
    expect(isRetiredModel("claude-opus-4-8")).toBe(true);
    expect(isRetiredModel("grok-4.5")).toBe(true);
    expect(isRetiredModel("claude-fable-5-1")).toBe(false);
    expect(isRetiredModel("gpt-5.6-luna")).toBe(true);
    expect(isRetiredModel("gpt-5.6-sol")).toBe(true);
    expect(isRetiredModel("gpt-5.6-terra")).toBe(true);
    expect(isRetiredModel("claude-opus-5")).toBe(true);
    expect(isRetiredModel("gpt-6-luna")).toBe(false);
    expect(isRetiredModel("claude-opus-5-5")).toBe(false);
    expect(availableModelOptions().some((m) => m.id === "gpt-6-luna")).toBe(
      true,
    );
    expect(availableModelOptions().some((m) => m.id === "gpt-6-sol")).toBe(
      true,
    );
    expect(availableModelOptions().some((m) => m.id === "gpt-6-astra")).toBe(
      true,
    );
    expect(
      availableModelOptions().some((m) => m.id === "claude-opus-5-5"),
    ).toBe(true);
    expect(availableModelOptions().some((m) => m.id === "grok-4.6")).toBe(true);
  });

  it("rejects retired models for new selections", () => {
    expect(normalizeModelSelection("openai", "gpt-5.6-luna")).toEqual({
      provider: "openai",
      model: "gpt-6-luna",
    });
    expect(normalizeModelSelection("anthropic", "claude-opus-5")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5",
    });
    expect(normalizeModelSelection("anthropic", "claude-opus-4-8")).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5",
    });
    expect(normalizeModelSelection("xai", "grok-4.5")).toEqual({
      provider: "xai",
      model: "grok-4.3",
    });
  });

  it("keeps retired models when continuing an existing conversation", () => {
    expect(
      normalizeModelSelection("openai", "gpt-5.6-sol", { allowRetired: true }),
    ).toEqual({
      provider: "openai",
      model: "gpt-5.6-sol",
    });
    expect(
      normalizeModelSelection("anthropic", "claude-opus-5", {
        allowRetired: true,
      }),
    ).toEqual({
      provider: "anthropic",
      model: "claude-opus-5",
    });
    expect(
      normalizeModelSelection("anthropic", "claude-opus-4-8", {
        allowRetired: true,
      }),
    ).toEqual({
      provider: "anthropic",
      model: "claude-opus-4-8",
    });
    expect(
      normalizeModelSelection("xai", "grok-4.5", { allowRetired: true }),
    ).toEqual({
      provider: "xai",
      model: "grok-4.5",
    });
  });
});
