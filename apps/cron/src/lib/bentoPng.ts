import sharp from "sharp";

import {
  type BentoMoversData,
  type BentoNetworthData,
  renderMoversSvg,
  renderNetworthSvg,
} from "@/lib/bentoSvg";
import { formatAsOfLabel, formatAsOfTime } from "@/lib/date";
import { type LendingHealthSnapshot } from "@/lib/lendingHealth";
import { type SummaryResult } from "@/summary";

export type BentoPngs = {
  networth: Buffer;
  movers: Buffer | null;
};

export function toBentoNetworth(
  summary: SummaryResult,
  now = new Date(),
): BentoNetworthData {
  return {
    asOfLabel: formatAsOfLabel(now),
    asOfTime: formatAsOfTime(now),
    netWorth: summary.netWorth,
    netDelta: summary.netWorthDelta,
    bank: summary.bank,
    bankDelta: summary.bankDelta,
    investCost: summary.investCost,
    investValue: summary.investValue,
    investValueDelta: summary.investValueDelta,
    realEstate: summary.realEstate,
    realEstateDelta: summary.realEstateDelta,
    hasRealEstate: summary.hasRealEstate,
    allTimePnl: summary.allTimePnl,
    allTimePnlDelta: summary.allTimePnlDelta,
    takenPnl: summary.takenPnl,
    hasTakenPnl: summary.hasTakenPnl,
  };
}

export function toBentoMovers(
  summary: SummaryResult,
  lending: LendingHealthSnapshot[],
  now = new Date(),
): BentoMoversData | null {
  if (!summary.performers && lending.length === 0) return null;

  return {
    asOfLabel: formatAsOfLabel(now),
    top: summary.performers
      ? {
          name: summary.performers.top.name,
          delta: summary.performers.top.pnlDelta,
        }
      : null,
    worst: summary.performers
      ? {
          name: summary.performers.worst.name,
          delta: summary.performers.worst.pnlDelta,
        }
      : null,
    lending: lending.map((row) => ({
      name: row.name,
      leftoverUsd: row.leftoverUsd,
      cashUsd: row.cashUsd,
      borrowedUsd: row.borrowedUsd,
      protocolHealthFactor: row.protocolHealthFactor,
    })),
  };
}

async function svgToPng(svg: string) {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderBentoPngs(
  summary: SummaryResult,
  lending: LendingHealthSnapshot[],
  now = new Date(),
): Promise<BentoPngs> {
  const networth = await svgToPng(
    renderNetworthSvg(toBentoNetworth(summary, now)),
  );
  const moversData = toBentoMovers(summary, lending, now);
  const moversSvg = moversData ? renderMoversSvg(moversData) : null;
  const movers = moversSvg ? await svgToPng(moversSvg) : null;
  return { networth, movers };
}
