"use client";

import { useRef, useState } from "react";

import { Donut } from "@/components/app/donut";
import { HBars } from "@/components/app/h-bars";
import { Kpi, KpiGrid } from "@/components/app/kpi";
import { PageHeader } from "@/components/app/page-header";
import { Sensitive } from "@/components/app/sensitive";
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
  ACCOUNT_OUTSIDE_BANKS,
  ACCOUNT_OUTSIDE_REAL_ESTATE,
  type AllocationBucket,
  type AllocationMember,
  coreSatelliteSplit,
} from "@/lib/portfolio/aggregate";
import { CLASS_COLOR, RISK_LABEL } from "@/lib/portfolio/colors";
import { num, thb } from "@/lib/portfolio/format";

interface CurrencyDisplayRow {
  id: number;
  symbol: string;
  variant: string | null;
  valueInTHB: number;
  updatedAt: Date | null;
}

interface AllocationMembersByDimension {
  class: Record<string, AllocationMember[]>;
  type: Record<string, AllocationMember[]>;
  account: Record<string, AllocationMember[]>;
  custody: Record<string, AllocationMember[]>;
  risk: Record<string, AllocationMember[]>;
  currency: Record<string, AllocationMember[]>;
}

interface AllocationClientProps {
  byClass: AllocationBucket[];
  byType: AllocationBucket[];
  byRisk: AllocationBucket[];
  byCurrency: AllocationBucket[];
  byAccount: AllocationBucket[];
  byCustody: AllocationBucket[];
  members: AllocationMembersByDimension;
  bankTotal: number;
  realEstateTotal: number;
  currencies: CurrencyDisplayRow[];
}

export function AllocationClient({
  byClass,
  byType,
  byRisk,
  byCurrency,
  byAccount,
  byCustody,
  members,
  bankTotal,
  realEstateTotal,
  currencies,
}: AllocationClientProps) {
  const total = byClass.reduce((s, d) => s + d.value, 0);
  const accountTotal = byAccount.reduce((s, d) => s + d.value, 0);
  const split = coreSatelliteSplit(byRisk);
  const totalRisk = split.core + split.satellite;
  const safest = byRisk.find((r) => r.key === "safe_core");
  const riskiest = byRisk.find((r) => r.key === "higher_satellite");
  const currencyTotal = byCurrency.reduce((s, d) => s + d.value, 0);
  const accountOutside: AllocationBucket[] = [
    {
      key: ACCOUNT_OUTSIDE_BANKS,
      label: "Banks",
      value: bankTotal,
      color: CLASS_COLOR.cash ?? "oklch(0.72 0.10 235)",
    },
    {
      key: ACCOUNT_OUTSIDE_REAL_ESTATE,
      label: "Real Estate",
      value: realEstateTotal,
      color: CLASS_COLOR.real_estate ?? "oklch(0.62 0.10 40)",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Allocation"
        title="Where the money lives"
        sub={
          <>
            Total portfolio <Sensitive>{thb(total)}</Sensitive>
          </>
        }
      />

      <Tabs defaultValue="class" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="class">By class</TabsTrigger>
          <TabsTrigger value="account">By account</TabsTrigger>
          <TabsTrigger value="custody">By custody</TabsTrigger>
          <TabsTrigger value="risk">Core · Satellite</TabsTrigger>
          <TabsTrigger value="currency">Currency exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <div className="flex flex-col gap-5">
            <AllocationPane
              title="Asset class"
              data={byClass}
              members={members.class}
              centerLabel="Portfolio"
              centerValue={thb(total)}
              ariaLabel="Asset class allocation"
            />
            <AllocationPane
              title="Asset type"
              description="Thai vs offshore stock, cash, and bond sleeves. Bank balances count as Thai cash."
              data={byType}
              members={members.type}
              centerLabel="Portfolio"
              centerValue={thb(total)}
              ariaLabel="Asset type allocation"
            />
          </div>
        </TabsContent>

        <TabsContent value="account">
          <AllocationPane
            title="Investment account"
            description="Slices are brokerage accounts. Banks and real estate are listed beside the chart."
            data={byAccount}
            members={members.account}
            centerLabel="Investments"
            centerValue={thb(accountTotal)}
            ariaLabel="Allocation by investment account"
            outside={accountOutside}
          />
        </TabsContent>

        <TabsContent value="custody">
          <AllocationPane
            title="Custody"
            description="Who holds each investment account. Unclassified until you set it. Banks and real estate count as Thai custodial."
            data={byCustody}
            members={members.custody}
            centerLabel="Portfolio"
            centerValue={thb(total)}
            ariaLabel="Allocation by custody"
          />
        </TabsContent>

        <TabsContent value="risk">
          <div className="flex flex-col gap-5">
            <KpiGrid layout="4up">
              <Kpi
                label="Core"
                value={<Sensitive>{thb(split.core)}</Sensitive>}
                sub={
                  totalRisk === 0
                    ? "—"
                    : `${((split.core / totalRisk) * 100).toFixed(1)}% of portfolio`
                }
              />
              <Kpi
                label="Satellite"
                value={<Sensitive>{thb(split.satellite)}</Sensitive>}
                sub={
                  totalRisk === 0
                    ? "—"
                    : `${((split.satellite / totalRisk) * 100).toFixed(1)}% of portfolio`
                }
              />
              <Kpi
                label="Safest sleeve"
                value={RISK_LABEL.safe_core ?? "—"}
                sub={<Sensitive>{thb(safest?.value ?? 0)}</Sensitive>}
              />
              <Kpi
                label="Riskiest sleeve"
                value={RISK_LABEL.higher_satellite ?? "—"}
                sub={<Sensitive>{thb(riskiest?.value ?? 0)}</Sensitive>}
              />
            </KpiGrid>
            <AllocationPane
              title="Risk mix"
              description="Safe core → higher satellite"
              data={byRisk}
              members={members.risk}
              centerLabel="Portfolio"
              centerValue={thb(totalRisk)}
              ariaLabel="Risk level allocation"
              drilldownTitle="Risk ladder"
            />
          </div>
        </TabsContent>

        <TabsContent value="currency">
          <div className="flex flex-col gap-5">
            <AllocationPane
              title="Currency exposure"
              description="Tracked balances only (THB banks + investment assets). FCD excluded"
              data={byCurrency}
              members={members.currency}
              centerLabel="Total"
              centerValue={thb(currencyTotal)}
              ariaLabel="Currency exposure allocation"
            />
            <FxRatesCard currencies={currencies} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllocationPane({
  title,
  description,
  data,
  members,
  centerLabel,
  centerValue,
  ariaLabel,
  outside,
  drilldownTitle = "Drilldown",
  drilldownDescription = "Select a slice to see holdings",
}: {
  title: string;
  description?: string;
  data: AllocationBucket[];
  members: Record<string, AllocationMember[]>;
  centerLabel: string;
  centerValue: string;
  ariaLabel: string;
  outside?: AllocationBucket[];
  drilldownTitle?: string;
  drilldownDescription?: string;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const drilldownRef = useRef<HTMLDivElement>(null);
  const visibleOutside = (outside ?? []).filter((row) => row.value > 0);

  const toggle = (key: string) => {
    setSelectedKey((current) => (current === key ? null : key));
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    drilldownRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card>
        <CardHeader>
          {description ? (
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          ) : (
            <CardTitle>{title}</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <Donut
            data={data}
            size={220}
            thickness={26}
            centerLabel={centerLabel}
            centerValue={centerValue}
            valueFormatter={thb}
            ariaLabel={ariaLabel}
            outside={visibleOutside}
            selectedKey={selectedKey}
            onSelect={toggle}
          />
        </CardContent>
      </Card>
      <div ref={drilldownRef}>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{drilldownTitle}</CardTitle>
              <CardDescription>{drilldownDescription}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HBars
              data={data}
              valueFmt={(v) => thb(v)}
              showPercent
              selectedKey={selectedKey}
              onSelect={toggle}
              members={members}
              outside={visibleOutside}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FxRatesCard({ currencies }: { currencies: CurrencyDisplayRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FX rates</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]">
                Currency
              </th>
              <th className="border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]">
                Variant
              </th>
              <th className="border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]">
                THB
              </th>
              <th className="border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]">
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
              <tr key={c.id} className="hover:bg-[var(--hover)]">
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
  );
}
