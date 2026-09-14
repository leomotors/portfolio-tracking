export const dynamic = "force-dynamic";

import { AllocationClient } from "@/components/app/pages/allocation-client";
import {
  getAssets,
  getBankAccounts,
  getCurrencies,
  getInvestmentAccounts,
  getRealEstateProperties,
} from "@/lib/db/queries";
import {
  byAssetClass,
  byCurrency,
  byInvestmentAccount,
  byRiskLevel,
  realEstateTotals,
} from "@/lib/portfolio/aggregate";

export default async function AllocationPage() {
  const [assets, bankAccts, currencies, realEstateProperties, investments] =
    await Promise.all([
      getAssets(),
      getBankAccounts(),
      getCurrencies(),
      getRealEstateProperties(),
      getInvestmentAccounts(),
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
      byAccount={byInvestmentAccount(investments)}
      bankTotal={bankAccts.reduce(
        (sum, account) => sum + account.currentBalance,
        0,
      )}
      realEstateTotal={realEstateTotals(realEstateProperties).value}
      currencies={currencies}
    />
  );
}
