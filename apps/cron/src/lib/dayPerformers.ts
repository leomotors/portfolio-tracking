import { eq, gt } from "drizzle-orm";

import { db } from "@repo/database/client";
import { assetTable, currencyTable } from "@repo/database/schema";

export type AssetSnapshot = {
  id: number;
  name: string;
  symbol: string | null;
  assetClass: string;
  cost: number;
  value: number;
};

export type DayPerformer = {
  name: string;
  /** Day-over-day change in unrealized P/L (value − cost). */
  pnlDelta: number;
};

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function dayPnlDelta(
  current: { cost: number; value: number },
  previous: { cost: number; value: number },
): number {
  return current.value - current.cost - (previous.value - previous.cost);
}

/** Held assets with cost/value in THB at the current DB prices and FX. */
export async function loadHeldAssetSnapshots(): Promise<AssetSnapshot[]> {
  const rows = await db
    .select({
      id: assetTable.id,
      name: assetTable.name,
      symbol: assetTable.symbol,
      assetClass: assetTable.assetClass,
      amount: assetTable.amount,
      averageCost: assetTable.averageCost,
      currentPrice: assetTable.currentPrice,
      valueInTHB: currencyTable.valueInTHB,
    })
    .from(assetTable)
    .innerJoin(currencyTable, eq(assetTable.currencyId, currencyTable.id))
    .where(gt(assetTable.amount, "0"));

  return rows.map((asset) => {
    const amount = toNum(asset.amount);
    const fx = toNum(asset.valueInTHB, 1);
    return {
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      cost: amount * toNum(asset.averageCost) * fx,
      value: amount * toNum(asset.currentPrice) * fx,
    };
  });
}

/**
 * Picks the assets with the highest and lowest day-over-day unrealized P/L
 * change among those present in both current and previous snapshots.
 */
export function findTopAndWorstPerformers(
  current: AssetSnapshot[],
  previousById: Map<number, { cost: number; value: number }>,
): { top: DayPerformer; worst: DayPerformer } | null {
  let top: DayPerformer | null = null;
  let worst: DayPerformer | null = null;

  for (const asset of current) {
    const previous = previousById.get(asset.id);
    if (!previous) continue;

    const performer: DayPerformer = {
      name: asset.name,
      pnlDelta: dayPnlDelta(asset, previous),
    };

    if (!top || performer.pnlDelta > top.pnlDelta) {
      top = performer;
    }
    if (!worst || performer.pnlDelta < worst.pnlDelta) {
      worst = performer;
    }
  }

  if (!top || !worst) {
    return null;
  }

  return { top, worst };
}
