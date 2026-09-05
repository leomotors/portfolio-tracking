"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  formatChangePct,
  type HeatmapCell,
  heatmapClassLabel,
  layoutHeatmap,
} from "@repo/heatmap";

import { HeatmapTreemap } from "@/components/app/heatmap-treemap";
import { PageHeader } from "@/components/app/page-header";
import { Sensitive } from "@/components/app/sensitive";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type HeatmapDailySnapshot } from "@/lib/db/queries";
import { CLASS_LABEL } from "@/lib/portfolio/colors";
import { thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

type SortKey = "label" | "class" | "value" | "pnl" | "pct";

interface HeatmapClientProps {
  dates: string[];
  selectedDate: string | null;
  snapshot: HeatmapDailySnapshot | null;
}

function heatmapHref(date: string) {
  return `/heatmap?date=${date}`;
}

function formatLongDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function HeatmapClient({
  dates,
  selectedDate,
  snapshot,
}: HeatmapClientProps) {
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cells = snapshot?.cells ?? [];
  const classes = useMemo(() => {
    const seen = new Set<string>();
    for (const cell of cells) seen.add(cell.assetClass);
    return [...seen];
  }, [cells]);

  const rects = useMemo(() => {
    if (!snapshot || cells.length === 0) return [];
    return layoutHeatmap(cells, { colorScaleMax: snapshot.colorScaleMax });
  }, [cells, snapshot]);

  const sorted = useMemo(() => {
    const rows = classFilter
      ? cells.filter((cell) => cell.assetClass === classFilter)
      : cells;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "label") return dir * a.label.localeCompare(b.label);
      if (sortKey === "class")
        return dir * a.assetClass.localeCompare(b.assetClass);
      if (sortKey === "value") return dir * (a.value - b.value);
      if (sortKey === "pnl") return dir * (a.pnlDelta - b.pnlDelta);
      return dir * (Math.abs(a.changePct) - Math.abs(b.changePct));
    });
  }, [cells, classFilter, sortDir, sortKey]);

  const totalValue = cells.reduce((sum, cell) => sum + cell.value, 0);
  const totalPnl = cells.reduce((sum, cell) => sum + cell.pnlDelta, 0);

  const dateIndex = selectedDate ? dates.indexOf(selectedDate) : -1;
  const newerDate = dateIndex > 0 ? dates[dateIndex - 1] : null;
  const olderDate =
    dateIndex >= 0 && dateIndex < dates.length - 1
      ? dates[dateIndex + 1]
      : null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "label" || key === "class" ? "asc" : "desc");
  }

  if (!snapshot || !selectedDate) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          kicker="Heatmap"
          title="Day gain / loss"
          sub="Each cron run stores the same cell data used for the Discord PNG. History starts after the first successful persist."
        />
        <Card>
          <CardContent className="py-10">
            <p className="m-0 max-w-[56ch] text-[14px] leading-6 text-[var(--ink-2)]">
              No heatmap rows yet. After{" "}
              <span className="font-mono text-[13px]">heatmap_daily</span> is
              migrated and the daily cron completes, days will show up here with
              zoom and a full holding list.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker={formatLongDate(selectedDate)}
        title="Day gain / loss"
        sub="Same layout as the Discord PNG. Scroll to zoom, drag to pan, hover or use the table for every holding."
        right={
          <DateNav
            dates={dates}
            selectedDate={selectedDate}
            olderDate={olderDate}
            newerDate={newerDate}
          />
        }
      />

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px] text-[var(--ink-2)]">
        <span>
          {cells.length} holding{cells.length === 1 ? "" : "s"}
        </span>
        <span>
          Value{" "}
          <Sensitive className="num text-[var(--ink)]">
            {thb(totalValue)}
          </Sensitive>
        </span>
        <span
          className={cn(
            "num font-medium",
            totalPnl >= 0
              ? "text-[var(--accent-pos)]"
              : "text-[var(--accent-neg)]",
          )}
        >
          <Sensitive>{thb(totalPnl, { sign: true })}</Sensitive>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          active={classFilter == null}
          onClick={() => setClassFilter(null)}
        >
          All classes
        </FilterChip>
        {classes.map((key) => (
          <FilterChip
            key={key}
            active={classFilter === key}
            onClick={() =>
              setClassFilter((current) => (current === key ? null : key))
            }
          >
            {CLASS_LABEL[key] ?? heatmapClassLabel(key)}
          </FilterChip>
        ))}
      </div>

      <Card className="overflow-hidden bg-[#0d1117] p-0">
        <HeatmapTreemap
          rects={rects}
          title="Day Gain / Loss Heatmap"
          classFilter={classFilter}
          selectedId={selectedId}
          onSelect={(cell) =>
            setSelectedId((id) =>
              cell && cell.id === id ? null : (cell?.id ?? null),
            )
          }
        />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All holdings</CardTitle>
            <CardDescription>
              {sorted.length} of {cells.length} shown. Sort by magnitude to find
              moves the PNG hid.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-[11px] font-medium text-[var(--ink-3)]">
                <SortHeader
                  label="Holding"
                  active={sortKey === "label"}
                  dir={sortDir}
                  onClick={() => toggleSort("label")}
                />
                <SortHeader
                  label="Class"
                  active={sortKey === "class"}
                  dir={sortDir}
                  onClick={() => toggleSort("class")}
                />
                <SortHeader
                  label="Value"
                  active={sortKey === "value"}
                  dir={sortDir}
                  onClick={() => toggleSort("value")}
                  numeric
                />
                <SortHeader
                  label="Day P/L"
                  active={sortKey === "pnl"}
                  dir={sortDir}
                  onClick={() => toggleSort("pnl")}
                  numeric
                />
                <SortHeader
                  label="Day %"
                  active={sortKey === "pct"}
                  dir={sortDir}
                  onClick={() => toggleSort("pct")}
                  numeric
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((cell) => (
                <HeatmapRow
                  key={cell.id}
                  cell={cell}
                  selected={cell.id === selectedId}
                  onSelect={() =>
                    setSelectedId((id) => (id === cell.id ? null : cell.id))
                  }
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function DateNav({
  dates,
  selectedDate,
  olderDate,
  newerDate,
}: {
  dates: string[];
  selectedDate: string;
  olderDate: string | null | undefined;
  newerDate: string | null | undefined;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        asChild={olderDate != null}
        disabled={olderDate == null}
      >
        {olderDate ? (
          <Link href={heatmapHref(olderDate)} aria-label="Older heatmap">
            <ChevronLeft size={14} strokeWidth={2} />
            Older
          </Link>
        ) : (
          <span>
            <ChevronLeft size={14} strokeWidth={2} />
            Older
          </span>
        )}
      </Button>
      <label className="sr-only" htmlFor="heatmap-date">
        Heatmap date
      </label>
      <select
        id="heatmap-date"
        className="h-8 rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-[12px] text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]"
        value={selectedDate}
        onChange={(event) => {
          router.push(heatmapHref(event.target.value));
        }}
      >
        {dates.map((date) => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        asChild={newerDate != null}
        disabled={newerDate == null}
      >
        {newerDate ? (
          <Link href={heatmapHref(newerDate)} aria-label="Newer heatmap">
            Newer
            <ChevronRight size={14} strokeWidth={2} />
          </Link>
        ) : (
          <span>
            Newer
            <ChevronRight size={14} strokeWidth={2} />
          </span>
        )}
      </Button>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
          : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-2)] hover:text-[var(--ink)]",
      )}
    >
      {children}
    </button>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  numeric = false,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  numeric?: boolean;
}) {
  return (
    <th className={cn("px-5 py-2 font-medium", numeric && "text-right")}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pri)]",
          numeric && "ml-auto",
          active ? "text-[var(--ink)]" : "text-[var(--ink-3)]",
        )}
      >
        {label}
        {active ? (dir === "asc" ? "↑" : "↓") : ""}
      </button>
    </th>
  );
}

function HeatmapRow({
  cell,
  selected,
  onSelect,
}: {
  cell: HeatmapCell;
  selected: boolean;
  onSelect: () => void;
}) {
  const positive = cell.changePct >= 0;
  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-[var(--hairline-2)] last:border-b-0 hover:bg-[var(--hover)]",
        selected && "bg-[var(--accent-soft)]",
      )}
    >
      <td className="px-5 py-2.5 font-medium">{cell.label}</td>
      <td className="px-5 py-2.5 text-[var(--ink-2)]">
        {CLASS_LABEL[cell.assetClass] ?? heatmapClassLabel(cell.assetClass)}
      </td>
      <td className="num px-5 py-2.5 text-right">
        <Sensitive>{thb(cell.value)}</Sensitive>
      </td>
      <td
        className={cn(
          "num px-5 py-2.5 text-right",
          positive ? "text-[var(--accent-pos)]" : "text-[var(--accent-neg)]",
        )}
      >
        <Sensitive>{thb(cell.pnlDelta, { sign: true })}</Sensitive>
      </td>
      <td
        className={cn(
          "num px-5 py-2.5 text-right",
          positive ? "text-[var(--accent-pos)]" : "text-[var(--accent-neg)]",
        )}
      >
        {formatChangePct(cell.changePct)}
      </td>
    </tr>
  );
}
