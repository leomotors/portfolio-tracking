export const dynamic = "force-dynamic";

import { BanksClient } from "@/components/app/pages/banks-client";
import {
  getBankAccounts,
  getBankDaily,
  getFcdAccounts,
} from "@/lib/db/queries";

export default async function BanksPage() {
  const [bankAccounts, bankDaily, fcdAccounts] = await Promise.all([
    getBankAccounts(),
    getBankDaily(),
    getFcdAccounts(),
  ]);
  return (
    <BanksClient
      bankAccounts={bankAccounts}
      bankDaily={bankDaily}
      fcdAccounts={fcdAccounts}
    />
  );
}
