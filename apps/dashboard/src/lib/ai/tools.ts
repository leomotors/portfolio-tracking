import "server-only";

import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { generateText, tool, type ToolSet } from "ai";
import { z } from "zod";

import {
  getAssets,
  getBankAccounts,
  getBankDaily,
  getBankDailyForAccount,
  getCreditCards,
  getCurrencies,
  getInvestmentAccounts,
  getInvestmentDaily,
  getInvestmentDailyForAccount,
  getPersonalLoans,
} from "@/lib/db/queries";
import {
  byAssetClass,
  byCurrency,
  byRiskLevel,
  combineNetWorthSeries,
  dayDelta,
  investmentTotals,
} from "@/lib/portfolio/aggregate";

import {
  estimateModelCostMicroUsd,
  estimateToolCostMicroUsd,
  usageToRecord,
} from "./cost";
import type { ToolCallInsert } from "./store";

interface ToolContext {
  conversationId: number;
  toolLogs: ToolCallInsert[];
}

const round = (value: number) => Math.round(value * 100) / 100;

function compactSources(sources: unknown) {
  if (!Array.isArray(sources)) return [];
  return sources
    .map((source) => {
      if (!source || typeof source !== "object") return null;
      const s = source as {
        url?: unknown;
        title?: unknown;
        sourceType?: unknown;
      };
      return {
        url: typeof s.url === "string" ? s.url : null,
        title: typeof s.title === "string" ? s.title : null,
        sourceType: typeof s.sourceType === "string" ? s.sourceType : null,
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

async function runSearchTool({
  context,
  toolName,
  provider,
  model,
  prompt,
  searchTools,
  toolCostMicroUsd,
}: {
  context: ToolContext;
  toolName: string;
  provider: "openai" | "xai";
  model: string;
  prompt: string;
  searchTools: ToolSet;
  toolCostMicroUsd: number;
}) {
  const result = await generateText({
    model:
      provider === "openai" ? openai.responses(model) : xai.responses(model),
    tools: searchTools,
    prompt,
  });
  const usage = usageToRecord(result.usage);
  const modelCost = estimateModelCostMicroUsd(model, result.usage);
  const costMicroUsd = modelCost + toolCostMicroUsd;
  const output = {
    answer: result.text,
    sources: compactSources(result.sources),
  };
  context.toolLogs.push({
    conversationId: context.conversationId,
    toolName,
    provider,
    model,
    input: { prompt },
    output,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costMicroUsd,
    rawUsage: usage.rawUsage,
  });
  return output;
}

export function createPortfolioTools(context: ToolContext) {
  return {
    getPortfolioOverview: tool({
      description:
        "Get a read-only net worth overview, investment totals, bank totals, and allocation summaries.",
      inputSchema: z.object({}),
      execute: async () => {
        const [
          investments,
          banks,
          assets,
          currencies,
          investmentDaily,
          bankDaily,
        ] = await Promise.all([
          getInvestmentAccounts(),
          getBankAccounts(),
          getAssets(),
          getCurrencies(),
          getInvestmentDaily(),
          getBankDaily(),
        ]);
        const series = combineNetWorthSeries(investmentDaily, bankDaily);
        const delta = dayDelta(series);
        const totals = investmentTotals(investments);
        const bankTotal = banks.reduce(
          (sum, bank) => sum + bank.currentBalance,
          0,
        );
        return {
          asOf: series.at(-1)?.date ?? null,
          netWorth: round(delta.current),
          dayChange: round(delta.delta),
          dayChangePct: delta.deltaPct,
          investments: {
            value: round(totals.total),
            cost: round(totals.cost),
            profitLoss: round(totals.pl),
            profitLossPct: totals.plPct,
          },
          banks: { value: round(bankTotal), accounts: banks.length },
          allocation: {
            byAssetClass: byAssetClass(assets, currencies, banks),
            byRiskLevel: byRiskLevel(assets, currencies, banks),
            byCurrency: byCurrency(assets, currencies, banks),
          },
        };
      },
    }),
    listInvestments: tool({
      description:
        "List investment accounts and asset holdings with amounts, costs, current prices, and THB values.",
      inputSchema: z.object({}),
      execute: async () => {
        const [accounts, assets, currencies] = await Promise.all([
          getInvestmentAccounts(),
          getAssets(),
          getCurrencies(),
        ]);
        const currencyById = new Map(currencies.map((c) => [c.id, c]));
        return {
          accounts,
          assets: assets.map((asset) => {
            const currency = currencyById.get(asset.currencyId);
            const fx = currency?.valueInTHB ?? 1;
            return {
              ...asset,
              currency: currency?.symbol ?? "THB",
              valueTHB: round(asset.amount * asset.currentPrice * fx),
              costTHB: round(asset.amount * asset.averageCost * fx),
            };
          }),
        };
      },
    }),
    getInvestmentHistory: tool({
      description:
        "Get read-only daily cost and value history for one investment account.",
      inputSchema: z.object({
        accountId: z.number().int().positive(),
      }),
      execute: async ({ accountId }) => getInvestmentDailyForAccount(accountId),
    }),
    listBankAccounts: tool({
      description: "List read-only bank and foreign currency deposit accounts.",
      inputSchema: z.object({}),
      execute: async () => getBankAccounts(),
    }),
    getBankHistory: tool({
      description: "Get read-only daily balance history for one bank account.",
      inputSchema: z.object({
        accountId: z.number().int().positive(),
      }),
      execute: async ({ accountId }) => getBankDailyForAccount(accountId),
    }),
    listCreditAndLoans: tool({
      description: "List read-only active credit cards and personal loans.",
      inputSchema: z.object({}),
      execute: async () => {
        const [creditCards, personalLoans] = await Promise.all([
          getCreditCards(),
          getPersonalLoans(),
        ]);
        return { creditCards, personalLoans };
      },
    }),
    searchWeb: tool({
      description:
        "Search the live web for current market, company, economic, or financial context. Returns a cited summary.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
      }),
      execute: async ({ query }) => {
        if (!process.env.OPENAI_API_KEY) {
          return { answer: "OpenAI web search is unavailable.", sources: [] };
        }
        return runSearchTool({
          context,
          toolName: "searchWeb",
          provider: "openai",
          model: "gpt-5.4-mini",
          prompt: query,
          searchTools: {
            web_search: openai.tools.webSearch({ searchContextSize: "medium" }),
          },
          toolCostMicroUsd: estimateToolCostMicroUsd("searchWeb"),
        });
      },
    }),
    searchGrokWeb: tool({
      description:
        "Search the live web using Grok/xAI for an alternate current-context source with citations.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
      }),
      execute: async ({ query }) => {
        if (!process.env.XAI_API_KEY) {
          return { answer: "xAI web search is unavailable.", sources: [] };
        }
        return runSearchTool({
          context,
          toolName: "searchGrokWeb",
          provider: "xai",
          model: "grok-4.3",
          prompt: query,
          searchTools: {
            web_search: xai.tools.webSearch(),
          },
          toolCostMicroUsd: estimateToolCostMicroUsd("searchGrokWeb"),
        });
      },
    }),
    searchX: tool({
      description:
        "Search X/Twitter through xAI for realtime social discussion, sentiment, posts, profiles, or threads.",
      inputSchema: z.object({
        query: z.string().min(2).max(500),
      }),
      execute: async ({ query }) => {
        if (!process.env.XAI_API_KEY) {
          return { answer: "xAI X search is unavailable.", sources: [] };
        }
        return runSearchTool({
          context,
          toolName: "searchX",
          provider: "xai",
          model: "grok-4.3",
          prompt: query,
          searchTools: {
            x_search: xai.tools.xSearch(),
          },
          toolCostMicroUsd: estimateToolCostMicroUsd("searchX"),
        });
      },
    }),
  } satisfies ToolSet;
}
