import fs from "node:fs/promises";

import createClient from "openapi-fetch";

import type { SECV2 } from "@repo/api-client";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { formatDate } from "@/lib/date";

import { ScrapeResult } from "./types";

type NavItem = SECV2.Components["schemas"]["FundNavDailyInfoItem"];

export const secFundClient = createClient<SECV2.Paths>({
  baseUrl: "https://api.sec.or.th/v2",
});

const RANGE_DAYS = 7;

function pickLatestNavForClass(
  items: NavItem[],
  symbol: string,
): NavItem | null {
  const matching = items.filter(
    (row) =>
      row.fund_class_name === symbol &&
      row.last_val != null &&
      row.nav_date != null &&
      row.nav_date !== "",
  );

  if (matching.length === 0) {
    return null;
  }

  matching.sort((a, b) => {
    const navCmp = (b.nav_date ?? "").localeCompare(a.nav_date ?? "");
    if (navCmp !== 0) {
      return navCmp;
    }
    return (b.last_upd_date ?? "").localeCompare(a.last_upd_date ?? "");
  });

  return matching[0] ?? null;
}

async function fetchNavItemsForRange(
  projectId: string,
  symbol: string,
  startNavDate: string,
  endNavDate: string,
  subscriptionKey: string,
): Promise<NavItem[]> {
  const { data, error, response } = await secFundClient.GET(
    "/fund/daily-info/nav",
    {
      params: {
        query: {
          proj_id: projectId,
          start_nav_date: startNavDate,
          end_nav_date: endNavDate,
          fund_class_name: symbol,
        },
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Cache-Control": "no-cache",
      },
    },
  );

  if (response.status !== 200) {
    throw new Error(
      `SEC fund NAV v2: unexpected status ${response.status}, error: ${error}`,
    );
  }

  const next = data?.next_cursor?.trim();
  if (next) {
    logger.warn(
      `SEC fund NAV v2: API returned next_cursor; using first page only (${RANGE_DAYS}-day range fits default page_size).`,
    );
  }

  return data?.items ?? [];
}

export async function getSymbolPrice(
  projectId: string,
  symbol: string,
): Promise<ScrapeResult | null> {
  const subscriptionKey = environment.SEC_OCP_APIM_SUBSCRIPTION_KEY;
  if (!subscriptionKey) {
    logger.error(
      "SEC_OCP_APIM_SUBSCRIPTION_KEY is not set; cannot fetch SEC fund NAV (v2)",
    );
    return null;
  }

  const today = new Date();
  const rangeStart = new Date(today);
  rangeStart.setDate(today.getDate() - RANGE_DAYS);

  const startNavDate = formatDate(rangeStart);
  const endNavDate = formatDate(today);

  try {
    const items = await fetchNavItemsForRange(
      projectId,
      symbol,
      startNavDate,
      endNavDate,
      subscriptionKey,
    );

    const best = pickLatestNavForClass(items, symbol);

    if (best?.last_val != null && best.nav_date) {
      return {
        symbol,
        price: Number(best.last_val),
        date: `${best.nav_date}T00:00:00.000Z`,
      };
    }

    logger.error(
      `⚠️ No NAV row for fund ${symbol} (project ${projectId}) in range ${startNavDate}…${endNavDate}`,
    );
    return null;
  } catch (err) {
    logger.error(
      `⚠️ SEC fund NAV v2 failed for ${symbol} (project ${projectId}): ${err}`,
    );
    return null;
  }
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
