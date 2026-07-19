"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

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
  updateStakedApy,
  updateStakedCurrent,
  updateStakedDeposited,
  updateStakedReceipt,
} from "@/lib/db/actions";
import {
  type Asset,
  type InvestmentAccount,
  type StakedDailyPoint,
  type StakedPosition,
} from "@/lib/db/queries";
import { type CurrencyRow } from "@/lib/portfolio/aggregate";
import { CURRENCY_PALETTE } from "@/lib/portfolio/colors";
import { num, pct, thb } from "@/lib/portfolio/format";
import {
  effectiveApy,
  STAKING_PROVIDER_LABEL,
  STAKING_SOURCE_LABEL,
  timeWeightedApy,
} from "@/lib/portfolio/staking";
import { cn } from "@/lib/utils";

interface CryptoClientProps {
  staked: StakedPosition[];
  stakedDaily: StakedDailyPoint[];
  assets: Asset[];
  currencies: CurrencyRow[];
  accounts: InvestmentAccount[];
}

const amountDecimals = (v: number) => (v !== 0 && Math.abs(v) < 1 ? 6 : 4);

const fmtAmount = (v: number, unit: string) =>
  `${num(v, amountDecimals(v))} ${unit}`;

export function CryptoClient({
  staked,
  stakedDaily,
  assets,
  currencies,
  accounts,
}: CryptoClientProps) {
  const fxById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const fx = (currencyId: number | null) =>
    currencyId == null ? 1 : (fxById.get(currencyId)?.valueInTHB ?? 1);

  const accountNameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  const cryptoAssets = useMemo(
    () =>
      assets
        .filter((a) => a.symbolType === "cryptocurrency" && a.amount > 0)
        .map((a) => {
          const rate = fxById.get(a.currencyId)?.valueInTHB ?? 1;
          return {
            asset: a,
            native: fxById.get(a.currencyId)?.symbol ?? "THB",
            valueThb: a.amount * a.currentPrice * rate,
            costThb: a.amount * a.averageCost * rate,
          };
        })
        .sort((a, b) => b.valueThb - a.valueThb),
    [assets, fxById],
  );

  const stakedByAssetId = useMemo(
    () =>
      new Map(
        staked.filter((p) => p.assetId != null).map((p) => [p.assetId!, p]),
      ),
    [staked],
  );

  const totalCryptoThb = cryptoAssets.reduce((s, r) => s + r.valueThb, 0);

  const dailyByPosition = useMemo(() => {
    const byId = new Map<number, StakedDailyPoint[]>();
    for (const point of stakedDaily) {
      const list = byId.get(point.stakedPositionId);
      if (list) list.push(point);
      else byId.set(point.stakedPositionId, [point]);
    }
    return byId;
  }, [stakedDaily]);

  const stakedStats = staked.map((p) => {
    const value =
      p.currentPrice == null
        ? null
        : p.currentUnderlying * p.currentPrice * fx(p.currencyId);
    const earned = p.currentUnderlying - p.depositedUnderlying;
    const earnedThb =
      p.currentPrice == null
        ? null
        : earned * p.currentPrice * fx(p.currencyId);
    // Time-weighted APY from daily snapshots (immune to deposits/withdrawals);
    // falls back to the simple approximation until enough history exists.
    const twr = timeWeightedApy(dailyByPosition.get(p.id) ?? []);
    const apy =
      twr ??
      effectiveApy(p.depositedUnderlying, p.currentUnderlying, p.stakedSince);
    const apyMethod: "twr" | "simple" | null =
      twr != null ? "twr" : apy != null ? "simple" : null;
    return { position: p, value, earned, earnedThb, apy, apyMethod };
  });

  const stakedValueThb = stakedStats.reduce((s, r) => s + (r.value ?? 0), 0);
  const earnedThbTotal = stakedStats.reduce(
    (s, r) => s + (r.earnedThb ?? 0),
    0,
  );

  const apyWeighted = stakedStats.filter(
    (r) => r.apy != null && r.value != null && r.value > 0,
  );
  const blendedApy =
    apyWeighted.length === 0
      ? null
      : apyWeighted.reduce((s, r) => s + r.apy! * r.value!, 0) /
        apyWeighted.reduce((s, r) => s + r.value!, 0);

  const tokenBuckets = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of cryptoAssets) {
      const key = r.asset.symbol ?? r.asset.unit;
      totals.set(key, (totals.get(key) ?? 0) + r.valueThb);
    }
    return Array.from(totals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], i) => ({
        key,
        label: key,
        value,
        color: CURRENCY_PALETTE[i % CURRENCY_PALETTE.length]!,
      }));
  }, [cryptoAssets]);

  const earnedSeries = (positionId: number) =>
    stakedDaily
      .filter((d) => d.stakedPositionId === positionId)
      .slice(-90)
      .map((d) => ({ value: d.currentUnderlying - d.depositedUnderlying }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Crypto"
        title="Staking & holdings"
        sub={`${staked.length} staked positions · ${cryptoAssets.length} crypto assets`}
      />

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-7 gap-y-4 md:grid-cols-4">
            <Stat label="Total crypto" value={thb(totalCryptoThb)} large />
            <Stat
              label="In staking"
              value={thb(stakedValueThb)}
              sub={
                totalCryptoThb > 0
                  ? `${((stakedValueThb / totalCryptoThb) * 100).toFixed(1)}% of crypto`
                  : undefined
              }
              large
            />
            <Stat
              label="Earned to date"
              value={thb(earnedThbTotal)}
              positive={earnedThbTotal >= 0}
              large
            />
            <Stat
              label="Blended eff. APY"
              value={blendedApy == null ? "—" : pct(blendedApy)}
              large
            />
          </div>
        </CardContent>
      </Card>

      {staked.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-[13px] text-[var(--ink-2)]">
              No staked positions yet. Add a{" "}
              <code className="num">staked_position</code> row in{" "}
              <code className="num">@repo/database</code> to start tracking
              staking yield.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {stakedStats.map((r) => (
            <StakedPositionCard
              key={r.position.id}
              stat={r}
              spark={earnedSeries(r.position.id)}
            />
          ))}
        </div>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Positions</CardTitle>
              <CardDescription>
                All crypto assets across accounts · sorted by value
              </CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Account</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">Value (THB)</Th>
                  <Th align="right">P/L</Th>
                </tr>
              </thead>
              <tbody>
                {cryptoAssets.map(({ asset, native, valueThb, costThb }) => {
                  const pl = valueThb - costThb;
                  const plPct = costThb === 0 ? 0 : pl / costThb;
                  const stakedPosition = stakedByAssetId.get(asset.id);
                  return (
                    <tr key={asset.id} className="hover:bg-[var(--hover)]">
                      <Td>
                        <div className="flex flex-col gap-1">
                          <span className="num text-[12px] font-semibold">
                            {asset.symbol ?? "—"}
                          </span>
                          <span className="text-[12px] text-[var(--ink-3)]">
                            {asset.name}
                          </span>
                          {stakedPosition && (
                            <Chip
                              label={`Staked · ${STAKING_PROVIDER_LABEL[stakedPosition.provider] ?? stakedPosition.provider}`}
                              color="var(--accent-pos)"
                              className="self-start"
                            />
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-[12px]">
                          {accountNameById.get(asset.investmentAccountId) ??
                            "—"}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="num">
                          {fmtAmount(asset.amount, asset.unit)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="num">
                          {num(asset.currentPrice, 2)}
                          <Stale date={asset.priceUpdatedAt} />
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
                        <Delta value={pl} pct={plPct} mini />
                      </Td>
                    </tr>
                  );
                })}
                {cryptoAssets.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-[12px] text-[var(--ink-3)]"
                    >
                      No crypto assets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              data={tokenBuckets}
              size={150}
              thickness={16}
              centerLabel={`${tokenBuckets.length} tokens`}
              centerValue={thb(totalCryptoThb)}
              valueFormatter={thb}
              ariaLabel="Crypto allocation by token"
              stacked
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StakedStat {
  position: StakedPosition;
  value: number | null;
  earned: number;
  earnedThb: number | null;
  apy: number | null;
  apyMethod: "twr" | "simple" | null;
}

function StakedPositionCard({
  stat,
  spark,
}: {
  stat: StakedStat;
  spark: { value: number }[];
}) {
  const { position, value, earned, earnedThb, apy, apyMethod } = stat;
  const unit = position.underlyingSymbol;
  const earnedPct =
    position.depositedUnderlying > 0
      ? earned / position.depositedUnderlying
      : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-[14px] font-semibold">{position.name}</div>
            <div className="flex flex-wrap gap-1">
              <Chip
                label={
                  STAKING_PROVIDER_LABEL[position.provider] ?? position.provider
                }
              />
              <Chip label={unit} />
            </div>
            {position.receiptAmount != null && (
              <div className="num text-[12px] text-[var(--ink-3)]">
                Holding:{" "}
                <EditableNumber
                  value={position.receiptAmount}
                  prefix=""
                  suffix={` ${position.receiptSymbol ?? "shares"}`}
                  decimals={8}
                  onSave={(v) => updateStakedReceipt(position.id, v)}
                  ariaLabel={`Edit receipt balance for ${position.name}`}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="num text-[20px] font-semibold tracking-[-0.01em]">
              {value == null ? "—" : thb(value)}
            </span>
            {spark.length > 1 && (
              <Sparkline
                data={spark}
                width={90}
                height={22}
                accent={earned >= 0 ? "var(--accent-pos)" : "var(--accent-neg)"}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-7 gap-y-3">
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-[var(--ink-3)]">Deposited</div>
            <div className="num text-[15px] font-medium">
              <EditableNumber
                value={position.depositedUnderlying}
                prefix=""
                suffix={` ${unit}`}
                decimals={amountDecimals(position.depositedUnderlying)}
                onSave={(v) => updateStakedDeposited(position.id, v)}
                ariaLabel={`Edit deposited amount for ${position.name}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-[var(--ink-3)]">Current</div>
            <div className="num text-[15px] font-medium">
              <EditableNumber
                value={position.currentUnderlying}
                prefix=""
                suffix={` ${unit}`}
                decimals={amountDecimals(position.currentUnderlying)}
                onSave={(v) => updateStakedCurrent(position.id, v)}
                ariaLabel={`Edit current amount for ${position.name}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-[var(--ink-3)]">Earned</div>
            <div
              className={cn(
                "num text-[15px] font-medium",
                earned >= 0
                  ? "text-[var(--accent-pos)]"
                  : "text-[var(--accent-neg)]",
              )}
            >
              {fmtAmount(earned, unit)}
              {earnedPct != null && (
                <span className="ml-1.5 text-[11px] opacity-85">
                  {pct(earnedPct)}
                </span>
              )}
            </div>
            {earnedThb != null && (
              <div className="num text-[11px] text-[var(--ink-3)]">
                {thb(earnedThb)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-[var(--ink-3)]">Effective APY</div>
            <div className="num text-[15px] font-medium">
              {apy == null ? "—" : pct(apy)}
            </div>
            {apyMethod === "twr" ? (
              <div className="text-[11px] text-[var(--ink-3)]">
                time-weighted
              </div>
            ) : (
              position.stakedSince && (
                <div className="text-[11px] text-[var(--ink-3)]">
                  since{" "}
                  {new Date(
                    position.stakedSince + "T00:00:00",
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--hairline-2)] pt-3 text-[11px] text-[var(--ink-3)]">
          <Chip
            label={
              position.syncSource == null
                ? "never synced"
                : (STAKING_SOURCE_LABEL[position.syncSource] ??
                  position.syncSource)
            }
            color={
              position.syncSource === "chain" ? "var(--accent-pos)" : undefined
            }
          />
          <span className="inline-flex items-center">
            <span>
              synced{" "}
              {position.syncedAt
                ? new Date(position.syncedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "never"}
            </span>
            <Stale date={position.syncedAt} />
          </span>
          <span className="inline-flex items-center gap-1">
            proj. APY
            <EditableNumber
              value={(position.projectedApy ?? 0) * 100}
              prefix=""
              suffix="%"
              decimals={2}
              onSave={(v) => updateStakedApy(position.id, v / 100)}
              ariaLabel={`Edit projected APY for ${position.name}`}
            />
          </span>
          {position.syncError && (
            <span
              title={position.syncError}
              className="inline-flex items-center gap-1 text-[var(--accent-neg)]"
            >
              <AlertTriangle size={11} strokeWidth={2.5} />
              sync error
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  large,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  large?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[12px] text-[var(--ink-3)]">{label}</div>
      <div
        className={cn(
          "num font-medium tracking-[-0.01em]",
          large ? "text-[24px]" : "text-[18px]",
          positive != null &&
            (positive
              ? "text-[var(--accent-pos)]"
              : "text-[var(--accent-neg)]"),
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--ink-3)]">{sub}</div>}
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
        "border-b border-[var(--hairline)] bg-[var(--surface-3)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-2)]",
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
        align === "right"
          ? "text-right text-[var(--ink)]"
          : "text-left text-[var(--ink-2)]",
      )}
    >
      {children}
    </td>
  );
}
