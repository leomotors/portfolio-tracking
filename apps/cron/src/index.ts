import { db } from "@repo/database/client";

import { dailyBalance } from "./dailyBalance.js";
import { sendMessage } from "./discord.js";
import { environment } from "./environment.js";
import { fillMissingData } from "./fillMissingData.js";
import { logger } from "./logger.js";
import { getSummary } from "./summary.js";

if (environment.DRY_RUN) {
  logger.log("Running in dry-run mode");
}

await dailyBalance();
await fillMissingData();

await sendMessage(
  `## Portfolio Daily Cron: Run Completed\n${await getSummary()}`,
  logger.getMessages().join("\n"),
);

await db.$client.end();
