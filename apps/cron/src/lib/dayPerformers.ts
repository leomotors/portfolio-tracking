export type AccountSnapshot = {
  id: number;
  name: string;
  cost: number;
  value: number;
};

export type DayPerformer = {
  name: string;
  /** Day-over-day change in unrealized P/L (value − cost). */
  pnlDelta: number;
};

export function dayPnlDelta(
  current: { cost: number; value: number },
  previous: { cost: number; value: number },
): number {
  return current.value - current.cost - (previous.value - previous.cost);
}

/**
 * Picks the accounts with the highest and lowest day-over-day unrealized P/L
 * change among those present in both current and previous snapshots.
 */
export function findTopAndWorstPerformers(
  current: AccountSnapshot[],
  previousById: Map<number, { cost: number; value: number }>,
): { top: DayPerformer; worst: DayPerformer } | null {
  let top: DayPerformer | null = null;
  let worst: DayPerformer | null = null;

  for (const account of current) {
    const previous = previousById.get(account.id);
    if (!previous) continue;

    const performer: DayPerformer = {
      name: account.name,
      pnlDelta: dayPnlDelta(account, previous),
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
