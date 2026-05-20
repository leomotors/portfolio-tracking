import type { LanguageModelUsage } from "ai";

import {
  type AiModelConfig,
  getModelConfig,
  TOOL_PRICING_MICRO_USD,
} from "./models";

export interface UsageLike {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
  inputTokenDetails?: {
    cacheReadTokens?: number | null;
  } | null;
}

export function tokenCounts(usage: UsageLike | null | undefined) {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens:
      usage?.cachedInputTokens ??
      usage?.inputTokenDetails?.cacheReadTokens ??
      0,
  };
}

export function estimateModelCostMicroUsd(
  model: string,
  usage: UsageLike | null | undefined,
) {
  const config = getModelConfig(model);
  if (!config) return 0;
  return estimateModelCostForConfigMicroUsd(config, usage);
}

export function estimateModelCostForConfigMicroUsd(
  config: AiModelConfig,
  usage: UsageLike | null | undefined,
) {
  const { inputTokens, outputTokens, cachedInputTokens } = tokenCounts(usage);
  const billableInput = Math.max(0, inputTokens - cachedInputTokens);
  const cachedRate =
    config.cachedInputUsdPerMillion ?? config.inputUsdPerMillion;
  const usd =
    (billableInput * config.inputUsdPerMillion) / 1_000_000 +
    (cachedInputTokens * cachedRate) / 1_000_000 +
    (outputTokens * config.outputUsdPerMillion) / 1_000_000;
  return Math.round(usd * 1_000_000);
}

export function estimateToolCostMicroUsd(toolName: string) {
  switch (toolName) {
    case "searchWeb":
      return TOOL_PRICING_MICRO_USD.openaiWebSearch;
    case "searchGrokWeb":
      return TOOL_PRICING_MICRO_USD.xaiWebSearch;
    case "searchX":
      return TOOL_PRICING_MICRO_USD.xaiXSearch;
    default:
      return 0;
  }
}

export function usageToRecord(usage: LanguageModelUsage | undefined) {
  const { inputTokens, outputTokens } = tokenCounts(usage);
  return {
    inputTokens,
    outputTokens,
    rawUsage: usage ? JSON.parse(JSON.stringify(usage)) : null,
  };
}

export function formatMicroUsd(value: number) {
  return (value / 1_000_000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value === 0 ? 2 : 4,
    maximumFractionDigits: value < 100_000 ? 6 : 4,
  });
}
