"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AreaChart, type AreaChartPoint } from "@/components/app/area-chart";
import { ChartMetricSelector } from "@/components/app/chart-metric-selector";
import { Delta } from "@/components/app/delta";
import { Donut } from "@/components/app/donut";
import { Kpi, KpiGrid } from "@/components/app/kpi";
import { PageHeader } from "@/components/app/page-header";
import {
  type Timeframe,
  TimeframeToggle,
} from "@/components/app/timeframe-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type AllocationBucket,
  sliceTimeframe,
} from "@/lib/portfolio/aggregate";
import { compactThb, pct, thb } from "@/lib/portfolio/format";

interface Mover {
  accountId: number;
  name: string;
  value: number;
  delta: number;
  deltaPct: number;
}

interface InvestmentDailyPoint {
  accountId: number;
  date: string;
  cost: number;
  value: number;
}

interface BankDailyPoint {
  accountId: number;
  date: string;
  balance: number;
}

type OverviewChartMetric =
  | "total"
  | "investmentCost"
  | "investmentPnl"
  | "bank";

const OVERVIEW_CHART_OPTIONS = [
  { value: "total", label: "Total" },
  { value: "investmentCost", label: "Investment Cost Basis" },
  { value: "investmentPnl", label: "Investment PnL" },
  { value: "bank", label: "Bank Account" },
] as const;

interface OverviewClientProps {
  series: AreaChartPoint[];
  investmentDaily: InvestmentDailyPoint[];
  bankDaily: BankDailyPoint[];
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  investTotal: number;
  investCost: number;
  bankTotal: number;
  bankCount: number;
  allocation: AllocationBucket[];
  movers: Mover[];
  asOf: string | null;
}

export function OverviewClient({
  series,
  investmentDaily,
  bankDaily,
  current,
  delta,
  deltaPct,
  investTotal,
  investCost,
  bankTotal,
  bankCount,
  allocation,
  movers,
  asOf,
}: OverviewClientProps) {
  const [tf, setTf] = useState<Timeframe>("1Y");
  const [chartMetric, setChartMetric] = useState<OverviewChartMetric>("total");
  const chartSeries = useMemo(
    () => ({
      total: series,
      investmentCost: aggregateSeries(investmentDaily, (p) => p.cost),
      investmentPnl: aggregateSeries(investmentDaily, (p) => p.value - p.cost),
      bank: aggregateSeries(bankDaily, (p) => p.balance),
    }),
    [bankDaily, investmentDaily, series],
  );
  const selectedSeries = chartSeries[chartMetric];
  const sliced = useMemo(
    () => sliceTimeframe(selectedSeries, tf),
    [selectedSeries, tf],
  );
  const investPL = investTotal - investCost;
  const investPLPct = investCost === 0 ? 0 : investPL / investCost;
  const chartBaseline = sliced[0]?.value;

  const kicker = asOf
    ? `As of ${new Date(asOf + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
    : "No snapshots yet";

  return (
    <div className="flex flex-col gap-5">
      <Card className="bg-[var(--surface)]">
        <div className="px-5 pt-5 pb-4 md:px-6 md:pt-6">
          <PageHeader
            kicker={kicker}
            title="Net Worth"
            right={<TimeframeToggle value={tf} onChange={setTf} />}
          />

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="num text-[42px] leading-none font-semibold tracking-[-0.03em] md:text-[52px]">
                {thb(current)}
              </div>
              <div className="mt-2 flex min-h-6 flex-wrap items-center gap-3">
                {series.length > 1 ? (
                  <Delta value={delta} pct={deltaPct} large />
                ) : (
                  <span className="text-[13px] text-[var(--ink-3)]">
                    Waiting for another snapshot
                  </span>
                )}
              </div>
            </div>
            <div className="grid min-w-[180px] gap-1 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
              <div className="text-[12px] font-medium text-[var(--ink-2)]">
                Investment mark
              </div>
              <div className="num text-[18px] font-semibold">
                {thb(investTotal)}
              </div>
              <div className="text-[11px] text-[var(--ink-3)]">
                Cash {thb(bankTotal)}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--hairline)] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 pt-1">
            <div>
              <div className="text-[12px] font-medium text-[var(--ink-2)]">
                Trend
              </div>
              <div className="text-[11px] text-[var(--ink-3)]">
                Baseline follows the selected window
              </div>
            </div>
            <ChartMetricSelector
              value={chartMetric}
              onChange={setChartMetric}
              options={OVERVIEW_CHART_OPTIONS}
            />
          </div>
          <AreaChart
            data={sliced}
            height={270}
            accent="var(--accent-pos)"
            baselineValue={chartBaseline}
            formatY={(v) => thb(v)}
            formatAxisY={(v) => compactThb(v)}
            formatDelta={(v, p) => `${thb(v, { sign: true })} (${pct(p)})`}
            formatX={(p) =>
              new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
        </div>
      </Card>

      <KpiGrid layout="4up">
        <Kpi
          label="Investments"
          value={thb(investTotal)}
          delta={investPL}
          pct={investPLPct}
          sub={`cost ${thb(investCost)}`}
        />
        <Kpi
          label="Banks (THB)"
          value={thb(bankTotal)}
          sub={`${bankCount} ${bankCount === 1 ? "account" : "accounts"}`}
        />
        <Kpi
          label="Total cost basis"
          value={thb(investCost)}
          sub="manually maintained"
        />
        <Kpi
          label="All-time P/L"
          value={thb(investPL)}
          sub={investCost === 0 ? "—" : pct(investPLPct)}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Asset allocation</CardTitle>
              <CardDescription>By class · current value</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Donut
              data={allocation}
              size={180}
              thickness={18}
              centerLabel="Portfolio"
              centerValue={thb(allocation.reduce((s, b) => s + b.value, 0))}
              emptyLabel="No assets yet"
              valueFormatter={thb}
              ariaLabel="Asset allocation by class"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Today&apos;s movers</CardTitle>
              <CardDescription>vs. yesterday&apos;s snapshot</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {movers.length === 0 ? (
              <div className="text-[12px] text-[var(--ink-3)]">
                No prior-day snapshot to compare against yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {movers.map((m, idx) => (
                  <Link
                    key={m.accountId}
                    href={`/investments?account=${m.accountId}`}
                    className={`-mx-3 flex items-center justify-between rounded-lg px-3 py-3 hover:bg-[var(--hover)] ${
                      idx < movers.length - 1
                        ? "border-b border-[var(--hairline-2)]"
                        : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-[13px] font-medium">
                      {m.name}
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="num text-[13px]">{thb(m.value)}</span>
                      <Delta value={m.delta} pct={m.deltaPct} mini />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function aggregateSeries<T extends { date: string }>(
  rows: readonly T[],
  getValue: (row: T) => number,
): AreaChartPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + getValue(row));
  }

  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
