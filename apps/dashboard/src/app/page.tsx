export const dynamic = "force-dynamic";

import { OverviewClient } from "@/components/app/pages/overview-client";
import {
  getAssets,
  getBankAccounts,
  getBankDaily,
  getCurrencies,
  getInvestmentAccounts,
  getInvestmentDaily,
} from "@/lib/db/queries";
import {
  byAssetClass,
  combineNetWorthSeries,
  dayDelta,
  dayMovers,
  investmentTotals,
  type MoverInput,
} from "@/lib/portfolio/aggregate";

export default async function OverviewPage() {
  const [investAccts, bankAccts, investDaily, bankDaily, assets, currencies] =
    await Promise.all([
      getInvestmentAccounts(),
      getBankAccounts(),
      getInvestmentDaily(),
      getBankDaily(),
      getAssets(),
      getCurrencies(),
    ]);

  const series = combineNetWorthSeries(investDaily, bankDaily);
  const totals = investmentTotals(investAccts);
  const bankTotal = bankAccts.reduce((s, a) => s + a.currentBalance, 0);
  const allocation = byAssetClass(assets, currencies, bankAccts);

  const liveTotal = totals.total + bankTotal;
  const todaySnapshot = series.at(-1)?.value ?? liveTotal;
  const previousSnapshot = series.at(-2)?.value ?? todaySnapshot;
  const liveDelta = dayDelta([
    { date: "prev", value: previousSnapshot },
    { date: "now", value: liveTotal },
  ]);

  // investDaily is ordered ascending by date. Track the two most recent
  // snapshots per account so we can compute day-over-day delta. The cron
  // refreshes prices and snapshots the *same* value on each run, so
  // comparing currentValue to the latest snapshot would always be zero
  // right after a cron run.
  const recentByAccount = new Map<number, { latest: number; previous: number | null }>();
  for (const d of investDaily) {
    const prev = recentByAccount.get(d.accountId);
    if (!prev) recentByAccount.set(d.accountId, { latest: d.value, previous: null });
    else recentByAccount.set(d.accountId, { latest: d.value, previous: prev.latest });
  }

  const moverInputs: MoverInput[] = investAccts
    .map((a) => {
      const r = recentByAccount.get(a.id);
      if (!r || r.previous == null) return null;
      return {
        accountId: a.id,
        name: a.name,
        current: r.latest,
        previous: r.previous,
      };
    })
    .filter((m): m is MoverInput => m !== null);
  const movers = dayMovers(moverInputs).filter((m) => m.delta !== 0);

  return (
    <OverviewClient
      series={series}
      current={liveTotal}
      previous={previousSnapshot}
      delta={liveDelta.delta}
      deltaPct={liveDelta.deltaPct}
      investTotal={totals.total}
      investCost={totals.cost}
      bankTotal={bankTotal}
      bankCount={bankAccts.length}
      allocation={allocation}
      movers={movers.slice(0, 8)}
      asOf={series.at(-1)?.date ?? null}
    />
  );
}
