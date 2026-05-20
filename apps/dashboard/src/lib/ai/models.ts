import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

export type AiProvider = "openai" | "anthropic" | "xai";

export interface AiModelConfig {
  id: string;
  provider: AiProvider;
  label: string;
  inputUsdPerMillion: number;
  cachedInputUsdPerMillion?: number;
  outputUsdPerMillion: number;
}

export const AI_MODELS = [
  {
    id: "gpt-5.4",
    provider: "openai",
    label: "GPT-5.4",
    inputUsdPerMillion: 2.5,
    cachedInputUsdPerMillion: 0.25,
    outputUsdPerMillion: 15,
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    label: "GPT-5.4 mini",
    inputUsdPerMillion: 0.75,
    cachedInputUsdPerMillion: 0.075,
    outputUsdPerMillion: 4.5,
  },
  {
    id: "gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    inputUsdPerMillion: 5,
    cachedInputUsdPerMillion: 0.5,
    outputUsdPerMillion: 30,
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet 4.6",
    inputUsdPerMillion: 3,
    cachedInputUsdPerMillion: 0.3,
    outputUsdPerMillion: 15,
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    inputUsdPerMillion: 1,
    cachedInputUsdPerMillion: 0.1,
    outputUsdPerMillion: 5,
  },
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    label: "Claude Opus 4.7",
    inputUsdPerMillion: 5,
    cachedInputUsdPerMillion: 0.5,
    outputUsdPerMillion: 25,
  },
  {
    id: "grok-4.3",
    provider: "xai",
    label: "Grok 4.3",
    inputUsdPerMillion: 1.25,
    cachedInputUsdPerMillion: 0.2,
    outputUsdPerMillion: 2.5,
  },
] as const satisfies readonly AiModelConfig[];

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export const DEFAULT_AI_PROVIDER: AiProvider = "openai";
export const DEFAULT_AI_MODEL: AiModelId = "gpt-5.4";

export const TOOL_PRICING_MICRO_USD = {
  openaiWebSearch: 10_000,
  xaiWebSearch: 5_000,
  xaiXSearch: 5_000,
} as const;

export function getModelConfig(model: string): AiModelConfig | null {
  return AI_MODELS.find((m) => m.id === model) ?? null;
}

export function isAiProvider(value: string): value is AiProvider {
  return value === "openai" || value === "anthropic" || value === "xai";
}

export function normalizeModelSelection(provider: string, model: string) {
  if (!isAiProvider(provider)) {
    return { provider: DEFAULT_AI_PROVIDER, model: DEFAULT_AI_MODEL };
  }
  const found = getModelConfig(model);
  if (!found || found.provider !== provider) {
    const fallback =
      AI_MODELS.find((m) => m.provider === provider)?.id ?? DEFAULT_AI_MODEL;
    return { provider, model: fallback };
  }
  return { provider, model };
}

export function providerHasApiKey(provider: AiProvider) {
  switch (provider) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "xai":
      return Boolean(process.env.XAI_API_KEY);
  }
}

export function availableModelOptions() {
  return AI_MODELS.map((model) => ({
    ...model,
    available: providerHasApiKey(model.provider),
  }));
}

export function createLanguageModel(provider: AiProvider, model: string) {
  switch (provider) {
    case "openai":
      return openai(model);
    case "anthropic":
      return anthropic(model);
    case "xai":
      return xai(model);
  }
}
