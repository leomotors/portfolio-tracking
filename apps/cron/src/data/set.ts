import { chromium, Page } from "playwright";

import { logger } from "../core/logger";

export async function fetchPath(
  page: Page,
  path: string,
  method = "GET",
  headers?: Record<string, string>,
  body?: RequestInit["body"],
) {
  const response = await page.evaluate(
    async ({ fetchPath, method, headers, body }) => {
      const response = await fetch(fetchPath, {
        method,
        headers,
        body,
      });
      const text = await response.text();

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text,
      };
    },
    { fetchPath: path, method, headers, body },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${path}: ${response.status} ${response.statusText}, content: ${response.text}`,
    );
  }

  return response.text;
}

export async function scrapeSymbol(page: Page, symbol: string) {
  const result = await fetchPath(
    page,
    `https://www.set.or.th/api/set/stock/${symbol}/historical-trading?lang=th`,
  );

  const data = JSON.parse(result) as Array<{
    symbol: string;
    date: string;
    close: number;
  }>;

  const latest = data[0];

  if (!latest) {
    throw new Error(`No data found for symbol ${symbol}`);
  }

  return latest;
}

export async function scrapeSet(symbols: string[]) {
  const browser = await chromium.launch({
    headless: !process.env.DEBUG,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
    ],
    slowMo: 100,
  });

  const page = await browser.newPage();

  await page.goto("https://www.set.or.th/th/home");

  await page.waitForLoadState("domcontentloaded");

  const result = [] as Array<{ symbol: string; date: string; close: number }>;

  for (const symbol of symbols) {
    try {
      result.push(await scrapeSymbol(page, symbol));
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Add a delay between requests
    } catch (error) {
      logger.error(
        `Error scraping symbol ${symbol} (will abort the rest): ${error}`,
      );
      break;
    }
  }

  await browser.close();
  return result;
}
