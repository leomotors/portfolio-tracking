export const dynamic = "force-dynamic";

import { HistoryClient } from "@/components/app/pages/history-client";
import { getDailyReportByDate, listDailyReportDates } from "@/lib/db/queries";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const [dates, sp] = await Promise.all([listDailyReportDates(), searchParams]);
  const requested = typeof sp.date === "string" ? sp.date : null;
  const selectedDate =
    requested && dates.includes(requested) ? requested : (dates[0] ?? null);
  const snapshot = selectedDate
    ? await getDailyReportByDate(selectedDate)
    : null;

  return (
    <HistoryClient
      dates={dates}
      selectedDate={selectedDate}
      snapshot={snapshot}
    />
  );
}
