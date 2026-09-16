import { db } from "@repo/database/client";
import { lendingMonitorTable } from "@repo/database/schema";

import { logger } from "@/core/logger";
import { etherfiCashMonitorConfigSchema } from "@/data/etherfiCash";
import { fetchEtherfiCashPositions } from "@/data/lendGateway";
import {
  buildLendingHealthSnapshot,
  isUnderDebt,
  type LendingHealthSnapshot,
} from "@/lib/lendingHealth";

const usd = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export async function lendingHealthStep(): Promise<LendingHealthSnapshot[]> {
  let monitors;
  try {
    monitors = await db.select().from(lendingMonitorTable);
  } catch (err) {
    if (isLendingMonitorUnavailable(err)) {
      logger.log(
        "lending_monitor is not migrated yet; skipping leftover check.",
      );
      return [];
    }
    throw err;
  }

  if (monitors.length === 0) {
    logger.log("No lending monitors configured");
    return [];
  }

  logger.log(`Checking ${monitors.length} lending monitor(s)...`);
  const snapshots: LendingHealthSnapshot[] = [];

  for (const monitor of monitors) {
    try {
      snapshots.push(await checkMonitor(monitor));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        `Lending health check failed for ${monitor.name}: ${message}`,
      );
    }
  }

  logger.log("✓ Lending health check completed");
  return snapshots;
}

async function checkMonitor(
  monitor: typeof lendingMonitorTable.$inferSelect,
): Promise<LendingHealthSnapshot> {
  switch (monitor.provider) {
    case "etherfi_cash": {
      const config = etherfiCashMonitorConfigSchema.parse(monitor.syncConfig);
      const { cash, borrowed, account } = await fetchEtherfiCashPositions({
        ...config,
        wallet: monitor.wallet,
      });
      const snapshot = buildLendingHealthSnapshot({
        name: monitor.name,
        cash,
        borrowed,
        borrowedUsd: account.debtUsd,
        protocolHealthFactor: account.healthFactor,
      });

      const cashBits = snapshot.cash
        .map((p) => `${p.symbol} ${usd.format(p.usd)}`)
        .join(" + ");
      logger.log(
        `- ${monitor.name}: cash ${cashBits || "none"} = ${usd.format(snapshot.cashUsd)}`,
      );
      logger.log(`  Borrowed: ${usd.format(snapshot.borrowedUsd)}`);
      logger.log(`  Leftover: ${usd.format(snapshot.leftoverUsd)}`);

      if (isUnderDebt(snapshot.leftoverUsd)) {
        logger.warn(
          `⚠️ ${monitor.name} leftover is negative (${usd.format(snapshot.leftoverUsd)}) — cash no longer covers the borrow`,
        );
      }

      return snapshot;
    }
  }
}

/**
 * Soft-fail only for a missing `lending_monitor` table, so a cron running
 * ahead of the migration still posts its summary.
 */
function isLendingMonitorUnavailable(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    const code = "code" in current ? String(current.code) : "";
    const message = "message" in current ? String(current.message) : "";
    const namesTable =
      message.includes("lending_monitor") ||
      ("table" in current && String(current.table) === "lending_monitor");
    if (namesTable && (code === "42P01" || code === "42703")) return true;
    if (namesTable && message.toLowerCase().includes("does not exist")) {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
