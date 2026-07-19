const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compound an underlying amount forward by a projected APY (fraction per
 * year) for the time elapsed between two instants. Used as a fallback when
 * the live balance fetch fails, so daily snapshots stay smooth.
 */
export function projectUnderlying(
  current: number,
  projectedApy: number,
  from: Date,
  to: Date,
): number {
  const days = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (days <= 0 || current <= 0) return current;
  return current * Math.pow(1 + projectedApy, days / 365);
}

/**
 * For balance-based staking (no receipt token), growth beyond what yield can
 * plausibly produce — or any shrinkage — indicates a deposit/withdrawal the
 * user should record. Allows 5x the projected yield for the elapsed days
 * (epoch timing jitter) with a 0.5% floor.
 */
export function detectBalanceJump(
  previous: number,
  current: number,
  projectedApy: number | null,
  elapsedDays: number,
): "deposit" | "withdrawal" | null {
  if (previous <= 0 || elapsedDays <= 0) return null;
  const growth = current / previous - 1;
  if (growth < -1e-9) return "withdrawal";
  const apy = projectedApy ?? 0.2;
  const allowance = Math.max(
    Math.pow(1 + apy, (elapsedDays * 5) / 365) - 1,
    0.005,
  );
  return growth > allowance ? "deposit" : null;
}

/**
 * Rescale a per-unit average cost so the total cost basis stays constant
 * when the amount changes. Staking rewards have zero cost, so growing the
 * amount must not grow amount * averageCost; rewards then show up as P/L.
 * Returns null when either amount is non-positive (nothing to preserve).
 */
export function rescaleAverageCost(
  oldAmount: number,
  oldAverageCost: number,
  newAmount: number,
): number | null {
  if (oldAmount <= 0 || newAmount <= 0) return null;
  return (oldAmount * oldAverageCost) / newAmount;
}
