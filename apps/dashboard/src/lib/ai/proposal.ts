import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@repo/database/client";
import {
  aiChangeProposalTable,
  assetTable,
  bankAccountTable,
  currencyTable,
  investmentAccountTable,
  pnlEventTable,
  realEstatePropertyTable,
  stakedPositionTable,
} from "@repo/database/schema";

import {
  createAsset,
  createInAccountPnlEvent,
  createWithdrawnPnlEvent,
  deletePnlEvent,
  updateAssetAmount,
  updateAssetAverageCost,
  updateBankBalance,
  updateInvestmentAccountCost,
  updateInvestmentAccountCustody,
  updateRealEstateCurrentValue,
  updateRealEstatePurchaseCost,
  updateStakedApy,
  updateStakedCurrent,
  updateStakedDeposited,
  updateStakedReceipt,
} from "@/lib/db/actions";

import {
  buildProposalPreview,
  type ChangeProposal,
  parseOperations,
  parsePreview,
  type PortfolioOperation,
  previewBeforesMatch,
  type ProposalLookup,
  type ProposalStatus,
  proposalStatusSchema,
  proposePortfolioChangeInputSchema,
} from "./proposal-ops";
import { getConversation } from "./store";

const toNum = (value: string | number | null | undefined, fallback = 0) => {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

export const dbProposalLookup: ProposalLookup = {
  async bankAccount(id) {
    const [row] = await db
      .select({
        id: bankAccountTable.id,
        name: bankAccountTable.name,
        bank: bankAccountTable.bank,
        currentBalance: bankAccountTable.currentBalance,
      })
      .from(bankAccountTable)
      .where(eq(bankAccountTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      bank: row.bank,
      currentBalance: toNum(row.currentBalance),
    };
  },
  async asset(id) {
    const [row] = await db
      .select({
        id: assetTable.id,
        name: assetTable.name,
        symbol: assetTable.symbol,
        amount: assetTable.amount,
        averageCost: assetTable.averageCost,
        unit: assetTable.unit,
      })
      .from(assetTable)
      .where(eq(assetTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      amount: toNum(row.amount),
      averageCost: toNum(row.averageCost),
      unit: row.unit,
    };
  },
  async investmentAccount(id) {
    const [row] = await db
      .select({
        id: investmentAccountTable.id,
        name: investmentAccountTable.name,
        currentCost: investmentAccountTable.currentCost,
        custody: investmentAccountTable.custody,
      })
      .from(investmentAccountTable)
      .where(eq(investmentAccountTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      currentCost: toNum(row.currentCost),
      custody: row.custody,
    };
  },
  async pnlEvent(id) {
    const [row] = await db
      .select({
        id: pnlEventTable.id,
        investmentAccountId: pnlEventTable.investmentAccountId,
        kind: pnlEventTable.kind,
        occurredOn: pnlEventTable.occurredOn,
        pnl: pnlEventTable.pnl,
        currency: currencyTable.symbol,
      })
      .from(pnlEventTable)
      .innerJoin(currencyTable, eq(pnlEventTable.currencyId, currencyTable.id))
      .where(eq(pnlEventTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      investmentAccountId: row.investmentAccountId,
      kind: row.kind,
      occurredOn: row.occurredOn,
      pnl: toNum(row.pnl),
      currency: row.currency,
    };
  },
  async stakedPosition(id) {
    const [row] = await db
      .select({
        id: stakedPositionTable.id,
        name: stakedPositionTable.name,
        depositedUnderlying: stakedPositionTable.depositedUnderlying,
        currentUnderlying: stakedPositionTable.currentUnderlying,
        receiptAmount: stakedPositionTable.receiptAmount,
        projectedApy: stakedPositionTable.projectedApy,
      })
      .from(stakedPositionTable)
      .where(eq(stakedPositionTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      depositedUnderlying: toNum(row.depositedUnderlying),
      currentUnderlying: toNum(row.currentUnderlying),
      receiptAmount:
        row.receiptAmount == null ? null : toNum(row.receiptAmount),
      projectedApy: row.projectedApy == null ? null : toNum(row.projectedApy),
    };
  },
  async realEstate(id) {
    const [row] = await db
      .select({
        id: realEstatePropertyTable.id,
        name: realEstatePropertyTable.name,
        currentValue: realEstatePropertyTable.currentValue,
        purchaseCost: realEstatePropertyTable.purchaseCost,
      })
      .from(realEstatePropertyTable)
      .where(eq(realEstatePropertyTable.id, id));
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      currentValue: toNum(row.currentValue),
      purchaseCost: toNum(row.purchaseCost),
    };
  },
  async currency(id) {
    const [row] = await db
      .select({
        id: currencyTable.id,
        symbol: currencyTable.symbol,
        variant: currencyTable.variant,
      })
      .from(currencyTable)
      .where(eq(currencyTable.id, id));
    return row ?? null;
  },
};

function mapProposal(
  row: typeof aiChangeProposalTable.$inferSelect,
): ChangeProposal {
  return {
    id: row.id,
    conversationId: row.conversationId,
    messageId: row.messageId,
    status: proposalStatusSchema.parse(row.status),
    summary: row.summary,
    operations: parseOperations(row.operations),
    preview: parsePreview(row.preview),
    userNote: row.userNote,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

export async function createChangeProposal(input: {
  conversationId: number;
  summary: string;
  operations: unknown;
}) {
  const parsed = proposePortfolioChangeInputSchema.parse({
    summary: input.summary,
    operations: input.operations,
  });
  const preview = await buildProposalPreview(
    parsed.operations,
    dbProposalLookup,
  );
  const [row] = await db
    .insert(aiChangeProposalTable)
    .values({
      conversationId: input.conversationId,
      summary: parsed.summary,
      operations: parsed.operations,
      preview,
    })
    .returning();
  return mapProposal(row);
}

export async function listChangeProposals(
  userId: string,
  conversationId: number,
) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return [];
  const rows = await db
    .select()
    .from(aiChangeProposalTable)
    .where(eq(aiChangeProposalTable.conversationId, conversationId))
    .orderBy(aiChangeProposalTable.createdAt, aiChangeProposalTable.id);
  return rows.map(mapProposal);
}

export async function attachProposalsToMessage(
  conversationId: number,
  messageId: number,
  proposalIds: number[],
) {
  if (proposalIds.length === 0) return;
  await db
    .update(aiChangeProposalTable)
    .set({ messageId })
    .where(
      and(
        eq(aiChangeProposalTable.conversationId, conversationId),
        inArray(aiChangeProposalTable.id, proposalIds),
      ),
    );
}

async function requireOwnedProposal(userId: string, proposalId: number) {
  const [row] = await db
    .select()
    .from(aiChangeProposalTable)
    .where(eq(aiChangeProposalTable.id, proposalId));
  if (!row) throw new Error("Proposal not found");
  const conversation = await getConversation(userId, row.conversationId);
  if (!conversation) throw new Error("Proposal not found");
  return mapProposal(row);
}

async function setProposalStatus(
  proposalId: number,
  status: ProposalStatus,
  userNote: string | null,
) {
  const [row] = await db
    .update(aiChangeProposalTable)
    .set({
      status,
      userNote,
      resolvedAt: new Date(),
    })
    .where(eq(aiChangeProposalTable.id, proposalId))
    .returning();
  return mapProposal(row);
}

export async function applyChangeProposalRecord(
  userId: string,
  proposalId: number,
) {
  const proposal = await requireOwnedProposal(userId, proposalId);
  if (proposal.status !== "pending") {
    throw new Error(`Proposal is ${proposal.status.replaceAll("_", " ")}`);
  }
  const operations = parseOperations(proposal.operations);
  const freshPreview = await buildProposalPreview(operations, dbProposalLookup);
  if (!previewBeforesMatch(proposal.preview, freshPreview)) {
    throw new Error(
      "This proposal is stale because the portfolio changed. Request a new proposal.",
    );
  }
  for (const operation of operations) {
    await dispatchOperation(operation);
  }
  return setProposalStatus(proposalId, "applied", null);
}

export async function reviewChangeProposalRecord(
  userId: string,
  proposalId: number,
  action: "rejected" | "revision_requested",
  note: string,
) {
  const proposal = await requireOwnedProposal(userId, proposalId);
  if (proposal.status !== "pending") {
    throw new Error(`Proposal is ${proposal.status.replaceAll("_", " ")}`);
  }
  const trimmed = note.trim();
  if (action === "revision_requested" && trimmed.length === 0) {
    throw new Error("A reason is required when requesting changes");
  }
  return setProposalStatus(
    proposalId,
    action,
    trimmed.length === 0 ? null : trimmed,
  );
}

async function dispatchOperation(operation: PortfolioOperation) {
  switch (operation.op) {
    case "update_bank_balance":
      await updateBankBalance(operation.id, operation.balance);
      return;
    case "update_asset_amount":
      await updateAssetAmount(operation.id, operation.amount);
      return;
    case "update_asset_average_cost":
      await updateAssetAverageCost(operation.id, operation.averageCost);
      return;
    case "create_asset": {
      const { op: _op, ...fields } = operation;
      await createAsset(fields);
      return;
    }
    case "update_investment_account_custody":
      await updateInvestmentAccountCustody(operation.id, operation.custody);
      return;
    case "update_investment_account_cost":
      await updateInvestmentAccountCost(operation.id, operation.currentCost);
      return;
    case "create_in_account_pnl_event":
      await createInAccountPnlEvent({
        accountId: operation.accountId,
        occurredOn: operation.occurredOn,
        currencyId: operation.currencyId,
        pnl: operation.pnl,
        note: operation.note,
        undocumented: operation.undocumented,
      });
      return;
    case "create_withdrawn_pnl_event":
      await createWithdrawnPnlEvent({
        accountId: operation.accountId,
        occurredOn: operation.occurredOn,
        currencyId: operation.currencyId,
        pnl: operation.pnl,
        withdrawAmount: operation.withdrawAmount,
        note: operation.note,
      });
      return;
    case "delete_pnl_event":
      await deletePnlEvent(operation.id);
      return;
    case "update_staked_deposited":
      await updateStakedDeposited(operation.id, operation.deposited);
      return;
    case "update_staked_current":
      await updateStakedCurrent(operation.id, operation.current);
      return;
    case "update_staked_receipt":
      await updateStakedReceipt(operation.id, operation.amount);
      return;
    case "update_staked_apy":
      await updateStakedApy(operation.id, operation.apy);
      return;
    case "update_real_estate_current_value":
      await updateRealEstateCurrentValue(operation.id, operation.currentValue);
      return;
    case "update_real_estate_purchase_cost":
      await updateRealEstatePurchaseCost(operation.id, operation.purchaseCost);
      return;
  }
}
