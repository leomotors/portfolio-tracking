import { PgInsertValue } from "drizzle-orm/pg-core";

import { db } from "@repo/database/client";
import {
  bankDailyBalanceTable,
  investmentDailyBalanceTable,
} from "@repo/database/schema";

import { logger } from "@/core/logger.js";
import { formatDate } from "@/lib/dateFormat.js";

export async function fillMissingData() {
  await fillMissingDataBank();
  await fillMissingDataInvestment();
}

async function fillMissingDataBank() {
  const allBalance = await db.select().from(bankDailyBalanceTable).execute();

  const grouped = allBalance.reduce(
    (acc, row) => {
      if (!acc[row.bankAccountId]) {
        acc[row.bankAccountId] = [];
      }
      acc[row.bankAccountId].push(row);
      return acc;
    },
    {} as Record<string, typeof allBalance>,
  );

  const insertValues = [] as PgInsertValue<typeof bankDailyBalanceTable>[];

  for (const [_, rows] of Object.entries(grouped)) {
    const sortedRows = rows.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Fill missing date wiht previous data
    for (let i = 1; i < sortedRows.length; i++) {
      const prev = sortedRows[i - 1];
      const current = sortedRows[i];

      const prevDate = new Date(prev.date);
      const currentDate = new Date(current.date);

      const diff =
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diff > 1) {
        for (let j = 1; j < diff; j++) {
          const targetDate = new Date(
            prevDate.getTime() + j * 24 * 60 * 60 * 1000,
          );
          const dateStr = formatDate(targetDate);
          insertValues.push({
            bankAccountId: current.bankAccountId,
            balance: prev.balance,
            date: dateStr,
          });
        }
      }
    }
  }

  if (insertValues.length > 0) {
    logger.log(
      `Inserting missing data of bank daily balance with length ${insertValues.length}:`,
    );
    logger.log(JSON.stringify(insertValues, null, 2));

    if (!process.env.DRY_RUN) {
      await db.insert(bankDailyBalanceTable).values(insertValues).execute();
    }
  }
}

async function fillMissingDataInvestment() {
  const allBalance = await db
    .select()
    .from(investmentDailyBalanceTable)
    .execute();

  const grouped = allBalance.reduce(
    (acc, row) => {
      if (!acc[row.investmentAccountId]) {
        acc[row.investmentAccountId] = [];
      }
      acc[row.investmentAccountId].push(row);
      return acc;
    },
    {} as Record<string, typeof allBalance>,
  );

  const insertValues = [] as PgInsertValue<
    typeof investmentDailyBalanceTable
  >[];

  for (const [_, rows] of Object.entries(grouped)) {
    const sortedRows = rows.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Fill missing date wiht previous data
    for (let i = 1; i < sortedRows.length; i++) {
      const prev = sortedRows[i - 1];
      const current = sortedRows[i];

      const prevDate = new Date(prev.date);
      const currentDate = new Date(current.date);

      const diff =
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diff > 1) {
        for (let j = 1; j < diff; j++) {
          const targetDate = new Date(
            prevDate.getTime() + j * 24 * 60 * 60 * 1000,
          );
          const dateStr = formatDate(targetDate);
          insertValues.push({
            investmentAccountId: current.investmentAccountId,
            cost: prev.cost,
            value: prev.value,
            date: dateStr,
          });
        }
      }
    }
  }

  if (insertValues.length > 0) {
    logger.log(
      `Inserting missing data of investment daily balance with length ${insertValues.length}:`,
    );
    logger.log(JSON.stringify(insertValues, null, 2));

    if (!process.env.DRY_RUN) {
      await db
        .insert(investmentDailyBalanceTable)
        .values(insertValues)
        .execute();
    }
  }
}
