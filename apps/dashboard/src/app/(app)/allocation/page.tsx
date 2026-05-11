export const dynamic = "force-dynamic";

import { AllocationClient } from "@/components/app/pages/allocation-client";
import { getAssets, getBankAccounts, getCurrencies } from "@/lib/db/queries";
import {
  byAssetClass,
  byCurrency,
  byRiskLevel,
} from "@/lib/portfolio/aggregate";

export default async function AllocationPage() {
  const [assets, bankAccts, currencies] = await Promise.all([
    getAssets(),
    getBankAccounts(),
    getCurrencies(),
  ]);

  return (
    <AllocationClient
      byClass={byAssetClass(assets, currencies, bankAccts)}
      byRisk={byRiskLevel(assets, currencies, bankAccts)}
      byCurrency={byCurrency(assets, currencies, bankAccts)}
      currencies={currencies}
    />
  );
}
