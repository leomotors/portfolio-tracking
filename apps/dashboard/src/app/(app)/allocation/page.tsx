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
  allocationMembers,
  byAssetClass,
  byAssetType,
  byCurrency,
  byCustody,
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

  const memberInput = {
    assets,
    currencies,
    bankAccounts: bankAccts,
    realEstateProperties,
    investmentAccounts: investments,
  };

  return (
    <AllocationClient
      byClass={byAssetClass(
        assets,
        currencies,
        bankAccts,
        realEstateProperties,
      )}
      byType={byAssetType(assets, currencies, bankAccts, realEstateProperties)}
      byRisk={byRiskLevel(assets, currencies, bankAccts, realEstateProperties)}
      byCurrency={byCurrency(
        assets,
        currencies,
        bankAccts,
        realEstateProperties,
      )}
      byAccount={byInvestmentAccount(investments)}
      byCustody={byCustody(investments, bankAccts, realEstateProperties)}
      members={{
        class: allocationMembers("class", memberInput),
        type: allocationMembers("type", memberInput),
        account: allocationMembers("account", memberInput),
        custody: allocationMembers("custody", memberInput),
        risk: allocationMembers("risk", memberInput),
        currency: allocationMembers("currency", memberInput),
      }}
      bankTotal={bankAccts.reduce(
        (sum, account) => sum + account.currentBalance,
        0,
      )}
      realEstateTotal={realEstateTotals(realEstateProperties).value}
      currencies={currencies}
    />
  );
}
