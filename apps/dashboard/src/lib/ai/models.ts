import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

/**
 * Model registry architecture
 *
 * - AI_MODELS: selectable in the chat UI and when creating or changing a conversation.
 * - RETIRED_AI_MODELS: not selectable; kept so existing conversations continue using the
 *   same API model id and pricing for the life of the thread.
 *
 * When replacing a model in AI_MODELS, move the old id to RETIRED_AI_MODELS instead of
 * aliasing it to the replacement. Use normalizeModelSelection(..., { allowRetired: true })
 * only when honoring a stored conversation default (e.g. chat API on an existing thread).
 */
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
    id: "claude-opus-4-8",
    provider: "anthropic",
    label: "Claude Opus 4.8",
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

/** Removed from the picker; still valid for conversations that already use the id. */
export const RETIRED_AI_MODELS = [
  {
    id: "claude-opus-4-7",
    provider: "anthropic",
    label: "Claude Opus 4.7",
    inputUsdPerMillion: 5,
    cachedInputUsdPerMillion: 0.5,
    outputUsdPerMillion: 25,
  },
] as const satisfies readonly AiModelConfig[];

const ALL_KNOWN_MODELS = [...AI_MODELS, ...RETIRED_AI_MODELS] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export const DEFAULT_AI_PROVIDER: AiProvider = "openai";
export const DEFAULT_AI_MODEL: AiModelId = "gpt-5.4";

export const TOOL_PRICING_MICRO_USD = {
  openaiWebSearch: 10_000,
  xaiWebSearch: 5_000,
  xaiXSearch: 5_000,
} as const;

export function isSelectableModel(model: string) {
  return AI_MODELS.some((m) => m.id === model);
}

export function isRetiredModel(model: string) {
  return RETIRED_AI_MODELS.some((m) => m.id === model);
}

export function getModelConfig(model: string): AiModelConfig | null {
  return ALL_KNOWN_MODELS.find((m) => m.id === model) ?? null;
}

export function isAiProvider(value: string): value is AiProvider {
  return value === "openai" || value === "anthropic" || value === "xai";
}

export function normalizeModelSelection(
  provider: string,
  model: string,
  options?: { allowRetired?: boolean },
) {
  if (!isAiProvider(provider)) {
    return { provider: DEFAULT_AI_PROVIDER, model: DEFAULT_AI_MODEL };
  }
  const found = getModelConfig(model);
  if (
    found &&
    found.provider === provider &&
    (!isRetiredModel(model) || options?.allowRetired)
  ) {
    return { provider, model };
  }
  const fallback =
    AI_MODELS.find((m) => m.provider === provider)?.id ?? DEFAULT_AI_MODEL;
  return { provider, model: fallback };
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
