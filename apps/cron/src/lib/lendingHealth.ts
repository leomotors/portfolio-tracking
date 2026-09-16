export type LendingPosition = {
  symbol: string;
  amount: number;
  usd: number;
};

export type LendingHealthSnapshot = {
  name: string;
  cash: LendingPosition[];
  borrowed: LendingPosition[];
  cashUsd: number;
  borrowedUsd: number;
  leftoverUsd: number;
  /** Protocol health factor (WAD units already converted). Informational. */
  protocolHealthFactor: number | null;
};

const usd = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function sumUsd(positions: LendingPosition[]): number {
  return positions.reduce((sum, p) => sum + p.usd, 0);
}

/**
 * Cash buffer vs borrow. Negative means cash-like collateral no longer
 * covers the loan (BTC is being used as leverage).
 */
export function leftoverUsd(cashUsd: number, borrowedUsd: number): number {
  return cashUsd - borrowedUsd;
}

export function isUnderDebt(leftover: number): boolean {
  return leftover < 0;
}

export function buildLendingHealthSnapshot(input: {
  name: string;
  cash: LendingPosition[];
  borrowed: LendingPosition[];
  borrowedUsd?: number;
  protocolHealthFactor?: number | null;
}): LendingHealthSnapshot {
  const cashUsd = sumUsd(input.cash);
  const borrowedUsd = input.borrowedUsd ?? sumUsd(input.borrowed);
  return {
    name: input.name,
    cash: input.cash,
    borrowed: input.borrowed,
    cashUsd,
    borrowedUsd,
    leftoverUsd: leftoverUsd(cashUsd, borrowedUsd),
    protocolHealthFactor: input.protocolHealthFactor ?? null,
  };
}

export function formatLendingDiscordLines(
  snapshots: LendingHealthSnapshot[],
): string {
  if (snapshots.length === 0) return "";
  return snapshots.map(formatOneLendingLine).join("\n");
}

function formatOneLendingLine(health: LendingHealthSnapshot): string {
  const line = `${health.name}: ${usd.format(health.leftoverUsd)}`;
  return isUnderDebt(health.leftoverUsd) ? `⚠️ **${line}**` : line;
}
