import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@repo/database/client";
import { assetTable, stakedPositionTable } from "@repo/database/schema";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";
import { fetchBoringVaultUnderlying } from "@/data/evm";
import { fetchHyperliquidStake } from "@/data/hyperliquid";
import {
  fetchSolanaStakeBalance,
  fetchSolanaStakeBalanceByAuthority,
} from "@/data/solana";
import {
  detectBalanceJump,
  projectUnderlying,
  rescaleAverageCost,
} from "@/lib/staking";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const solanaConfigSchema = z
  .object({
    /** Auto-discover every stake account owned by this withdraw authority */
    withdrawAuthority: z.string().optional(),
    /** Explicit list — fallback when the RPC blocks getProgramAccounts */
    stakeAccounts: z.array(z.string()).optional(),
  })
  .refine(
    (c) => c.withdrawAuthority != null || (c.stakeAccounts?.length ?? 0) > 0,
    { message: "syncConfig needs withdrawAuthority or stakeAccounts" },
  );

const hyperliquidConfigSchema = z.object({
  user: z.string(),
});

const etherfiConfigSchema = z.object({
  wallet: z.string(),
  vault: z.string(),
  accountant: z.string(),
  rateDecimals: z.number().int(),
  quote: z.string().optional(),
  vaultSymbol: z.string().optional(),
});

type StakedPositionRow = typeof stakedPositionTable.$inferSelect;

interface LiveBalance {
  current: number;
  /** Receipt/share balance for share-based positions (e.g. liquidBTC) */
  shares?: number;
  /** Underlying per share (share-based only) */
  rate?: number;
  receiptSymbol?: string;
}

/** Live on-chain/API balance; null means the provider has no live source. */
async function fetchLiveUnderlying(
  position: StakedPositionRow,
): Promise<LiveBalance | null> {
  switch (position.provider) {
    case "solana_native": {
      const config = solanaConfigSchema.parse(position.syncConfig);
      return {
        current:
          config.withdrawAuthority != null
            ? await fetchSolanaStakeBalanceByAuthority(config.withdrawAuthority)
            : await fetchSolanaStakeBalance(config.stakeAccounts!),
      };
    }
    case "hyperliquid":
      return {
        current: await fetchHyperliquidStake(
          hyperliquidConfigSchema.parse(position.syncConfig).user,
        ),
      };
    case "etherfi_liquid": {
      const config = etherfiConfigSchema.parse(position.syncConfig);
      const { shares, rate, underlying } =
        await fetchBoringVaultUnderlying(config);
      return {
        current: underlying,
        shares,
        rate,
        receiptSymbol: config.vaultSymbol,
      };
    }
    case "manual":
      return null;
  }
}

interface SyncOutcome {
  current: number;
  source: "chain" | "apy_projection";
  error: string | null;
  shares?: number;
  receiptSymbol?: string;
}

/**
 * Deposits/withdrawals aren't yield, so an unexplained balance change must
 * never jump P/L. The value stays anchored until the user confirms the new
 * baseline (update Holding/Current + deposited on the Crypto tab):
 *
 * - Share-based (Ether.fi Liquid): shares only change on deposit/withdraw,
 *   so detection is exact. On mismatch, value = STORED shares x live rate
 *   (yield keeps accruing via the rate) and a warning fires.
 * - Balance-based (Solana native, Hyperliquid): plausibility threshold. On a
 *   suspicious jump, value holds at the old amount projected forward by the
 *   fixed APY, and a warning fires.
 */
function reconcileLiveBalance(
  position: StakedPositionRow,
  live: LiveBalance,
  now: Date,
): SyncOutcome {
  if (live.shares != null && live.rate != null) {
    const storedShares =
      position.receiptAmount != null
        ? parseFloat(position.receiptAmount)
        : null;
    if (storedShares != null && Math.abs(live.shares - storedShares) > 1e-9) {
      logger.warn(
        `⚠️ ${position.name}: receipt balance changed ` +
          `${storedShares} -> ${live.shares} ${live.receiptSymbol ?? "shares"} — ` +
          `value stays anchored to ${storedShares} until you update Holding ` +
          `and the deposited amount on the Crypto tab`,
      );
      return {
        current: storedShares * live.rate,
        source: "chain",
        error: null,
      };
    }
    return {
      current: live.current,
      source: "chain",
      error: null,
      shares: live.shares,
      receiptSymbol: live.receiptSymbol,
    };
  }

  if (position.syncedAt != null) {
    const elapsedDays =
      (now.getTime() - position.syncedAt.getTime()) / MS_PER_DAY;
    const previous = parseFloat(position.currentUnderlying);
    const projectedApy =
      position.projectedApy != null ? parseFloat(position.projectedApy) : null;
    const jump = detectBalanceJump(
      previous,
      live.current,
      projectedApy,
      elapsedDays,
    );
    if (jump != null) {
      logger.warn(
        `⚠️ ${position.name}: balance moved like a ${jump} ` +
          `(${previous} -> ${live.current} ${position.underlyingSymbol}) — ` +
          `value holds at projected APY until you update Current ` +
          `and the deposited amount on the Crypto tab`,
      );
      return {
        current:
          projectedApy != null
            ? projectUnderlying(previous, projectedApy, position.syncedAt, now)
            : previous,
        source: "apy_projection",
        error: null,
      };
    }
  }

  return { current: live.current, source: "chain", error: null };
}

export async function stakingSyncStep() {
  const positions = await db.select().from(stakedPositionTable);

  if (positions.length === 0) {
    logger.log("No staked positions to sync");
    return;
  }

  logger.log(`Syncing ${positions.length} staked position(s)...`);
  const now = new Date();

  for (const position of positions) {
    let liveError: string | null = null;
    let outcome: SyncOutcome | null = null;

    try {
      const live = await fetchLiveUnderlying(position);
      if (live != null) {
        outcome = reconcileLiveBalance(position, live, now);
      }
    } catch (err) {
      liveError = err instanceof Error ? err.message : String(err);
      logger.error(`Staking sync failed for ${position.name}: ${liveError}`);
    }

    // Fallback: compound the projected APY forward from the last sync so
    // daily snapshots stay smooth until the live source (or a manual edit)
    // catches up.
    if (outcome == null && position.projectedApy != null) {
      const current = parseFloat(position.currentUnderlying);
      if (position.syncedAt != null && current > 0) {
        const projected = projectUnderlying(
          current,
          parseFloat(position.projectedApy),
          position.syncedAt,
          now,
        );
        logger.estimation(
          `📐 Projecting ${position.name} at ${position.projectedApy} APY: ${current} -> ${projected}`,
        );
        outcome = {
          current: projected,
          source: "apy_projection",
          error: liveError,
        };
      }
    }

    if (outcome == null) {
      if (liveError != null && !environment.DRY_RUN) {
        await db
          .update(stakedPositionTable)
          .set({ syncError: liveError })
          .where(eq(stakedPositionTable.id, position.id));
      }
      if (position.provider === "manual") {
        logger.log(`- ${position.name}: manual position, nothing to sync`);
      }
      continue;
    }

    const deposited = parseFloat(position.depositedUnderlying);
    const earned = outcome.current - deposited;
    logger.log(
      `- ${position.name}: ${outcome.current} ${position.underlyingSymbol}` +
        ` (deposited ${deposited}, earned ${earned.toFixed(6)}, via ${outcome.source})`,
    );

    if (environment.DRY_RUN) continue;

    await db
      .update(stakedPositionTable)
      .set({
        currentUnderlying: String(outcome.current),
        syncSource: outcome.source,
        syncedAt: now,
        syncError: outcome.error,
        ...(outcome.shares != null
          ? {
              receiptAmount: String(outcome.shares),
              receiptSymbol: outcome.receiptSymbol ?? position.receiptSymbol,
            }
          : {}),
      })
      .where(eq(stakedPositionTable.id, position.id));

    // Write the amount back into the linked asset row so account values and
    // daily snapshots include rewards. Average cost is rescaled so the total
    // cost basis stays constant (rewards are P/L, not cost).
    if (position.assetId != null) {
      const [asset] = await db
        .select()
        .from(assetTable)
        .where(eq(assetTable.id, position.assetId));

      if (asset) {
        const newAverageCost = rescaleAverageCost(
          parseFloat(asset.amount),
          parseFloat(asset.averageCost),
          outcome.current,
        );
        await db
          .update(assetTable)
          .set({
            amount: String(outcome.current),
            ...(newAverageCost != null
              ? { averageCost: String(newAverageCost) }
              : {}),
          })
          .where(eq(assetTable.id, asset.id));
      }
    }
  }

  logger.log("✓ Staking sync completed");
}
