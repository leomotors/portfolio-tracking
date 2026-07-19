import z from "zod";

const delegatorSummarySchema = z.object({
  delegated: z.coerce.number(),
  undelegated: z.coerce.number(),
  totalPendingWithdrawal: z.coerce.number(),
});

/**
 * Total HYPE a user has in staking on Hyperliquid L1: delegated (rewards
 * auto-compound into this), undelegated, and pending withdrawals. Free
 * keyless info API.
 */
export async function fetchHyperliquidStake(user: string): Promise<number> {
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "delegatorSummary", user }),
  });

  if (!res.ok) {
    throw new Error(
      `Hyperliquid delegatorSummary failed: ${res.statusText} ${await res.text()}`,
    );
  }

  const summary = delegatorSummarySchema.parse(await res.json());
  return (
    summary.delegated + summary.undelegated + summary.totalPendingWithdrawal
  );
}
