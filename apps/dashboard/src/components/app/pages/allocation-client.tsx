"use client";

import { Donut } from "@/components/app/donut";
import { HBars } from "@/components/app/h-bars";
import { Kpi, KpiGrid } from "@/components/app/kpi";
import { PageHeader } from "@/components/app/page-header";
import { Stale } from "@/components/app/stale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type AllocationBucket,
  coreSatelliteSplit,
} from "@/lib/portfolio/aggregate";
import { RISK_LABEL } from "@/lib/portfolio/colors";
import { num, thb } from "@/lib/portfolio/format";

interface CurrencyDisplayRow {
  id: number;
  symbol: string;
  variant: string | null;
  valueInTHB: number;
  updatedAt: Date | null;
}

interface AllocationClientProps {
  byClass: AllocationBucket[];
  byRisk: AllocationBucket[];
  byCurrency: AllocationBucket[];
  currencies: CurrencyDisplayRow[];
}

export function AllocationClient({
  byClass,
  byRisk,
  byCurrency,
  currencies,
}: AllocationClientProps) {
  const total = byClass.reduce((s, d) => s + d.value, 0);
  const split = coreSatelliteSplit(byRisk);
  const totalRisk = split.core + split.satellite;
  const safest = byRisk.find((r) => r.key === "safe_core");
  const riskiest = byRisk.find((r) => r.key === "higher_satellite");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Allocation"
        title="Where the money lives"
        sub={`Total portfolio ${thb(total)}`}
      />

      <Tabs defaultValue="class" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="class">By class</TabsTrigger>
          <TabsTrigger value="risk">Core · Satellite</TabsTrigger>
          <TabsTrigger value="currency">Currency exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset class</CardTitle>
              </CardHeader>
              <CardContent>
                <Donut
                  data={byClass}
                  size={220}
                  thickness={26}
                  centerLabel="Portfolio"
                  centerValue={thb(total)}
                  valueFormatter={thb}
                  ariaLabel="Asset class allocation"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Drilldown</CardTitle>
                  <CardDescription>By value</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <HBars data={byClass} valueFmt={(v) => thb(v)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk">
          <div className="flex flex-col gap-5">
            <KpiGrid layout="4up">
              <Kpi
                label="Core"
                value={thb(split.core)}
                sub={
                  totalRisk === 0
                    ? "—"
                    : `${((split.core / totalRisk) * 100).toFixed(1)}% of portfolio`
                }
              />
              <Kpi
                label="Satellite"
                value={thb(split.satellite)}
                sub={
                  totalRisk === 0
                    ? "—"
                    : `${((split.satellite / totalRisk) * 100).toFixed(1)}% of portfolio`
                }
              />
              <Kpi
                label="Safest sleeve"
                value={RISK_LABEL.safe_core ?? "—"}
                sub={thb(safest?.value ?? 0)}
              />
              <Kpi
                label="Riskiest sleeve"
                value={RISK_LABEL.higher_satellite ?? "—"}
                sub={thb(riskiest?.value ?? 0)}
              />
            </KpiGrid>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Risk ladder</CardTitle>
                  <CardDescription>
                    Safe core → higher satellite
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <HBars data={byRisk} valueFmt={(v) => thb(v)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="currency">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Currency exposure</CardTitle>
                  <CardDescription>
                    Tracked balances only (THB banks + investment assets) — FCD
                    excluded
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Donut
                  data={byCurrency}
                  size={220}
                  thickness={26}
                  centerLabel="Total"
                  centerValue={thb(byCurrency.reduce((s, d) => s + d.value, 0))}
                  valueFormatter={thb}
                  ariaLabel="Currency exposure allocation"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>FX rates</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                        Currency
                      </th>
                      <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                        Variant
                      </th>
                      <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                        THB
                      </th>
                      <th className="border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-[12px] text-[var(--ink-3)]"
                        >
                          No currencies recorded.
                        </td>
                      </tr>
                    )}
                    {currencies.map((c) => (
                      <tr key={c.id}>
                        <td className="border-b border-[var(--hairline-2)] px-4 py-3 align-middle">
                          <span className="num">{c.symbol}</span>
                        </td>
                        <td className="border-b border-[var(--hairline-2)] px-4 py-3 align-middle text-[var(--ink-3)]">
                          {c.variant ?? "—"}
                        </td>
                        <td className="border-b border-[var(--hairline-2)] px-4 py-3 align-middle text-right">
                          <span className="num">{num(c.valueInTHB, 4)}</span>
                        </td>
                        <td className="border-b border-[var(--hairline-2)] px-4 py-3 align-middle text-right text-[var(--ink-3)]">
                          {c.symbol !== "THB" && <Stale date={c.updatedAt} />}{" "}
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
