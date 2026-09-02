export const dynamic = "force-dynamic";

import { SettingsClient } from "@/components/app/pages/settings-client";
import {
  getCoingeckoSymbols,
  getUnmappedCryptoSymbols,
} from "@/lib/db/queries";

export default async function SettingsPage() {
  const [maps, unmapped] = await Promise.all([
    getCoingeckoSymbols(),
    getUnmappedCryptoSymbols(),
  ]);

  return <SettingsClient maps={maps} unmapped={unmapped} />;
}
