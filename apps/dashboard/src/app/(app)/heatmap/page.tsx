import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HeatmapRedirect({ searchParams }: PageProps) {
  const sp = await searchParams;
  const date =
    typeof sp.date === "string" ? `?date=${encodeURIComponent(sp.date)}` : "";
  redirect(`/history${date}`);
}
