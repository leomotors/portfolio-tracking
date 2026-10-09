"use client";

import { useMemo } from "react";

import { AssetSymbol } from "@/components/app/address";
import { Chip } from "@/components/app/chip";
import { Delta } from "@/components/app/delta";
import { Donut } from "@/components/app/donut";
import { PageHeader } from "@/components/app/page-header";
import {
  buildStakedGroupStat,
  StakedGroupCard,
} from "@/components/app/pages/crypto-staked-card";
import { Sensitive } from "@/components/app/sensitive";
import { Stale } from "@/components/app/stale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type Asset,
  type InvestmentAccount,
  type StakedDailyPoint,
  type StakedPosition,
} from "@/lib/db/queries";
import { type CurrencyRow } from "@/lib/portfolio/aggregate";
import { CURRENCY_PALETTE } from "@/lib/portfolio/colors";
import { fmtAmount, num, pct, thb } from "@/lib/portfolio/format";
import {
  groupStakedPositions,
  STAKING_PROVIDER_LABEL,
} from "@/lib/portfolio/staking";
import { cn } from "@/lib/utils";

interface CryptoClientProps {
  staked: StakedPosition[];
  stakedDaily: StakedDailyPoint[];
  assets: Asset[];
  currencies: CurrencyRow[];
  accounts: InvestmentAccount[];
}

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
        .filter(
          (a) =>
            (a.symbolType === "cryptocurrency" ||
              a.symbolType === "hyperliquid_vault") &&
            a.amount > 0,
        )
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

  const stakedStats = groupStakedPositions(staked).map((members) =>
    buildStakedGroupStat(
      members,
      dailyByPosition,
      fx,
      (accountId) =>
        (accountId == null ? undefined : accountNameById.get(accountId)) ??
        "Unlinked",
    ),
  );

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Crypto"
        title="Staking & holdings"
        sub={`${stakedStats.length} staked positions · ${cryptoAssets.length} crypto assets`}
      />

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-7 gap-y-4 md:grid-cols-4">
            <Stat
              label="Total crypto"
              value={<Sensitive>{thb(totalCryptoThb)}</Sensitive>}
              large
            />
            <Stat
              label="In staking"
              value={<Sensitive>{thb(stakedValueThb)}</Sensitive>}
              sub={
                totalCryptoThb > 0
                  ? `${((stakedValueThb / totalCryptoThb) * 100).toFixed(1)}% of crypto`
                  : undefined
              }
              large
            />
            <Stat
              label="Earned to date"
              value={<Sensitive>{thb(earnedThbTotal)}</Sensitive>}
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
            <StakedGroupCard key={r.members[0]!.position.id} stat={r} />
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
                            <AssetSymbol symbol={asset.symbol} />
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
                          <Sensitive>
                            {fmtAmount(asset.amount, asset.unit)}
                          </Sensitive>
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
                        <span className="num">
                          <Sensitive>{thb(valueThb)}</Sensitive>
                        </span>
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

function Stat({
  label,
  value,
  sub,
  large,
  positive,
}: {
  label: string;
  value: React.ReactNode;
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
