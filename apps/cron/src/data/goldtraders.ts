import { logger } from "@/core/logger";

import { fetchBitkubUsdcThb } from "./bitkub";
import { fetchTetherGoldUsd } from "./coingecko";
import { ScrapeResult } from "./types";

/** Thai 96.5% gold bar, priced in THB per baht-weight (15.244 g). */
export const THAI_GOLD_965_SYMBOL = "TH-GOLD-965";

const GOLD_TRADERS_URL = "https://classic.goldtraders.or.th/default.aspx";
const LABEL_PREFIX = "DetailPlace_uc_goldprices1_lbl";

/** Troy oz of pure gold in one baht-weight of 96.5% gold: 15.244 × 0.965 / 31.1034768 */
const PURE_OZ_PER_BAHT_965 = (15.244 * 0.965) / 31.1034768;

/** Max gap between the scraped price and the spot estimate before the scrape is distrusted. */
const MAX_DIVERGENCE = 0.03;

function readLabel(html: string, name: string): string | null {
  const match = new RegExp(
    `id="${LABEL_PREFIX}${name}"[^>]*>(?:\\s*<[^>]+>)*\\s*([^<]+)`,
  ).exec(html);
  return match?.[1]?.trim() || null;
}

/** "03/10/2569 เวลา 09:02 น. (ครั้งที่ 1)" (Buddhist Era, Bangkok time) to ISO. */
export function parseGoldTradersTime(text: string): string | null {
  const match = /(\d{2})\/(\d{2})\/(\d{4})(?:\D+(\d{2}):(\d{2}))?/.exec(text);
  if (!match) return null;
  const [, dd, mm, be, hh = "00", mi = "00"] = match;
  return `${Number(be) - 543}-${mm}-${dd}T${hh}:${mi}:00+07:00`;
}

/** Association buy price for 96.5% gold bars (`lblBLBuy`). */
export function parseGoldTradersPage(html: string): ScrapeResult {
  const buy = readLabel(html, "BLBuy");
  const price = Number(buy?.replaceAll(",", ""));
  if (!buy || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Unparsable gold bar buy price: ${buy}`);
  }
  const time = readLabel(html, "AsTime");
  return {
    symbol: THAI_GOLD_965_SYMBOL,
    price,
    date: time ? parseGoldTradersTime(time) : null,
  };
}

export function estimateThaiGold965(xautUsd: number, usdThb: number): number {
  return xautUsd * usdThb * PURE_OZ_PER_BAHT_965;
}

async function scrapeGoldTraders(): Promise<ScrapeResult> {
  const res = await fetch(GOLD_TRADERS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch goldtraders.or.th: ${res.statusText}`);
  }
  return parseGoldTradersPage(await res.text());
}

async function fetchSpotEstimate(): Promise<number> {
  const [xaut, [usdc]] = await Promise.all([
    fetchTetherGoldUsd(),
    fetchBitkubUsdcThb(),
  ]);
  return estimateThaiGold965(xaut, usdc!.price);
}

/**
 * Gold Traders Association price, checked against a Tether Gold estimate.
 * The estimate stands in when the scrape fails or diverges, since the
 * `classic.` page may be retired or change its markup.
 */
export async function fetchThaiGoldPrices(): Promise<ScrapeResult[]> {
  const [scraped, estimate] = await Promise.allSettled([
    scrapeGoldTraders(),
    fetchSpotEstimate(),
  ]);

  if (scraped.status === "fulfilled") {
    if (estimate.status === "rejected") {
      logger.log(
        `Thai gold spot estimate unavailable, using association price unchecked: ${estimate.reason}`,
      );
      return [scraped.value];
    }
    const gap = Math.abs(scraped.value.price / estimate.value - 1);
    if (gap <= MAX_DIVERGENCE) return [scraped.value];
    logger.warn(
      `goldtraders.or.th price ${scraped.value.price} is ${(gap * 100).toFixed(1)}% off the spot estimate ${estimate.value.toFixed(2)}`,
    );
  } else {
    logger.warn(`Failed to scrape goldtraders.or.th: ${scraped.reason}`);
  }

  if (estimate.status === "rejected") throw estimate.reason;
  logger.estimation(
    `📐 Using Tether Gold × USDC/THB to estimate ${THAI_GOLD_965_SYMBOL} price`,
  );
  return [
    {
      symbol: THAI_GOLD_965_SYMBOL,
      price: estimate.value,
      date: new Date().toISOString(),
    },
  ];
}
