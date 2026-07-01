export const dynamic = "force-dynamic";

import { AllocationClient } from "@/components/app/pages/allocation-client";
import {
  getAssets,
  getBankAccounts,
  getCurrencies,
  getRealEstateProperties,
} from "@/lib/db/queries";
import {
  byAssetClass,
  byCurrency,
  byRiskLevel,
} from "@/lib/portfolio/aggregate";

export default async function AllocationPage() {
  const [assets, bankAccts, currencies, realEstateProperties] =
    await Promise.all([
      getAssets(),
      getBankAccounts(),
      getCurrencies(),
      getRealEstateProperties(),
    ]);

  return (
    <AllocationClient
      byClass={byAssetClass(
        assets,
        currencies,
        bankAccts,
        realEstateProperties,
      )}
      byRisk={byRiskLevel(assets, currencies, bankAccts, realEstateProperties)}
      byCurrency={byCurrency(
        assets,
        currencies,
        bankAccts,
        realEstateProperties,
      )}
      currencies={currencies}
    />
  );
}
