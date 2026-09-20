import { db } from "@repo/database/client";
import { buildHeatmapCells, colorScaleMax } from "@repo/heatmap";

import { sendMessage } from "./core/discord.js";
import { environment } from "./core/environment.js";
import { logger } from "./core/logger.js";
import { calculateBalance } from "./functions/calculateBalance/index.js";
import { dailyBalance } from "./functions/daily/dailyBalance.js";
import { fillMissingData } from "./functions/daily/fillMissingData.js";
import { lendingHealthStep } from "./functions/lendingHealth/index.js";
import { priceUpdateStep } from "./functions/priceUpdate/index.js";
import { stakingSyncStep } from "./functions/stakingSync/index.js";
import { renderBentoPngs } from "./lib/bentoPng.js";
import { formatDate, getYesterday } from "./lib/date.js";
import { loadHeldAssetSnapshots } from "./lib/dayPerformers.js";
import { buildDailyDiscordPosts } from "./lib/discordPosts.js";
import { saveHeatmapDaily } from "./lib/heatmapDaily.js";
import { renderHeatmapPngFromCells } from "./lib/heatmapPng.js";
import { getSummary, loadPreviousDailySnapshot } from "./summary.js";

if (environment.DRY_RUN) {
  logger.log("Running in dry-run mode");
}

// Capture pre-update asset cost/value so day performers / heatmap reflect this
// run's price and FX changes without needing a historical asset balance table.
const previousAssets = await loadHeldAssetSnapshots();

logger.log("\n--- Functions: Staking Sync ---");
await stakingSyncStep();

logger.log("\n--- Functions: Lending Health ---");
const lendingHealth = await lendingHealthStep();

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
const heatmapCells = buildHeatmapCells(
  await loadHeldAssetSnapshots(),
  previousById,
);
const heatmapScaleMax = colorScaleMax(heatmapCells);
const heatmapDate = formatDate(getYesterday(new Date()));
await saveHeatmapDaily(heatmapDate, heatmapCells, heatmapScaleMax);

let heatmapPng: Buffer | null = null;
try {
  heatmapPng = await renderHeatmapPngFromCells(heatmapCells, {
    colorScaleMax: heatmapScaleMax,
  });
} catch (error) {
  logger.error(
    `Failed to render heatmap PNG: ${error instanceof Error ? error.message : String(error)}`,
  );
}

let networthPng: Buffer | null = null;
let moversPng: Buffer | null = null;
try {
  const bento = await renderBentoPngs(summary, lendingHealth);
  networthPng = bento.networth;
  moversPng = bento.movers;
} catch (error) {
  logger.error(
    `Failed to render bento PNG: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const lines = [
  `## Portfolio Daily Cron: Run Completed${summary.circleSuffix}`,
  `App Version: ${APP_VERSION} ${environment.DRY_RUN ? "**(Dry Run: Data is not saved)**" : ""}`,
];
if (logger.hasEstimation) {
  lines.push("📐 Estimations were made on some asset/currency price.");
}
if (logger.hasWarning) {
  lines.push("### ⚠️ Warnings were found during the run.");
}
if (logger.hasError) {
  lines.push("## ❗ Errors were found during the run.");
}

const posts = buildDailyDiscordPosts({
  caption: lines.join("\n"),
  networth: networthPng,
  movers: moversPng,
  heatmap: heatmapPng,
  log: logger.getMessages().join("\n"),
});
for (const post of posts) {
  await sendMessage(post.content, post.attachments);
}

await db.$client.end();
