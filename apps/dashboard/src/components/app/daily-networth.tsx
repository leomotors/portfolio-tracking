import type { DailyReportNetworth } from "@repo/database/schema";

import { Delta } from "@/components/app/delta";
import { Kpi, KpiGrid } from "@/components/app/kpi";
import { Sensitive } from "@/components/app/sensitive";
import { Card } from "@/components/ui/card";
import { thb } from "@/lib/portfolio/format";

export function DailyNetworth({ data }: { data: DailyReportNetworth }) {
  const dayPct =
    data.netDelta != null && data.netWorth - data.netDelta !== 0
      ? data.netDelta / (data.netWorth - data.netDelta)
      : undefined;
  const openPnl = data.investValue - data.investCost;

  return (
    <>
      <Card>
        <div className="px-5 pt-5 pb-5 md:px-6 md:pt-6">
          <div className="text-[12px] font-medium text-[var(--ink-2)]">
            Net worth
          </div>
          <div className="mt-1 text-[11px] text-[var(--ink-3)]">
            {data.asOfLabel} · {data.asOfTime}
          </div>
          <div className="mt-4 font-serif text-[46px] leading-none font-light tracking-[-0.01em] md:text-[58px]">
            <Sensitive>{thb(data.netWorth)}</Sensitive>
          </div>
          <div className="mt-2 flex min-h-6 flex-wrap items-center gap-3">
            {data.netDelta == null ? (
              <span className="text-[13px] text-[var(--ink-3)]">
                Day change unavailable
              </span>
            ) : (
              <Delta value={data.netDelta} pct={dayPct} large />
            )}
          </div>
        </div>
      </Card>
      <KpiGrid>
        <Kpi
          label="Bank"
          value={<Sensitive>{thb(data.bank)}</Sensitive>}
          delta={data.bankDelta ?? undefined}
          sub="Liquid cash"
        />
        <Kpi
          label="Investment value"
          value={<Sensitive>{thb(data.investValue)}</Sensitive>}
          delta={data.investValueDelta ?? undefined}
          sub={
            <>
              cost <Sensitive>{thb(data.investCost)}</Sensitive>
            </>
          }
        />
        <Kpi
          label="Real estate"
          value={
            data.hasRealEstate ? (
              <Sensitive>{thb(data.realEstate)}</Sensitive>
            ) : (
              "—"
            )
          }
          delta={
            data.hasRealEstate ? (data.realEstateDelta ?? undefined) : undefined
          }
          sub={data.hasRealEstate ? undefined : "Not tracked"}
        />
        <Kpi
          label={data.hasTakenPnl ? "All-time P/L" : "Current P/L"}
          value={<Sensitive>{thb(data.allTimePnl)}</Sensitive>}
          delta={data.allTimePnlDelta ?? undefined}
          sub={
            data.hasTakenPnl ? (
              <>
                open <Sensitive>{thb(openPnl)}</Sensitive>
                {" · taken "}
                <Sensitive>{thb(data.takenPnl)}</Sensitive>
              </>
            ) : undefined
          }
        />
      </KpiGrid>
    </>
  );
}
