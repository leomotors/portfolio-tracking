import { describe, expect, it } from "vitest";

import {
  buildProposalPreview,
  parseOperations,
  type PortfolioOperation,
  portfolioOperationSchema,
  previewBeforesMatch,
  proposalAppliedUserMessage,
  proposalFromToolOutput,
  type ProposalLookup,
  type ProposalPreviewRow,
  proposalReviewUserMessage,
  proposePortfolioChangeInputSchema,
} from "./proposal-ops";

const lookup: ProposalLookup = {
  async bankAccount(id) {
    if (id !== 1) return null;
    return { id: 1, name: "Savings", bank: "Kasikorn", currentBalance: 1000 };
  },
  async asset(id) {
    if (id !== 2) return null;
    return {
      id: 2,
      name: "Bitcoin",
      symbol: "BTC",
      amount: 0.5,
      averageCost: 1_500_000,
      unit: "BTC",
    };
  },
  async investmentAccount(id) {
    if (id !== 3) return null;
    return { id: 3, name: "Binance", currentCost: 80_000, custody: null };
  },
  async pnlEvent(id) {
    if (id !== 4) return null;
    return {
      id: 4,
      investmentAccountId: 3,
      kind: "in_account",
      occurredOn: "2026-01-01",
      pnl: 120,
      currency: "USD",
    };
  },
  async stakedPosition(id) {
    if (id !== 5) return null;
    return {
      id: 5,
      name: "Ether.fi BTC",
      depositedUnderlying: 0.04,
      currentUnderlying: 0.041,
      receiptAmount: 0.04,
      projectedApy: 0.03,
    };
  },
  async realEstate(id) {
    if (id !== 6) return null;
    return {
      id: 6,
      name: "Condo",
      currentValue: 5_000_000,
      purchaseCost: 4_200_000,
    };
  },
  async currency(id) {
    if (id !== 7) return null;
    return { id: 7, symbol: "USD", variant: null };
  },
};

describe("portfolio change operations", () => {
  it("accepts a typed bank balance update", () => {
    expect(
      portfolioOperationSchema.parse({
        op: "update_bank_balance",
        id: 1,
        balance: 2500.5,
      }),
    ).toEqual({ op: "update_bank_balance", id: 1, balance: 2500.5 });
  });

  it("accepts create_asset for a new holding", () => {
    expect(
      portfolioOperationSchema.parse({
        op: "create_asset",
        investmentAccountId: 3,
        name: "Solana",
        symbol: "SOL",
        symbolType: "cryptocurrency",
        assetType: "digital_asset",
        assetClass: "digital_asset",
        riskLevel: "higher_satellite",
        amount: 10,
        unit: "SOL",
        averageCost: 150,
        currencyId: 7,
      }),
    ).toMatchObject({
      op: "create_asset",
      name: "Solana",
      symbol: "SOL",
      amount: 10,
    });
  });

  it("rejects unknown operations and extra keys", () => {
    expect(() =>
      portfolioOperationSchema.parse({
        op: "raw_sql",
        sql: "delete from asset",
      }),
    ).toThrow();
    expect(() =>
      portfolioOperationSchema.parse({
        op: "update_bank_balance",
        id: 1,
        balance: 10,
        sql: "drop table asset",
      }),
    ).toThrow();
  });

  it("rejects negative amounts and empty proposals", () => {
    expect(() =>
      portfolioOperationSchema.parse({
        op: "update_asset_amount",
        id: 2,
        amount: -1,
      }),
    ).toThrow();
    expect(() =>
      proposePortfolioChangeInputSchema.parse({
        summary: "noop",
        operations: [],
      }),
    ).toThrow();
  });

  it("strips nothing: parseOperations only returns catalog ops", () => {
    const operations = parseOperations([
      { op: "update_asset_amount", id: 2, amount: 1.25 },
      {
        op: "create_withdrawn_pnl_event",
        accountId: 3,
        occurredOn: "2026-09-14",
        currencyId: 7,
        pnl: 10,
        withdrawAmount: 100,
        note: "take profit",
      },
    ]);
    expect(operations.map((operation) => operation.op)).toEqual([
      "update_asset_amount",
      "create_withdrawn_pnl_event",
    ]);
  });

  it("builds a before/after preview from current rows", async () => {
    const preview = await buildProposalPreview(
      [
        { op: "update_bank_balance", id: 1, balance: 1500 },
        { op: "update_asset_amount", id: 2, amount: 0.4 },
      ],
      lookup,
    );
    expect(preview).toEqual([
      {
        op: "update_bank_balance",
        label: "Update bank balance",
        target: "Savings · Kasikorn",
        changes: [{ field: "balance", before: 1000, after: 1500 }],
      },
      {
        op: "update_asset_amount",
        label: "Update holding amount",
        target: "Bitcoin (BTC)",
        changes: [{ field: "amount (BTC)", before: 0.5, after: 0.4 }],
      },
    ] satisfies ProposalPreviewRow[]);
  });

  it("previews a new position against the destination account", async () => {
    const preview = await buildProposalPreview(
      [
        {
          op: "create_asset",
          investmentAccountId: 3,
          name: "Solana",
          symbol: "SOL",
          symbolType: "cryptocurrency",
          assetType: "digital_asset",
          assetClass: "digital_asset",
          riskLevel: "higher_satellite",
          amount: 10,
          unit: "SOL",
          averageCost: 150,
          currencyId: 7,
        },
      ],
      lookup,
    );
    expect(preview).toEqual([
      {
        op: "create_asset",
        label: "Add position",
        target: "Solana (SOL) · Binance",
        changes: [
          { field: "account", before: null, after: "Binance" },
          { field: "class", before: null, after: "Digital" },
          { field: "type", before: null, after: "Digital asset" },
          { field: "risk", before: null, after: "Higher Sat." },
          {
            field: "priceSource",
            before: null,
            after: "Crypto (CoinGecko)",
          },
          { field: "amount (SOL)", before: null, after: 10 },
          { field: "averageCost", before: null, after: 150 },
          { field: "currentPrice", before: null, after: 150 },
          { field: "currency", before: null, after: "USD" },
        ],
      },
    ] satisfies ProposalPreviewRow[]);
  });

  it("refuses to preview missing targets", async () => {
    await expect(
      buildProposalPreview(
        [{ op: "update_bank_balance", id: 99, balance: 1 }],
        lookup,
      ),
    ).rejects.toThrow("Bank account 99 was not found");
  });

  it("treats a changed current value as a stale proposal", async () => {
    const operation: PortfolioOperation = {
      op: "update_real_estate_current_value",
      id: 6,
      currentValue: 5_200_000,
    };
    const stored = await buildProposalPreview([operation], lookup);
    const moved: ProposalLookup = {
      ...lookup,
      async realEstate(id) {
        const row = await lookup.realEstate(id);
        return row ? { ...row, currentValue: 5_100_000 } : null;
      },
    };
    const fresh = await buildProposalPreview([operation], moved);
    expect(previewBeforesMatch(stored, fresh)).toBe(false);
    expect(previewBeforesMatch(stored, stored)).toBe(true);
  });

  it("parses a tool output into a reviewable proposal card", () => {
    expect(
      proposalFromToolOutput({
        proposalId: 12,
        status: "pending",
        summary: "Update savings",
        preview: [
          {
            op: "update_bank_balance",
            label: "Update bank balance",
            target: "Savings",
            changes: [{ field: "balance", before: 1, after: 2 }],
          },
        ],
      })?.id,
    ).toBe(12);
    expect(proposalFromToolOutput({ error: "nope" })).toBeNull();
  });

  it("formats follow-up messages for reject and revision", () => {
    expect(proposalReviewUserMessage(3, "rejected", "")).toContain(
      "rejected portfolio change proposal #3",
    );
    expect(
      proposalReviewUserMessage(3, "revision_requested", "amount is 0.5"),
    ).toContain("amount is 0.5");
  });

  it("formats an applied receipt the agent can cite", () => {
    const message = proposalAppliedUserMessage({
      id: 12,
      summary: "Add SOL to Binance",
      preview: [
        {
          op: "create_asset",
          label: "Add position",
          target: "Solana (SOL) · Binance",
          changes: [
            { field: "amount (SOL)", before: null, after: 10 },
            { field: "averageCost", before: null, after: 150 },
          ],
        },
      ],
    });
    expect(message).toContain("approved portfolio change proposal #12");
    expect(message).toContain("written to the database");
    expect(message).toContain("Add SOL to Binance");
    expect(message).toContain(
      "Add position · Solana (SOL) · Binance: amount (SOL) 10; averageCost 150",
    );
    expect(message).toContain("already applied");
  });
});
