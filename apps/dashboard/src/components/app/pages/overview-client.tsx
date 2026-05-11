"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AreaChart, type AreaChartPoint } from "@/components/app/area-chart";
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
import { pct, thb } from "@/lib/portfolio/format";

interface Mover {
  accountId: number;
  name: string;
  value: number;
  delta: number;
  deltaPct: number;
}

interface OverviewClientProps {
  series: AreaChartPoint[];
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
  const sliced = useMemo(() => sliceTimeframe(series, tf), [series, tf]);
  const investPL = investTotal - investCost;
  const investPLPct = investCost === 0 ? 0 : investPL / investCost;
  const accent = delta >= 0 ? "var(--accent-pos)" : "var(--accent-neg)";

  const kicker = asOf
    ? `As of ${new Date(asOf + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
    : "No snapshots yet";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker={kicker}
        title="Net Worth"
        right={<TimeframeToggle value={tf} onChange={setTf} />}
      />

      <div className="flex items-baseline gap-6">
        <div className="num text-[56px] leading-none font-semibold tracking-[-0.03em]">
          {thb(current)}
        </div>
        {series.length > 1 && <Delta value={delta} pct={deltaPct} />}
      </div>

      <Card className="px-3 py-2">
        <AreaChart
          data={sliced}
          height={260}
          accent={accent}
          formatY={(v) => thb(v)}
          formatX={(p) =>
            new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
        />
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
