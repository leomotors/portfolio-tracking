export const dynamic = "force-dynamic";

import { SettingsClient } from "@/components/app/pages/settings-client";
import {
  getCoingeckoSymbols,
  getSecFundSymbols,
  getUnmappedCryptoSymbols,
  getUnmappedThaiFundSymbols,
} from "@/lib/db/queries";

export default async function SettingsPage() {
  const [maps, unmapped, secMaps, secUnmapped] = await Promise.all([
    getCoingeckoSymbols(),
    getUnmappedCryptoSymbols(),
    getSecFundSymbols(),
    getUnmappedThaiFundSymbols(),
  ]);

  return (
    <SettingsClient
      maps={maps}
      unmapped={unmapped}
      secMaps={secMaps}
      secUnmapped={secUnmapped}
    />
  );
}
