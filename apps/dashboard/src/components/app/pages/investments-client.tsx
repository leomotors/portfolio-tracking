"use client";

import { useMemo, useState } from "react";

const DUST_THRESHOLD = 0.005;

import { AreaChart } from "@/components/app/area-chart";
import { Chip } from "@/components/app/chip";
import { Delta } from "@/components/app/delta";
import { Donut } from "@/components/app/donut";
import { EditableNumber } from "@/components/app/editable-number";
import { PageHeader } from "@/components/app/page-header";
import { Sparkline } from "@/components/app/sparkline";
import { Stale } from "@/components/app/stale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateAssetAmount,
  updateAssetAverageCost,
  updateInvestmentAccountCost,
} from "@/lib/db/actions";
import {
  type Asset,
  type InvestmentAccount,
  type InvestmentDailyPoint,
} from "@/lib/db/queries";
import { byAssetClass, type CurrencyRow } from "@/lib/portfolio/aggregate";
import {
  CLASS_COLOR,
  CLASS_LABEL,
  RISK_COLOR,
  RISK_LABEL,
} from "@/lib/portfolio/colors";
import { num, pct, thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

interface InvestmentsClientProps {
  accounts: InvestmentAccount[];
  daily: InvestmentDailyPoint[];
  assets: Asset[];
  currencies: CurrencyRow[];
  initialAccountId?: number;
}

export function InvestmentsClient({
  accounts,
  daily,
  assets,
  currencies,
  initialAccountId,
}: InvestmentsClientProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAccountId ?? accounts[0]?.id ?? null,
  );

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          kicker="Investments"
          title="Accounts & positions"
          sub="No investment accounts yet."
        />
        <Card>
          <CardContent>
            <p className="text-[13px] text-[var(--ink-2)]">
              Add an investment account to{" "}
              <code className="num">@repo/database</code> to see it here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const focused = accounts.find((a) => a.id === selectedId) ?? accounts[0]!;

  const accSpark = (id: number) =>
    daily
      .filter((d) => d.accountId === id)
      .slice(-90)
      .map((d) => ({ value: d.value }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Investments"
        title="Accounts & positions"
        sub={`${accounts.length} accounts · ${assets.length} positions`}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-1.5 lg:sticky lg:top-20">
          {accounts.map((a) => {
            const spark = accSpark(a.id);
            const pl = a.currentValue - a.currentCost;
            const plPct = a.currentCost === 0 ? 0 : pl / a.currentCost;
            const sel = a.id === focused.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  "flex flex-col gap-2 rounded-[var(--radius)] border bg-[var(--surface)] p-3.5 text-left transition-colors hover:bg-[var(--surface-2)]",
                  sel
                    ? "border-[var(--ink)] [[data-theme='dark']_&]:border-[var(--ink-2)]"
                    : "border-[var(--hairline)]",
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[13px] font-semibold">{a.name}</div>
                    <div className="num text-[11px] text-[var(--ink-3)]">
                      {a.accountNo}
                    </div>
                  </div>
                  <Sparkline
                    data={spark}
                    width={70}
                    height={22}
                    accent={pl >= 0 ? "var(--accent-pos)" : "var(--accent-neg)"}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="num text-[15px] font-medium">
                    {thb(a.currentValue)}
                  </span>
                  <Delta value={pl} pct={plPct} mini />
                </div>
                {a.investmentTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.investmentTypes.map((t) => (
                      <Chip key={t} label={t.replace(/_/g, " ")} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </aside>

        <AccountDetail
          account={focused}
          daily={daily.filter((d) => d.accountId === focused.id)}
          assets={assets.filter((a) => a.investmentAccountId === focused.id)}
          currencies={currencies}
        />
      </div>
    </div>
  );
}

function AccountDetail({
  account,
  daily,
  assets,
  currencies,
}: {
  account: InvestmentAccount;
  daily: InvestmentDailyPoint[];
  assets: Asset[];
  currencies: CurrencyRow[];
}) {
  const series = useMemo(
    () => daily.slice(-180).map((d) => ({ date: d.date, value: d.value })),
    [daily],
  );
  const pl = account.currentValue - account.currentCost;
  const plPct = account.currentCost === 0 ? 0 : pl / account.currentCost;
  const classBreak = useMemo(
    () => byAssetClass(assets, currencies),
    [assets, currencies],
  );

  const cById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );

  // Precompute THB value per position once; sort by value desc and
  // hide dust positions (value < ~1 satang) behind a toggle.
  const sortedPositions = useMemo(() => {
    return assets
      .map((p) => {
        const cur = cById.get(p.currencyId);
        const fx = cur?.valueInTHB ?? 1;
        const native = cur?.symbol ?? "THB";
        const valueThb = p.amount * p.currentPrice * fx;
        const costThb = p.amount * p.averageCost * fx;
        return { p, native, valueThb, costThb };
      })
      .sort((a, b) => b.valueThb - a.valueThb);
  }, [assets, cById]);

  const [showDust, setShowDust] = useState(false);
  const dustCount = sortedPositions.filter(
    (r) => r.valueThb < DUST_THRESHOLD,
  ).length;
  const visiblePositions = showDust
    ? sortedPositions
    : sortedPositions.filter((r) => r.valueThb >= DUST_THRESHOLD);

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1 pb-2 pt-1">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
            {account.accountNo}
          </div>
          <h2 className="m-0 mt-1 text-[24px] font-semibold tracking-[-0.02em]">
            {account.name}
          </h2>
          <div className="mt-1 text-[12px] text-[var(--ink-3)]">
            {account.openedAt
              ? `opened ${new Date(account.openedAt + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short" })}`
              : ""}
            {account.investmentTypes.length > 0 &&
              ` · ${account.investmentTypes.join(", ").replace(/_/g, " ")}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <div className="num text-[40px] leading-none font-semibold tracking-[-0.02em]">
            {thb(account.currentValue)}
          </div>
          <Delta value={pl} pct={plPct} />
          <div className="text-[11px] text-[var(--ink-3)]">
            cost{" "}
            <EditableNumber
              value={account.currentCost}
              onSave={(v) => updateInvestmentAccountCost(account.id, v)}
              ariaLabel={`Edit cost basis for ${account.name}`}
            />
          </div>
        </div>
      </div>

      <Card className="px-3 py-2">
        <AreaChart
          data={series}
          height={200}
          accent={pl >= 0 ? "var(--accent-pos)" : "var(--accent-neg)"}
          formatY={(v) => thb(v)}
          formatX={(p) =>
            new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
        />
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              data={classBreak}
              size={160}
              thickness={16}
              centerLabel={`${assets.length} assets`}
              centerValue={thb(account.currentValue)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-7 gap-y-4">
              <Stat label="P/L" value={thb(pl)} large />
              <Stat label="Return" value={pct(plPct)} large />
              <Stat label="Cost basis" value={thb(account.currentCost)} />
              <Stat label="Mark" value={thb(account.currentValue)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Positions</CardTitle>
            <CardDescription>
              Click a value to edit · stale prices flagged · sorted by value
            </CardDescription>
          </div>
          {dustCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDust((v) => !v)}
              className="cursor-pointer rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
            >
              {showDust
                ? `Hide ${dustCount} zero-value`
                : `Show all (${dustCount} zero-value hidden)`}
            </button>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr>
                <Th>Asset</Th>
                <Th>Class</Th>
                <Th>Risk</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Avg cost</Th>
                <Th align="right">Price</Th>
                <Th align="right">Value (THB)</Th>
                <Th align="right">P/L</Th>
              </tr>
            </thead>
            <tbody>
              {visiblePositions.map(({ p, native, valueThb, costThb }) => {
                const aPl = valueThb - costThb;
                const aPlPct = costThb === 0 ? 0 : aPl / costThb;
                return (
                  <tr key={p.id} className="hover:bg-[var(--hover)]">
                    <Td>
                      <div className="flex flex-col">
                        <span className="num text-[12px] font-semibold">
                          {p.symbol ?? "—"}
                        </span>
                        <span className="text-[12px] text-[var(--ink-3)]">
                          {p.name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Chip
                        label={CLASS_LABEL[p.assetClass] ?? p.assetClass}
                        color={CLASS_COLOR[p.assetClass]}
                      />
                    </Td>
                    <Td>
                      <Chip
                        label={RISK_LABEL[p.riskLevel] ?? p.riskLevel}
                        color={RISK_COLOR[p.riskLevel]}
                      />
                    </Td>
                    <Td align="right">
                      <EditableNumber
                        value={p.amount}
                        prefix=""
                        suffix={` ${p.unit}`}
                        decimals={p.amount < 1 ? 4 : 2}
                        onSave={(v) => updateAssetAmount(p.id, v)}
                        ariaLabel={`Edit amount for ${p.name}`}
                      />
                    </Td>
                    <Td align="right">
                      <EditableNumber
                        value={p.averageCost}
                        prefix=""
                        decimals={2}
                        onSave={(v) => updateAssetAverageCost(p.id, v)}
                        ariaLabel={`Edit average cost for ${p.name}`}
                      />
                      {native !== "THB" && (
                        <div className="num text-[11px] text-[var(--ink-3)]">
                          {native}
                        </div>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="num">
                        {num(p.currentPrice, 2)}
                        {p.assetClass !== "cash" && (
                          <Stale date={p.priceUpdatedAt} />
                        )}
                      </span>
                      {native !== "THB" && (
                        <div className="num text-[11px] text-[var(--ink-3)]">
                          {native}
                        </div>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="num">{thb(valueThb)}</span>
                    </Td>
                    <Td align="right">
                      <Delta value={aPl} pct={aPlPct} mini />
                    </Td>
                  </tr>
                );
              })}
              {visiblePositions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-[12px] text-[var(--ink-3)]"
                  >
                    {assets.length === 0
                      ? "No positions in this account."
                      : `All ${dustCount} positions are zero-value. Click "Show all" above.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[12px] text-[var(--ink-3)]">{label}</div>
      <div
        className={cn(
          "num font-medium tracking-[-0.01em]",
          large ? "text-[28px]" : "text-[20px]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--hairline-2)] px-4 py-3 align-middle",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </td>
  );
}
