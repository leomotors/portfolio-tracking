export const dynamic = "force-dynamic";

import { HeatmapClient } from "@/components/app/pages/heatmap-client";
import { getHeatmapByDate, listHeatmapDates } from "@/lib/db/queries";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HeatmapPage({ searchParams }: PageProps) {
  const [dates, sp] = await Promise.all([listHeatmapDates(), searchParams]);
  const requested = typeof sp.date === "string" ? sp.date : null;
  const selectedDate =
    requested && dates.includes(requested) ? requested : (dates[0] ?? null);
  const snapshot = selectedDate ? await getHeatmapByDate(selectedDate) : null;

  return (
    <HeatmapClient
      dates={dates}
      selectedDate={selectedDate}
      snapshot={snapshot}
    />
  );
}
