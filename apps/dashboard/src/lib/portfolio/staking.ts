const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StakingDailySample {
  /** YYYY-MM-DD */
  date: string;
  currentUnderlying: number;
  depositedUnderlying: number;
}

const MIN_TWR_DAYS = 7;

/**
 * Time-weighted APY from daily snapshots. Each interval's growth factor
 * strips out the deposit/withdrawal flow recorded that day —
 * (current − Δdeposited) / previousCurrent — so unlike the simple
 * (current/deposited)^(365/days) approximation, the result is immune to the
 * baseline changing over time. Requires at least `minDays` days between the
 * first and last snapshot; returns null otherwise. Samples must be sorted by
 * date ascending. Caveat: a deposit recorded late lands on the wrong day's
 * snapshot and distorts that one interval.
 */
export function timeWeightedApy(
  samples: StakingDailySample[],
  minDays: number = MIN_TWR_DAYS,
): number | null {
  if (samples.length < 2) return null;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const totalDays =
    (new Date(last.date + "T00:00:00").getTime() -
      new Date(first.date + "T00:00:00").getTime()) /
    MS_PER_DAY;
  if (totalDays < minDays) return null;

  let product = 1;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const sample = samples[i]!;
    if (prev.currentUnderlying <= 0) continue;
    const flow = sample.depositedUnderlying - prev.depositedUnderlying;
    const adjusted = sample.currentUnderlying - flow;
    if (adjusted <= 0) continue;
    product *= adjusted / prev.currentUnderlying;
  }
  if (product <= 0) return null;
  return Math.pow(product, 365 / totalDays) - 1;
}

/**
 * Annualized yield implied by growth from deposited to current underlying
 * since `stakedSince`: (current/deposited)^(365/days) - 1. Approximate when
 * deposits changed mid-life. Returns null when it cannot be computed.
 */
export function effectiveApy(
  deposited: number,
  current: number,
  stakedSince: string | null,
  now: Date = new Date(),
): number | null {
  if (deposited <= 0 || current <= 0 || !stakedSince) return null;
  const days =
    (now.getTime() - new Date(stakedSince + "T00:00:00").getTime()) /
    MS_PER_DAY;
  if (days < 1) return null;
  return Math.pow(current / deposited, 365 / days) - 1;
}

/**
 * Rescale a per-unit average cost so the total cost basis stays constant
 * when the amount changes (staking rewards are P/L, not cost). Mirrors the
 * cron write-back. Returns null when either amount is non-positive.
 */
export function rescaleAverageCost(
  oldAmount: number,
  oldAverageCost: number,
  newAmount: number,
): number | null {
  if (oldAmount <= 0 || newAmount <= 0) return null;
  return (oldAmount * oldAverageCost) / newAmount;
}

export const STAKING_PROVIDER_LABEL: Record<string, string> = {
  solana_native: "Solana native",
  hyperliquid: "Hyperliquid",
  etherfi_liquid: "Ether.fi Liquid",
  manual: "Manual",
};

export const STAKING_SOURCE_LABEL: Record<string, string> = {
  chain: "on-chain",
  apy_projection: "projected",
  manual: "manual",
};
