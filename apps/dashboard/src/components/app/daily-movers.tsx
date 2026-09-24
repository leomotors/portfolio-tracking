import type { DailyReportMovers } from "@repo/database/schema";

import { Sensitive } from "@/components/app/sensitive";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { thb } from "@/lib/portfolio/format";
import { cn } from "@/lib/utils";

function usd(value: number, sign = false) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (sign) return (value >= 0 ? "+" : "−") + "$" + abs;
  return (value < 0 ? "−" : "") + "$" + abs;
}

function signedClass(value: number) {
  if (Math.abs(value) < 1e-6) return "text-[var(--ink-2)]";
  return value > 0 ? "text-[var(--accent-pos)]" : "text-[var(--accent-neg)]";
}

function PerformerRow({
  tag,
  name,
  delta,
  empty,
}: {
  tag: string;
  name: string | null;
  delta: number | null;
  empty: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-3)]">
          {tag}
        </div>
        <div className="mt-1 text-[15px] font-medium">{name ?? empty}</div>
      </div>
      {delta != null && (
        <div
          className={cn(
            "num shrink-0 text-[18px] font-semibold",
            signedClass(delta),
          )}
        >
          <Sensitive>{thb(delta, { sign: true })}</Sensitive>
        </div>
      )}
    </div>
  );
}

export function DailyMovers({ data }: { data: DailyReportMovers }) {
  const hasMovers = data.top != null || data.worst != null;
  const hasLending = data.lending.length > 0;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        hasLending && hasMovers ? "lg:grid-cols-2" : "",
      )}
    >
      {hasMovers && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Day movers</CardTitle>
              <CardDescription>
                {data.asOfLabel} · vs previous snapshot
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <PerformerRow
              tag="TOP"
              name={data.top?.name ?? null}
              delta={data.top?.delta ?? null}
              empty="Day movers available from the next run"
            />
            <div className="border-t border-[var(--hairline-2)]" />
            <PerformerRow
              tag="WORST"
              name={data.worst?.name ?? null}
              delta={data.worst?.delta ?? null}
              empty="No loss recorded"
            />
          </CardContent>
        </Card>
      )}

      {hasLending && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Lending health</CardTitle>
              <CardDescription>
                {data.lending.length} position
                {data.lending.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col">
            {data.lending.map((row, idx) => {
              const under = row.leftoverUsd < 0;
              return (
                <div
                  key={row.name}
                  className={cn(
                    "-mx-3 rounded-lg px-3 py-3",
                    idx < data.lending.length - 1 &&
                      "border-b border-[var(--hairline-2)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{row.name}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                        Cash <Sensitive>{usd(row.cashUsd)}</Sensitive>
                        {" · Borrowed "}
                        <Sensitive>{usd(row.borrowedUsd)}</Sensitive>
                        {row.protocolHealthFactor != null
                          ? ` · HF ${row.protocolHealthFactor.toFixed(2)}`
                          : " · HF not reported"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={cn(
                          "num text-[16px] font-semibold",
                          signedClass(row.leftoverUsd),
                        )}
                      >
                        <Sensitive>{usd(row.leftoverUsd, true)}</Sensitive>
                      </div>
                      <div className="mt-0.5 text-[11px] tracking-[0.08em] text-[var(--ink-3)]">
                        {under ? "SHORTFALL" : "SURPLUS"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
