import { db } from "@repo/database/client";

import { sendMessage } from "./core/discord.js";
import { environment } from "./core/environment.js";
import { logger } from "./core/logger.js";
import { calculateBalance } from "./functions/calculateBalance/index.js";
import { dailyBalance } from "./functions/daily/dailyBalance.js";
import { fillMissingData } from "./functions/daily/fillMissingData.js";
import { priceUpdateStep } from "./functions/priceUpdate/index.js";
import { getSummary, loadPreviousDailySnapshot } from "./summary.js";

if (environment.DRY_RUN) {
  logger.log("Running in dry-run mode");
}

logger.log("\n--- Functions: Scraping Prices ---");
await priceUpdateStep();

logger.log("\n--- Functions: Calculate Balance ---");
await calculateBalance();

logger.log("\n--- Functions: Daily Balance ---");
const previousDailySnapshot = await loadPreviousDailySnapshot();
await dailyBalance();
await fillMissingData();

const summary = await getSummary(previousDailySnapshot);

await sendMessage(
  `## Portfolio Daily Cron: Run Completed${summary.circleSuffix}
App Version: ${APP_VERSION} ${environment.DRY_RUN ? "**(Dry Run: Data is not saved)**" : ""}
${summary.body}${
    logger.hasEstimation
      ? "\n📐 Estimations were made on some asset/currency price."
      : ""
  }${
    logger.hasWarning ? "\n### ⚠️ Warnings were found during the run." : ""
  }${logger.hasError ? "\n## ❗ Errors were found during the run." : ""}`,
  logger.getMessages().join("\n"),
);

await db.$client.end();
