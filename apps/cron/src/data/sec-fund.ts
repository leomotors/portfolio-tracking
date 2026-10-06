import createClient from "openapi-fetch";

import type { SECV2 } from "@repo/api-client";
import { db } from "@repo/database/client";
import { secFundSymbolTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { formatDate } from "@/lib/date";

import { ScrapeResult } from "./types";

type NavItem = SECV2.Components["schemas"]["FundNavDailyInfoItem"];

export const secFundClient = createClient<SECV2.Paths>({
  baseUrl: "https://api.sec.or.th/v2",
});

const RANGE_DAYS = 7;
const RETRY_DELAY_MS = 5000;

// 204 with a 7-day window means no data only in theory; in practice it's transient
class SecTransientError extends Error {}

function isTransientStatus(status: number) {
  return status === 204 || status === 429 || status >= 500;
}

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
  const query = {
    proj_id: projectId,
    start_nav_date: startNavDate,
    end_nav_date: endNavDate,
    fund_class_name: symbol,
  };
  const path = `/fund/daily-info/nav?${new URLSearchParams(query).toString()}`;

  const { data, error, response } = await secFundClient.GET(
    "/fund/daily-info/nav",
    {
      params: {
        query,
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Cache-Control": "no-cache",
      },
    },
  );

  logger.debug(
    `SEC ${path}\nstatus ${response.status}\n${data != null ? JSON.stringify(data, null, 2) : "null"}`,
  );

  if (isTransientStatus(response.status)) {
    throw new SecTransientError(
      `SEC fund NAV v2: transient status ${response.status}, error: ${error}`,
    );
  }

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

const RETRY = Symbol("retry");

/** Per-run SEC outcomes for the Discord caption line, kept out of the warning flags */
export const secFundIssues = {
  recovered: [] as string[],
  keptNewer: [] as string[],
  failed: [] as string[],
};

export function secFundSummaryLine(): string | null {
  const parts = [
    { symbols: secFundIssues.recovered, label: "recovered on retry" },
    { symbols: secFundIssues.keptNewer, label: "kept newer stored NAV" },
    { symbols: secFundIssues.failed, label: "failed" },
  ]
    .filter((p) => p.symbols.length > 0)
    .map((p) => `${p.symbols.length} ${p.label}`);

  return parts.length > 0 ? `🏦 SEC fund API: ${parts.join(" · ")}` : null;
}

export async function getSymbolPrice(
  projectId: string,
  symbol: string,
  canRetry = false,
): Promise<ScrapeResult | typeof RETRY | null> {
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
    // fetch() itself throws TypeError on network failures
    const transient =
      err instanceof SecTransientError || err instanceof TypeError;
    if (transient && canRetry) {
      logger.debug(`SEC fund NAV v2 will retry ${symbol}: ${err}`);
      return RETRY;
    }
    const message = `⚠️ SEC fund NAV v2 failed for ${symbol} (project ${projectId}): ${err}`;
    // The stored price is kept, so a flaky API is a warning, not an error
    if (transient) {
      logger.warn(message);
    } else {
      logger.error(message);
    }
    return null;
  }
}

export async function loadSecProjectIdMap(): Promise<Record<string, string>> {
  const rows = await db
    .select({
      symbol: secFundSymbolTable.symbol,
      projectId: secFundSymbolTable.projectId,
    })
    .from(secFundSymbolTable);
  return Object.fromEntries(rows.map((r) => [r.symbol, r.projectId]));
}

export async function fetchFundPrices(symbols: string[]) {
  const results: ScrapeResult[] = [];
  const retrySymbols: string[] = [];

  const symbolMapping = await loadSecProjectIdMap();

  for (const symbol of symbols) {
    const projectId = symbolMapping[symbol];

    if (!projectId) {
      logger.error(`No project ID mapping found for fund symbol: ${symbol}`);
      continue;
    }

    const result = await getSymbolPrice(projectId, symbol, true);

    if (result === RETRY) {
      retrySymbols.push(symbol);
    } else if (result) {
      results.push(result);
    }
  }

  // One bounded pass so a flaky SEC response costs at most ~5s, not a backoff chain
  if (retrySymbols.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    for (const symbol of retrySymbols) {
      const result = await getSymbolPrice(symbolMapping[symbol]!, symbol);
      if (result && result !== RETRY) {
        logger.log(`SEC fund NAV v2: ${symbol} succeeded on retry`);
        secFundIssues.recovered.push(symbol);
        results.push(result);
      }
    }
  }

  const fetched = new Set(results.map((r) => r.symbol));
  secFundIssues.failed.push(...symbols.filter((s) => !fetched.has(s)));

  return results;
}
