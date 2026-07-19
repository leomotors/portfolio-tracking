export const dynamic = "force-dynamic";

import { CryptoClient } from "@/components/app/pages/crypto-client";
import {
  getAssets,
  getCurrencies,
  getInvestmentAccounts,
  getStakedDaily,
  getStakedPositions,
} from "@/lib/db/queries";

export default async function CryptoPage() {
  const [staked, stakedDaily, assets, currencies, accounts] = await Promise.all(
    [
      getStakedPositions(),
      getStakedDaily(),
      getAssets(),
      getCurrencies(),
      getInvestmentAccounts(),
    ],
  );

  return (
    <CryptoClient
      staked={staked}
      stakedDaily={stakedDaily}
      assets={assets}
      currencies={currencies}
      accounts={accounts}
    />
  );
}
