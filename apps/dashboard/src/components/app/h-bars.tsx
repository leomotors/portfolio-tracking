"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Sensitive } from "@/components/app/sensitive";
import { type AllocationMember } from "@/lib/portfolio/aggregate";
import { cn } from "@/lib/utils";

interface HBarRow {
  key?: string;
  label: string;
  value: number;
  color?: string;
}

interface HBarsProps {
  data: HBarRow[];
  max?: number;
  valueFmt?: (v: number) => string;
  emptyLabel?: string;
  /** Show each row's share of the series total next to the value. */
  showPercent?: boolean;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  members?: Record<string, AllocationMember[]>;
  outside?: HBarRow[];
  outsideLabel?: string;
}

const MEMBER_PREVIEW = 8;

export function HBars({
  data,
  max,
  valueFmt,
  emptyLabel = "No data",
  showPercent = false,
  selectedKey = null,
  onSelect,
  members,
  outside = [],
  outsideLabel = "Not in chart",
}: HBarsProps) {
  if (data.length === 0 && outside.length === 0) {
    return <div className="text-[12px] text-[var(--ink-3)]">{emptyLabel}</div>;
  }
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const visibleOutside = outside.filter((row) => row.value > 0);

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d, i) => (
        <BarRow
          key={rowKey(d, i)}
          row={d}
          rowKey={rowKey(d, i)}
          max={m}
          total={total}
          valueFmt={valueFmt}
          showPercent={showPercent}
          selected={selectedKey === rowKey(d, i)}
          onSelect={onSelect}
          members={members?.[rowKey(d, i)]}
        />
      ))}
      {visibleOutside.length > 0 && (
        <div className="flex flex-col gap-3.5 border-t border-[var(--hairline)] pt-3.5">
          <span className="text-[11px] font-medium tracking-[0.04em] text-[var(--ink-3)] uppercase">
            {outsideLabel}
          </span>
          {visibleOutside.map((d, i) => (
            <BarRow
              key={rowKey(d, i)}
              row={d}
              rowKey={rowKey(d, i)}
              max={m}
              total={d.value}
              valueFmt={valueFmt}
              showPercent={false}
              selected={selectedKey === rowKey(d, i)}
              onSelect={onSelect}
              members={members?.[rowKey(d, i)]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BarRow({
  row,
  rowKey: key,
  max,
  total,
  valueFmt,
  showPercent,
  selected,
  onSelect,
  members,
}: {
  row: HBarRow;
  rowKey: string;
  max: number;
  total: number;
  valueFmt?: (v: number) => string;
  showPercent: boolean;
  selected: boolean;
  onSelect?: (key: string) => void;
  members?: AllocationMember[];
}) {
  const frac = total === 0 ? 0 : row.value / total;
  const interactive = Boolean(onSelect);
  const inner = (
    <>
      <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-[var(--ink-2)]">
          {interactive && (
            <ChevronDown
              aria-hidden
              size={14}
              strokeWidth={2.25}
              className={cn(
                "shrink-0 text-[var(--ink-3)] transition-transform duration-200 ease-out motion-reduce:transition-none",
                selected && "rotate-180",
              )}
            />
          )}
          <span className="truncate">{row.label}</span>
        </span>
        <span className="flex shrink-0 items-baseline justify-end gap-2">
          <Sensitive className="num text-[var(--ink)]">
            {valueFmt ? valueFmt(row.value) : row.value}
          </Sensitive>
          {showPercent && (
            <span className="num min-w-[4.8ch] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-right text-[11px] font-medium text-[var(--ink)]">
              {(frac * 100).toFixed(1)}%
            </span>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--track)]">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: `${max === 0 ? 0 : (row.value / max) * 100}%`,
            background: row.color ?? "var(--accent-pri)",
          }}
        />
      </div>
    </>
  );

  return (
    <div>
      {interactive ? (
        <button
          type="button"
          aria-expanded={selected}
          onClick={() => onSelect?.(key)}
          className={cn(
            "w-full cursor-pointer rounded-[var(--radius)] text-left transition-colors duration-150",
            "hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
            selected && "bg-[var(--surface-2)]",
          )}
        >
          <div className="rounded-[var(--radius)] px-1.5 py-1">{inner}</div>
        </button>
      ) : (
        <div className="rounded-[var(--radius)]">{inner}</div>
      )}
      {selected && (
        <MemberList
          key={key}
          members={members ?? []}
          bucketValue={row.value}
          color={row.color ?? "var(--accent-pri)"}
          valueFmt={valueFmt}
        />
      )}
    </div>
  );
}

function MemberList({
  members,
  bucketValue,
  color,
  valueFmt,
}: {
  members: AllocationMember[];
  bucketValue: number;
  color: string;
  valueFmt?: (v: number) => string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (members.length === 0) {
    return (
      <p className="mt-2 px-1.5 text-[12px] text-[var(--ink-3)]">
        No underlying rows
      </p>
    );
  }
  const hidden = members.length - MEMBER_PREVIEW;
  const visible =
    showAll || hidden <= 0 ? members : members.slice(0, MEMBER_PREVIEW);

  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-[var(--hairline)] pt-2">
      {visible.map((member) => {
        const share = bucketValue === 0 ? 0 : member.value / bucketValue;
        return (
          <div
            key={member.key}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 px-1.5 py-1 text-[12px]"
          >
            <span
              className="mt-[3px] h-1.5 w-1.5 rounded-[2px] shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.08)]"
              style={{ background: color }}
            />
            <div className="min-w-0">
              <div className="truncate text-[var(--ink)]">{member.label}</div>
              {member.sublabel && (
                <div className="truncate text-[11px] text-[var(--ink-3)]">
                  {member.sublabel}
                </div>
              )}
            </div>
            <span className="flex shrink-0 items-baseline justify-end gap-2">
              <Sensitive className="num text-[11px] text-[var(--ink-2)]">
                {valueFmt ? valueFmt(member.value) : member.value}
              </Sensitive>
              <span className="num min-w-[4.8ch] rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-right text-[11px] font-medium text-[var(--ink)]">
                {(share * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        );
      })}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
          className="mt-0.5 cursor-pointer rounded-[var(--radius)] px-1.5 py-1.5 text-left text-[12px] font-medium text-[var(--ink-2)] hover:bg-[var(--hover)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
        >
          {showAll ? "Show less" : `Show all (${members.length})`}
        </button>
      )}
    </div>
  );
}

function rowKey(row: HBarRow, index: number) {
  return row.key ?? row.label ?? String(index);
}
