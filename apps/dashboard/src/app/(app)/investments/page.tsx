export const dynamic = "force-dynamic";

import { InvestmentsClient } from "@/components/app/pages/investments-client";
import {
  getAssets,
  getCurrencies,
  getInvestmentAccounts,
  getInvestmentDaily,
  getPnlEvents,
} from "@/lib/db/queries";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvestmentsPage({ searchParams }: PageProps) {
  const [accounts, daily, assets, currencies, pnlEvents, sp] = await Promise.all([
    getInvestmentAccounts(),
    getInvestmentDaily(),
    getAssets(),
    getCurrencies(),
    getPnlEvents(),
    searchParams,
  ]);

  const accountParam = sp.account;
  const initialAccountId =
    typeof accountParam === "string"
      ? Number.parseInt(accountParam, 10)
      : undefined;

  return (
    <InvestmentsClient
      accounts={accounts}
      daily={daily}
      assets={assets}
      currencies={currencies}
      pnlEvents={pnlEvents}
      initialAccountId={
        Number.isFinite(initialAccountId) ? initialAccountId : undefined
      }
    />
  );
}
