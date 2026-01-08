import fs from "node:fs/promises";

import createClient from "openapi-fetch";

import type { SECFund } from "@repo/api-client";

import { logger } from "@/core/logger";
import { formatDate, getYesterday } from "@/lib/date";

import { ScrapeResult } from "./types";

export const secFundClient = createClient<SECFund.Paths>({
  baseUrl: "https://api.sec.or.th/FundDailyInfo",
});

export async function getSECFundDailyNav(projectId: string, navDate: string) {
  const { data, error, response } = await secFundClient.GET(
    "/{proj_id}/dailynav/{nav_date}",
    {
      params: {
        path: {
          proj_id: projectId,
          nav_date: navDate,
        },
      },
    },
  );

  if (response.status === 200) {
    // their openapi doc is so ass
    return data as SECFund.Components["schemas"]["FundDailyNav"][];
  } else if (response.status === 204) {
    return null;
  } else {
    throw new Error(
      `Unexpected response status: ${response.status}, error: ${error}`,
    );
  }
}

export async function getSymbolPrice(
  projectId: string,
  symbol: string,
): Promise<ScrapeResult | null> {
  const today = new Date();
  let fetchDate = getYesterday(today);

  const attempted = [] as string[];

  const ATTEMPTS = 10;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const data = await getSECFundDailyNav(projectId, formatDate(fetchDate));

    if (data) {
      const fund = data.find((f) => f.class_abbr_name === symbol);

      if (fund && fund.last_val) {
        return {
          symbol,
          price: Number(fund.last_val),
          date: fetchDate.toISOString(),
        };
      }
    }

    attempted.push(formatDate(fetchDate));
    fetchDate = getYesterday(fetchDate);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  logger.error(
    `⚠️ Unable to fetch price for fund ${symbol} (Project ID: ${projectId}) after ${ATTEMPTS} attempts on dates: ${attempted.join(", ")}`,
  );
  return null;
}

export async function fetchFundPrices(symbols: string[]) {
  const results: ScrapeResult[] = [];

  const symbolMapping = JSON.parse(
    await fs.readFile("./data/sec-mapping.json", "utf-8"),
  ) as Record<string, string>;

  for (const symbol of symbols) {
    const projectId = symbolMapping[symbol];

    if (!projectId) {
      logger.error(`No project ID mapping found for fund symbol: ${symbol}`);
      continue;
    }

    const result = await getSymbolPrice(projectId, symbol);

    if (result) {
      results.push(result);
    }
  }

  return results;
}
