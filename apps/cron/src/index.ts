import { db } from "@repo/database/client";

import { dailyBalance } from "./dailyBalance.js";
import { environment } from "./environment.js";
import { fillMissingData } from "./fillMissingData.js";

if (environment.DRY_RUN) {
  console.log("Running in dry-run mode");
}

await dailyBalance();
await fillMissingData();

await db.$client.end();
