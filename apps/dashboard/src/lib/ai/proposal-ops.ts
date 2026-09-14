import { z } from "zod";

const id = z.number().int().positive();
const nonNeg = z.number().finite().nonnegative();
const finite = z.number().finite();
const occurredOn = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const note = z.string().trim().max(500).optional();

export const portfolioOperationSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("update_bank_balance"),
      id,
      balance: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_asset_amount"),
      id,
      amount: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_asset_average_cost"),
      id,
      averageCost: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_investment_account_cost"),
      id,
      currentCost: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("create_in_account_pnl_event"),
      accountId: id,
      occurredOn,
      currencyId: id,
      pnl: finite,
      note,
      undocumented: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal("create_withdrawn_pnl_event"),
      accountId: id,
      occurredOn,
      currencyId: id,
      pnl: finite,
      withdrawAmount: z.number().finite().positive(),
      note,
    })
    .strict(),
  z
    .object({
      op: z.literal("delete_pnl_event"),
      id,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_staked_deposited"),
      id,
      deposited: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_staked_current"),
      id,
      current: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_staked_receipt"),
      id,
      amount: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_staked_apy"),
      id,
      apy: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_real_estate_current_value"),
      id,
      currentValue: nonNeg,
    })
    .strict(),
  z
    .object({
      op: z.literal("update_real_estate_purchase_cost"),
      id,
      purchaseCost: nonNeg,
    })
    .strict(),
]);

export const proposePortfolioChangeInputSchema = z
  .object({
    summary: z.string().trim().min(1).max(500),
    operations: z.array(portfolioOperationSchema).min(1).max(20),
  })
  .strict();

export type PortfolioOperation = z.infer<typeof portfolioOperationSchema>;
export type ProposePortfolioChangeInput = z.infer<
  typeof proposePortfolioChangeInputSchema
>;

export const proposalStatusSchema = z.enum([
  "pending",
  "applied",
  "rejected",
  "revision_requested",
]);

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

const previewValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const proposalPreviewRowSchema = z
  .object({
    op: z.string(),
    label: z.string(),
    target: z.string(),
    changes: z.array(
      z
        .object({
          field: z.string(),
          before: previewValueSchema,
          after: previewValueSchema,
        })
        .strict(),
    ),
  })
  .strict();

export type ProposalPreviewRow = z.infer<typeof proposalPreviewRowSchema>;
export type PreviewValue = z.infer<typeof previewValueSchema>;

export interface ChangeProposal {
  id: number;
  conversationId: number;
  messageId: number | null;
  status: ProposalStatus;
  summary: string;
  operations: PortfolioOperation[];
  preview: ProposalPreviewRow[];
  userNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export const OPERATION_LABELS: Record<PortfolioOperation["op"], string> = {
  update_bank_balance: "Update bank balance",
  update_asset_amount: "Update holding amount",
  update_asset_average_cost: "Update average cost",
  update_investment_account_cost: "Update account cost basis",
  create_in_account_pnl_event: "Log in-account P/L",
  create_withdrawn_pnl_event: "Log withdrawn P/L",
  delete_pnl_event: "Delete P/L event",
  update_staked_deposited: "Update staked deposited",
  update_staked_current: "Update staked current",
  update_staked_receipt: "Update staked receipt",
  update_staked_apy: "Update staked APY",
  update_real_estate_current_value: "Update property value",
  update_real_estate_purchase_cost: "Update property cost",
};

export interface ProposalLookup {
  bankAccount(id: number): Promise<{
    id: number;
    name: string;
    bank: string;
    currentBalance: number;
  } | null>;
  asset(id: number): Promise<{
    id: number;
    name: string;
    symbol: string | null;
    amount: number;
    averageCost: number;
    unit: string;
  } | null>;
  investmentAccount(
    id: number,
  ): Promise<{ id: number; name: string; currentCost: number } | null>;
  pnlEvent(id: number): Promise<{
    id: number;
    investmentAccountId: number;
    kind: string;
    occurredOn: string;
    pnl: number;
    currency: string;
  } | null>;
  stakedPosition(id: number): Promise<{
    id: number;
    name: string;
    depositedUnderlying: number;
    currentUnderlying: number;
    receiptAmount: number | null;
    projectedApy: number | null;
  } | null>;
  realEstate(id: number): Promise<{
    id: number;
    name: string;
    currentValue: number;
    purchaseCost: number;
  } | null>;
  currency(
    id: number,
  ): Promise<{ id: number; symbol: string; variant: string | null } | null>;
}

function missing(kind: string, id: number): never {
  throw new Error(`${kind} ${id} was not found`);
}

function currencyLabel(row: { symbol: string; variant: string | null }) {
  return row.variant ? `${row.symbol} (${row.variant})` : row.symbol;
}

function assetLabel(row: { name: string; symbol: string | null }) {
  return row.symbol ? `${row.name} (${row.symbol})` : row.name;
}

function row(
  op: PortfolioOperation["op"],
  target: string,
  changes: ProposalPreviewRow["changes"],
): ProposalPreviewRow {
  return { op, label: OPERATION_LABELS[op], target, changes };
}

export async function buildProposalPreview(
  operations: PortfolioOperation[],
  lookup: ProposalLookup,
): Promise<ProposalPreviewRow[]> {
  const preview: ProposalPreviewRow[] = [];
  for (const operation of operations) {
    preview.push(await previewOperation(operation, lookup));
  }
  return preview;
}

async function previewOperation(
  operation: PortfolioOperation,
  lookup: ProposalLookup,
): Promise<ProposalPreviewRow> {
  switch (operation.op) {
    case "update_bank_balance": {
      const account =
        (await lookup.bankAccount(operation.id)) ??
        missing("Bank account", operation.id);
      return row(operation.op, `${account.name} · ${account.bank}`, [
        {
          field: "balance",
          before: account.currentBalance,
          after: operation.balance,
        },
      ]);
    }
    case "update_asset_amount": {
      const asset =
        (await lookup.asset(operation.id)) ?? missing("Asset", operation.id);
      return row(operation.op, assetLabel(asset), [
        {
          field: `amount (${asset.unit})`,
          before: asset.amount,
          after: operation.amount,
        },
      ]);
    }
    case "update_asset_average_cost": {
      const asset =
        (await lookup.asset(operation.id)) ?? missing("Asset", operation.id);
      return row(operation.op, assetLabel(asset), [
        {
          field: "averageCost",
          before: asset.averageCost,
          after: operation.averageCost,
        },
      ]);
    }
    case "update_investment_account_cost": {
      const account =
        (await lookup.investmentAccount(operation.id)) ??
        missing("Investment account", operation.id);
      return row(operation.op, account.name, [
        {
          field: "currentCost",
          before: account.currentCost,
          after: operation.currentCost,
        },
      ]);
    }
    case "create_in_account_pnl_event": {
      const account =
        (await lookup.investmentAccount(operation.accountId)) ??
        missing("Investment account", operation.accountId);
      const currency =
        (await lookup.currency(operation.currencyId)) ??
        missing("Currency", operation.currencyId);
      const kind = operation.undocumented ? "undocumented" : "in_account";
      return row(operation.op, account.name, [
        { field: "kind", before: null, after: kind },
        { field: "occurredOn", before: null, after: operation.occurredOn },
        { field: "currency", before: null, after: currencyLabel(currency) },
        { field: "pnl", before: null, after: operation.pnl },
        { field: "note", before: null, after: operation.note?.trim() || null },
      ]);
    }
    case "create_withdrawn_pnl_event": {
      const account =
        (await lookup.investmentAccount(operation.accountId)) ??
        missing("Investment account", operation.accountId);
      const currency =
        (await lookup.currency(operation.currencyId)) ??
        missing("Currency", operation.currencyId);
      return row(operation.op, account.name, [
        { field: "kind", before: null, after: "withdrawn" },
        { field: "occurredOn", before: null, after: operation.occurredOn },
        { field: "currency", before: null, after: currencyLabel(currency) },
        { field: "pnl", before: null, after: operation.pnl },
        {
          field: "withdrawAmount",
          before: null,
          after: operation.withdrawAmount,
        },
        { field: "note", before: null, after: operation.note?.trim() || null },
      ]);
    }
    case "delete_pnl_event": {
      const event =
        (await lookup.pnlEvent(operation.id)) ??
        missing("P/L event", operation.id);
      return row(
        operation.op,
        `${event.kind} · ${event.occurredOn} · ${event.currency}`,
        [
          { field: "pnl", before: event.pnl, after: null },
          { field: "kind", before: event.kind, after: null },
          { field: "occurredOn", before: event.occurredOn, after: null },
        ],
      );
    }
    case "update_staked_deposited": {
      const position =
        (await lookup.stakedPosition(operation.id)) ??
        missing("Staked position", operation.id);
      return row(operation.op, position.name, [
        {
          field: "depositedUnderlying",
          before: position.depositedUnderlying,
          after: operation.deposited,
        },
      ]);
    }
    case "update_staked_current": {
      const position =
        (await lookup.stakedPosition(operation.id)) ??
        missing("Staked position", operation.id);
      return row(operation.op, position.name, [
        {
          field: "currentUnderlying",
          before: position.currentUnderlying,
          after: operation.current,
        },
      ]);
    }
    case "update_staked_receipt": {
      const position =
        (await lookup.stakedPosition(operation.id)) ??
        missing("Staked position", operation.id);
      return row(operation.op, position.name, [
        {
          field: "receiptAmount",
          before: position.receiptAmount,
          after: operation.amount,
        },
      ]);
    }
    case "update_staked_apy": {
      const position =
        (await lookup.stakedPosition(operation.id)) ??
        missing("Staked position", operation.id);
      return row(operation.op, position.name, [
        {
          field: "projectedApy",
          before: position.projectedApy,
          after: operation.apy,
        },
      ]);
    }
    case "update_real_estate_current_value": {
      const property =
        (await lookup.realEstate(operation.id)) ??
        missing("Property", operation.id);
      return row(operation.op, property.name, [
        {
          field: "currentValue",
          before: property.currentValue,
          after: operation.currentValue,
        },
      ]);
    }
    case "update_real_estate_purchase_cost": {
      const property =
        (await lookup.realEstate(operation.id)) ??
        missing("Property", operation.id);
      return row(operation.op, property.name, [
        {
          field: "purchaseCost",
          before: property.purchaseCost,
          after: operation.purchaseCost,
        },
      ]);
    }
  }
}

export function parseOperations(value: unknown): PortfolioOperation[] {
  return z.array(portfolioOperationSchema).min(1).max(20).parse(value);
}

export function parsePreview(value: unknown): ProposalPreviewRow[] {
  return z.array(proposalPreviewRowSchema).parse(value);
}

export function samePreviewValue(a: PreviewValue, b: PreviewValue) {
  if (a == null && b == null) return true;
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
  return a === b;
}

export function previewBeforesMatch(
  stored: ProposalPreviewRow[],
  fresh: ProposalPreviewRow[],
) {
  if (stored.length !== fresh.length) return false;
  return stored.every((row, index) => {
    const other = fresh[index];
    if (
      !other ||
      row.op !== other.op ||
      row.changes.length !== other.changes.length
    ) {
      return false;
    }
    return row.changes.every((change, changeIndex) => {
      const next = other.changes[changeIndex];
      return (
        next != null &&
        change.field === next.field &&
        samePreviewValue(change.before, next.before)
      );
    });
  });
}

export function formatChangeValue(value: PreviewValue) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  return value;
}

export function proposalFromToolOutput(output: unknown): {
  id: number;
  status: ProposalStatus;
  summary: string;
  preview: ProposalPreviewRow[];
} | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  if (typeof o.proposalId !== "number" || !Number.isInteger(o.proposalId)) {
    return null;
  }
  const status = proposalStatusSchema.safeParse(o.status);
  if (!status.success) return null;
  if (typeof o.summary !== "string" || o.summary.trim().length === 0) {
    return null;
  }
  const preview = z.array(proposalPreviewRowSchema).safeParse(o.preview);
  if (!preview.success) return null;
  return {
    id: o.proposalId,
    status: status.data,
    summary: o.summary,
    preview: preview.data,
  };
}

export function proposalReviewUserMessage(
  proposalId: number,
  action: "rejected" | "revision_requested",
  note: string,
) {
  const trimmed = note.trim();
  if (action === "rejected") {
    return trimmed
      ? `I rejected portfolio change proposal #${proposalId}: ${trimmed}\nDo not apply those operations.`
      : `I rejected portfolio change proposal #${proposalId}. Do not apply those operations.`;
  }
  return `I requested changes to portfolio change proposal #${proposalId}: ${trimmed}\nPlease propose a revised change. The previous proposal was not applied.`;
}
