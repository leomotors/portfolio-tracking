export const dynamic = "force-dynamic";

import { OverviewClient } from "@/components/app/pages/overview-client";
import {
  getAssets,
  getBankAccounts,
  getBankDaily,
  getCurrencies,
  getInvestmentAccounts,
  getInvestmentDaily,
  getPnlEvents,
  getRealEstateDaily,
  getRealEstateProperties,
} from "@/lib/db/queries";
import {
  byAssetClass,
  combineNetWorthSeries,
  dayDelta,
  dayMovers,
  eventPnlThb,
  investmentTotals,
  isCapitalBankAccount,
  type MoverInput,
  realEstateTotals,
  takenPnl,
} from "@/lib/portfolio/aggregate";

export default async function OverviewPage() {
  const [
    investAccts,
    bankAccts,
    investDaily,
    bankDaily,
    realEstateDaily,
    assets,
    currencies,
    realEstateProperties,
    pnlEvents,
  ] = await Promise.all([
    getInvestmentAccounts(),
    getBankAccounts(),
    getInvestmentDaily(),
    getBankDaily(),
    getRealEstateDaily(),
    getAssets(),
    getCurrencies(),
    getRealEstateProperties(),
    getPnlEvents(),
  ]);

  const series = combineNetWorthSeries(
    investDaily,
    bankDaily,
    realEstateDaily.map((row) => ({
      propertyId: row.propertyId,
      date: row.date,
      value: row.value,
    })),
  );
  const totals = investmentTotals(investAccts);
  const realEstate = realEstateTotals(realEstateProperties);
  const bankTotal = bankAccts.reduce((s, a) => s + a.currentBalance, 0);
  const savingsAccounts = bankAccts.filter((a) =>
    isCapitalBankAccount(a.accountType),
  );
  const savingsAccountIds = new Set(savingsAccounts.map((a) => a.id));
  const savingsBankDaily = bankDaily.filter((d) =>
    savingsAccountIds.has(d.accountId),
  );
  const savingsTotal = savingsAccounts.reduce(
    (s, a) => s + a.currentBalance,
    0,
  );
  const totalCapital = totals.cost + savingsTotal;
  const allocation = byAssetClass(
    assets,
    currencies,
    bankAccts,
    realEstateProperties,
  );

  const liveTotal = totals.total + bankTotal + realEstate.value;
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
  const recentByAccount = new Map<
    number,
    { latest: number; previous: number | null }
  >();
  for (const d of investDaily) {
    const prev = recentByAccount.get(d.accountId);
    if (!prev)
      recentByAccount.set(d.accountId, { latest: d.value, previous: null });
    else
      recentByAccount.set(d.accountId, {
        latest: d.value,
        previous: prev.latest,
      });
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

  const accountName = new Map(investAccts.map((a) => [a.id, a.name]));
  const taken = takenPnl(pnlEvents);
  const takenEvents = pnlEvents
    .filter(
      (event): event is typeof event & { withdrawAmount: number } =>
        event.kind === "withdrawn" && event.withdrawAmount != null,
    )
    .map((event) => ({
      id: event.id,
      accountId: event.investmentAccountId,
      accountName: accountName.get(event.investmentAccountId) ?? "Account",
      occurredOn: event.occurredOn,
      currency: event.currency,
      pnl: event.pnl,
      pnlThb: eventPnlThb(event),
      withdrawAmount: event.withdrawAmount,
      note: event.note,
    }));

  return (
    <OverviewClient
      series={series}
      investmentDaily={investDaily}
      savingsBankDaily={savingsBankDaily}
      current={liveTotal}
      previous={previousSnapshot}
      delta={liveDelta.delta}
      deltaPct={liveDelta.deltaPct}
      investTotal={totals.total}
      investCost={totals.cost}
      savingsTotal={savingsTotal}
      savingsCount={savingsAccounts.length}
      totalCapital={totalCapital}
      bankTotal={bankTotal}
      allocation={allocation}
      movers={movers.slice(0, 8)}
      takenPnlTotal={taken}
      takenEvents={takenEvents}
      asOf={series.at(-1)?.date ?? null}
    />
  );
}
