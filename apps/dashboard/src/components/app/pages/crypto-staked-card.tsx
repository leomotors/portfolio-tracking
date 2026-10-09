"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Chip } from "@/components/app/chip";
import { EditableNumber } from "@/components/app/editable-number";
import { Sensitive } from "@/components/app/sensitive";
import { Sparkline } from "@/components/app/sparkline";
import { Stale } from "@/components/app/stale";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateStakedApy,
  updateStakedCurrent,
  updateStakedDeposited,
  updateStakedReceipt,
} from "@/lib/db/actions";
import { type StakedDailyPoint, type StakedPosition } from "@/lib/db/queries";
import {
  amountDecimals,
  fmtAmount,
  num,
  pct,
  thb,
} from "@/lib/portfolio/format";
import {
  effectiveApy,
  STAKING_PROVIDER_LABEL,
  STAKING_SOURCE_LABEL,
  sumStakingDaily,
  timeWeightedApy,
} from "@/lib/portfolio/staking";
import { cn } from "@/lib/utils";

export interface StakedMemberStat {
  position: StakedPosition;
  accountName: string;
  value: number | null;
  earned: number;
  earnedThb: number | null;
}

export interface StakedGroupStat {
  members: StakedMemberStat[];
  deposited: number;
  current: number;
  /** Summed receipt balance; null for native staking (no receipt token) */
  receiptAmount: number | null;
  stakedSince: string | null;
  value: number | null;
  earned: number;
  earnedThb: number | null;
  apy: number | null;
  apyMethod: "twr" | "simple" | null;
  spark: { value: number }[];
}

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);

const sumNullable = (values: (number | null)[]) =>
  values.every((v) => v == null) ? null : sum(values.map((v) => v ?? 0));

export function buildStakedGroupStat(
  members: StakedPosition[],
  dailyByPosition: Map<number, StakedDailyPoint[]>,
  fx: (currencyId: number | null) => number,
  accountName: (accountId: number | null) => string,
): StakedGroupStat {
  const memberStats = members.map((p): StakedMemberStat => {
    const thbPerUnit =
      p.currentPrice == null ? null : p.currentPrice * fx(p.currencyId);
    const earned = p.currentUnderlying - p.depositedUnderlying;
    return {
      position: p,
      accountName: accountName(p.investmentAccountId),
      value: thbPerUnit == null ? null : p.currentUnderlying * thbPerUnit,
      earned,
      earnedThb: thbPerUnit == null ? null : earned * thbPerUnit,
    };
  });

  const deposited = sum(members.map((p) => p.depositedUnderlying));
  const current = sum(members.map((p) => p.currentUnderlying));
  const stakedSince =
    members
      .map((p) => p.stakedSince)
      .filter((d) => d != null)
      .sort()[0] ?? null;
  const daily = sumStakingDaily(
    members.map((p) => dailyByPosition.get(p.id) ?? []),
  );

  // Time-weighted APY from daily snapshots (immune to deposits/withdrawals);
  // falls back to the simple approximation until enough history exists.
  const twr = timeWeightedApy(daily);
  const apy = twr ?? effectiveApy(deposited, current, stakedSince);

  return {
    members: memberStats,
    deposited,
    current,
    receiptAmount: sumNullable(members.map((p) => p.receiptAmount)),
    stakedSince,
    value: sumNullable(memberStats.map((m) => m.value)),
    earned: current - deposited,
    earnedThb: sumNullable(memberStats.map((m) => m.earnedThb)),
    apy,
    apyMethod: twr != null ? "twr" : apy != null ? "simple" : null,
    spark: daily
      .slice(-90)
      .map((d) => ({ value: d.currentUnderlying - d.depositedUnderlying })),
  };
}

export function StakedGroupCard({ stat }: { stat: StakedGroupStat }) {
  const [showAccounts, setShowAccounts] = useState(false);
  const { members, value, earned, earnedThb, apy, apyMethod, spark } = stat;
  const first = members[0]!.position;
  const single = members.length === 1 ? first : null;
  const unit = first.underlyingSymbol;
  const earnedPct = stat.deposited > 0 ? earned / stat.deposited : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-[14px] font-semibold">{first.name}</div>
            <div className="flex flex-wrap gap-1">
              <Chip
                label={STAKING_PROVIDER_LABEL[first.provider] ?? first.provider}
              />
              <Chip label={unit} />
              {!single && <Chip label={`${members.length} accounts`} />}
            </div>
            {stat.receiptAmount != null && (
              <div className="num text-[12px] text-[var(--ink-3)]">
                Holding:{" "}
                {single ? (
                  <EditableNumber
                    value={stat.receiptAmount}
                    prefix=""
                    suffix={` ${first.receiptSymbol ?? "shares"}`}
                    decimals={8}
                    onSave={(v) => updateStakedReceipt(single.id, v)}
                    ariaLabel={`Edit receipt balance for ${first.name}`}
                  />
                ) : (
                  <Sensitive>
                    {num(stat.receiptAmount, 8)}{" "}
                    {first.receiptSymbol ?? "shares"}
                  </Sensitive>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="num text-[20px] font-semibold tracking-[-0.01em]">
              {value == null ? "—" : <Sensitive>{thb(value)}</Sensitive>}
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
          <AmountField
            label="Deposited"
            value={stat.deposited}
            unit={unit}
            onSave={single && ((v) => updateStakedDeposited(single.id, v))}
            ariaLabel={`Edit deposited amount for ${first.name}`}
          />
          <AmountField
            label="Current"
            value={stat.current}
            unit={unit}
            onSave={single && ((v) => updateStakedCurrent(single.id, v))}
            ariaLabel={`Edit current amount for ${first.name}`}
          />
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
              <Sensitive>{fmtAmount(earned, unit)}</Sensitive>
              {earnedPct != null && (
                <span className="ml-1.5 text-[11px] opacity-85">
                  {pct(earnedPct)}
                </span>
              )}
            </div>
            {earnedThb != null && (
              <div className="num text-[11px] text-[var(--ink-3)]">
                <Sensitive>{thb(earnedThb)}</Sensitive>
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
              stat.stakedSince && (
                <div className="text-[11px] text-[var(--ink-3)]">
                  since{" "}
                  {new Date(stat.stakedSince + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { year: "numeric", month: "short" },
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {!single && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              aria-expanded={showAccounts}
              onClick={() => setShowAccounts((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-[var(--radius)] px-1.5 py-1 text-[12px] font-medium text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
            >
              <ChevronDown
                aria-hidden
                size={14}
                strokeWidth={2.25}
                className={cn(
                  "shrink-0 text-[var(--ink-3)] transition-transform duration-200 ease-out motion-reduce:transition-none",
                  showAccounts && "rotate-180",
                )}
              />
              By account
            </button>
            {showAccounts &&
              members.map((m) => (
                <AccountBreakdownRow key={m.position.id} member={m} />
              ))}
          </div>
        )}

        <SyncFooter members={members.map((m) => m.position)} />
      </CardContent>
    </Card>
  );
}

function AmountField({
  label,
  value,
  unit,
  onSave,
  ariaLabel,
  small,
}: {
  label: string;
  value: number;
  unit: string;
  /** Falsy renders a read-only sum (grouped card totals) */
  onSave: ((value: number) => Promise<void>) | null | false;
  ariaLabel: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "text-[var(--ink-3)]",
          small ? "text-[11px]" : "text-[12px]",
        )}
      >
        {label}
      </div>
      <div
        className={cn("num font-medium", small ? "text-[12px]" : "text-[15px]")}
      >
        {onSave ? (
          <EditableNumber
            value={value}
            prefix=""
            suffix={` ${unit}`}
            decimals={amountDecimals(value)}
            onSave={onSave}
            ariaLabel={ariaLabel}
          />
        ) : (
          <Sensitive>{fmtAmount(value, unit)}</Sensitive>
        )}
      </div>
    </div>
  );
}

function AccountBreakdownRow({ member }: { member: StakedMemberStat }) {
  const { position, accountName, value } = member;
  const unit = position.underlyingSymbol;
  const label = `${position.name} (${accountName})`;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--hairline-2)] px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium">{accountName}</span>
        <span className="num text-[13px] font-medium">
          {value == null ? "—" : <Sensitive>{thb(value)}</Sensitive>}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
        {position.receiptAmount != null && (
          <AmountField
            label="Holding"
            value={position.receiptAmount}
            unit={position.receiptSymbol ?? "shares"}
            onSave={(v) => updateStakedReceipt(position.id, v)}
            ariaLabel={`Edit receipt balance for ${label}`}
            small
          />
        )}
        <AmountField
          label="Deposited"
          value={position.depositedUnderlying}
          unit={unit}
          onSave={(v) => updateStakedDeposited(position.id, v)}
          ariaLabel={`Edit deposited amount for ${label}`}
          small
        />
        <AmountField
          label="Current"
          value={position.currentUnderlying}
          unit={unit}
          onSave={(v) => updateStakedCurrent(position.id, v)}
          ariaLabel={`Edit current amount for ${label}`}
          small
        />
      </div>
    </div>
  );
}

function SyncFooter({ members }: { members: StakedPosition[] }) {
  const first = members[0]!;
  const sources = new Set(members.map((p) => p.syncSource));
  const source = sources.size === 1 ? first.syncSource : "mixed";
  // Oldest sync, so a lagging member still trips the stale marker.
  const syncedAt = members.some((p) => p.syncedAt == null)
    ? null
    : members
        .map((p) => new Date(p.syncedAt!))
        .reduce((a, b) => (a < b ? a : b));
  const errors = members
    .filter((p) => p.syncError)
    .map((p) =>
      members.length === 1 ? p.syncError : `${p.name}: ${p.syncError}`,
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--hairline-2)] pt-3 text-[11px] text-[var(--ink-3)]">
      <Chip
        label={
          source == null
            ? "never synced"
            : (STAKING_SOURCE_LABEL[source] ?? source)
        }
        color={source === "chain" ? "var(--accent-pos)" : undefined}
      />
      <span className="inline-flex items-center">
        <span>
          synced{" "}
          {syncedAt
            ? syncedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "never"}
        </span>
        <Stale date={syncedAt} />
      </span>
      <span className="inline-flex items-center gap-1">
        proj. APY
        <EditableNumber
          value={(first.projectedApy ?? 0) * 100}
          prefix=""
          suffix="%"
          decimals={2}
          sensitive={false}
          onSave={async (v) => {
            await Promise.all(
              members.map((p) => updateStakedApy(p.id, v / 100)),
            );
          }}
          ariaLabel={`Edit projected APY for ${first.name}`}
        />
      </span>
      {errors.length > 0 && (
        <span
          title={errors.join("\n")}
          className="inline-flex items-center gap-1 text-[var(--accent-neg)]"
        >
          <AlertTriangle size={11} strokeWidth={2.5} />
          sync error
        </span>
      )}
    </div>
  );
}
