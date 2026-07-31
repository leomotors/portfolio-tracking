import z from "zod";

import { logger } from "@/core/logger";

import { type ScrapeResult } from "./types";

/** Asset symbols are `HLV:<vaultAddress>` (case-insensitive address). */
export const HLV_SYMBOL_PREFIX = "HLV:";

const vaultEquitySchema = z.object({
  vaultAddress: z.string(),
  equity: z.coerce.number(),
});

const userVaultEquitiesSchema = z.array(vaultEquitySchema);

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function parseHlvSymbol(symbol: string): string | null {
  if (!symbol.toLowerCase().startsWith(HLV_SYMBOL_PREFIX.toLowerCase())) {
    return null;
  }
  const address = symbol.slice(HLV_SYMBOL_PREFIX.length);
  if (!EVM_ADDRESS_RE.test(address)) return null;
  return address.toLowerCase();
}

/** First EVM address in a (possibly multi-line) investment account_no. */
export function walletFromAccountNo(accountNo: string): string | null {
  for (const line of accountNo.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (EVM_ADDRESS_RE.test(trimmed)) return trimmed.toLowerCase();
  }
  return null;
}

async function fetchUserVaultEquities(
  user: string,
): Promise<Map<string, number>> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userVaultEquities", user }),
  });

  if (!res.ok) {
    throw new Error(
      `Hyperliquid userVaultEquities failed: ${res.statusText} ${await res.text()}`,
    );
  }

  const rows = userVaultEquitiesSchema.parse(await res.json());
  return new Map(
    rows.map((r) => [r.vaultAddress.toLowerCase(), r.equity] as const),
  );
}

export type HyperliquidVaultAsset = {
  symbol: string;
  /** Wallet that holds the vault equity (from investment_account.account_no) */
  wallet: string;
};

/**
 * Prices Hyperliquid vault positions as USDC equity (amount should be 1,
 * average_cost = USDC deposited). Discovers vaults from asset symbols — no
 * vault allowlist in code.
 */
export async function fetchHyperliquidVaultPrices(
  assets: HyperliquidVaultAsset[],
): Promise<ScrapeResult[]> {
  const byWallet = new Map<string, { symbol: string; vault: string }[]>();

  for (const asset of assets) {
    const vault = parseHlvSymbol(asset.symbol);
    if (vault == null) {
      logger.error(
        `Invalid hyperliquid_vault symbol (want HLV:0x…): ${asset.symbol}`,
      );
      continue;
    }
    if (!EVM_ADDRESS_RE.test(asset.wallet)) {
      logger.error(`No EVM wallet on account for vault asset ${asset.symbol}`);
      continue;
    }
    const wallet = asset.wallet.toLowerCase();
    const list = byWallet.get(wallet) ?? [];
    list.push({ symbol: asset.symbol, vault });
    byWallet.set(wallet, list);
  }

  const date = new Date().toISOString();
  const results: ScrapeResult[] = [];

  for (const [wallet, positions] of byWallet) {
    const equities = await fetchUserVaultEquities(wallet);
    for (const { symbol, vault } of positions) {
      const equity = equities.get(vault);
      if (equity == null) {
        logger.error(
          `No Hyperliquid vault equity for ${symbol} (wallet ${wallet})`,
        );
        continue;
      }
      results.push({ symbol, price: equity, date });
    }
  }

  return results;
}
