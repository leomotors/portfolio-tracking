export const dynamic = "force-dynamic";

import { RealEstateClient } from "@/components/app/pages/real-estate-client";
import { getRealEstateProperties } from "@/lib/db/queries";

export default async function RealEstatePage() {
  const properties = await getRealEstateProperties();

  return <RealEstateClient properties={properties} />;
}
