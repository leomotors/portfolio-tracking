import { db } from "@repo/database/client";

import { type DiscordAttachment, sendMessage } from "./core/discord.js";
import { environment } from "./core/environment.js";
import { logger } from "./core/logger.js";
import { calculateBalance } from "./functions/calculateBalance/index.js";
import { dailyBalance } from "./functions/daily/dailyBalance.js";
import { fillMissingData } from "./functions/daily/fillMissingData.js";
import { priceUpdateStep } from "./functions/priceUpdate/index.js";
import { stakingSyncStep } from "./functions/stakingSync/index.js";
import { loadHeldAssetSnapshots } from "./lib/dayPerformers.js";
import { renderDayHeatmapPng } from "./lib/heatmapPng.js";
import { getSummary, loadPreviousDailySnapshot } from "./summary.js";

if (environment.DRY_RUN) {
  logger.log("Running in dry-run mode");
}

// Capture pre-update asset cost/value so day performers / heatmap reflect this
// run's price and FX changes without needing a historical asset balance table.
const previousAssets = await loadHeldAssetSnapshots();

logger.log("\n--- Functions: Staking Sync ---");
await stakingSyncStep();

logger.log("\n--- Functions: Scraping Prices ---");
await priceUpdateStep();

logger.log("\n--- Functions: Calculate Balance ---");
await calculateBalance();

logger.log("\n--- Functions: Daily Balance ---");
const previousDailySnapshot = await loadPreviousDailySnapshot();
await dailyBalance();
await fillMissingData();

const summary = await getSummary(previousDailySnapshot, previousAssets);

const previousById = new Map(
  previousAssets.map((asset) => [
    asset.id,
    { cost: asset.cost, value: asset.value },
  ]),
);
const heatmapPng = await renderDayHeatmapPng(
  await loadHeldAssetSnapshots(),
  previousById,
);

const attachments: DiscordAttachment[] = [
  {
    filename: "run.log",
    contentType: "text/plain",
    data: logger.getMessages().join("\n"),
  },
];
if (heatmapPng) {
  attachments.push({
    filename: "heatmap.png",
    contentType: "image/png",
    data: heatmapPng,
  });
}

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
  attachments,
);

await db.$client.end();
