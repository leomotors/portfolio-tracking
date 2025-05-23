import { sum } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  bankAccountTable,
  investmentAccountTable,
} from "@repo/database/schema";

export async function getSummary() {
  const { totalBalance: _totalBalance } = (
    await db
      .select({
        totalBalance: sum(bankAccountTable.currentBalance),
      })
      .from(bankAccountTable)
  )[0];

  const totalBalance = +(_totalBalance || 0);

  const { totalCost: _totalCost, totalValue: _totalValue } = (
    await db
      .select({
        totalCost: sum(investmentAccountTable.currentCost),
        totalValue: sum(investmentAccountTable.currentValue),
      })
      .from(investmentAccountTable)
  )[0];

  const totalCost = +(_totalCost || 0);
  const totalValue = +(_totalValue || 0);

  const pnl = ((totalValue - totalCost) / totalCost) * 100;

  const f = Intl.NumberFormat("en-US");

  return (
    `Total Bank Balance: ${f.format(totalBalance)} THB` +
    `\nTotal Investment Cost: ${f.format(totalCost)} THB` +
    `\nTotal Investment Value: ${f.format(totalValue)} THB` +
    `\nCurrent P/L: ${f.format(pnl)}%` +
    `\n**Total Net Worth: ${f.format(totalBalance + totalValue)} THB**`
  );
}
