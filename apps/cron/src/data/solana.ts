import z from "zod";

import { environment } from "@/core/environment";
import { logger } from "@/core/logger";

const LAMPORTS_PER_SOL = 1_000_000_000;

const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";
/** Stake account layout: Meta.authorized.withdrawer sits at byte 44 */
const WITHDRAW_AUTHORITY_OFFSET = 44;
/** All stake accounts have exactly 200 bytes of data */
const STAKE_ACCOUNT_DATA_SIZE = 200;

const balanceResultSchema = z.object({
  result: z.object({ value: z.number() }),
});

const programAccountsSchema = z.object({
  result: z.array(
    z.object({
      pubkey: z.string(),
      account: z.object({ lamports: z.number() }),
    }),
  ),
});

/**
 * Sums the SOL balance of native stake accounts via JSON-RPC getBalance.
 * Staking rewards are credited to the stake account each epoch, so the
 * balance already includes them (plus the rent-exempt reserve you own).
 */
export async function fetchSolanaStakeBalance(
  stakeAccounts: string[],
): Promise<number> {
  let total = 0;

  for (const account of stakeAccounts) {
    const res = await fetch(environment.SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [account],
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Solana RPC getBalance failed for ${account}: ${res.statusText} ${await res.text()}`,
      );
    }

    const json = (await res.json()) as { error?: unknown };
    if (json.error) {
      throw new Error(
        `Solana RPC error for ${account}: ${JSON.stringify(json.error)}`,
      );
    }

    total += balanceResultSchema.parse(json).result.value / LAMPORTS_PER_SOL;
  }

  return total;
}

/**
 * Discovers every stake account whose withdraw authority is the given wallet
 * and sums their total SOL (delegated + rent reserve + undelegated). New
 * delegations create new stake accounts, so discovery picks them up without
 * config edits. Zero-length dataSlice keeps the response tiny.
 */
export async function fetchSolanaStakeBalanceByAuthority(
  withdrawAuthority: string,
): Promise<number> {
  const res = await fetch(environment.SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        STAKE_PROGRAM_ID,
        {
          encoding: "base64",
          dataSlice: { offset: 0, length: 0 },
          filters: [
            { dataSize: STAKE_ACCOUNT_DATA_SIZE },
            {
              memcmp: {
                offset: WITHDRAW_AUTHORITY_OFFSET,
                bytes: withdrawAuthority,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Solana RPC getProgramAccounts failed: ${res.statusText} ${await res.text()}`,
    );
  }

  const json = (await res.json()) as { error?: unknown };
  if (json.error) {
    throw new Error(
      `Solana RPC error discovering stake accounts: ${JSON.stringify(json.error)}`,
    );
  }

  const accounts = programAccountsSchema.parse(json).result;
  if (accounts.length === 0) {
    // Discovery failure and an emptied wallet look identical; treat as an
    // error so the sync falls back to projection instead of zeroing out.
    throw new Error(
      `No stake accounts found for withdraw authority ${withdrawAuthority} ` +
        `(RPC may not support getProgramAccounts — use explicit stakeAccounts)`,
    );
  }

  logger.log(
    `  Discovered ${accounts.length} stake account(s) for ${withdrawAuthority}:\n` +
      accounts
        .map(
          (a) =>
            `    - ${a.pubkey}: ${a.account.lamports / LAMPORTS_PER_SOL} SOL`,
        )
        .join("\n"),
  );

  return accounts.reduce(
    (sum, a) => sum + a.account.lamports / LAMPORTS_PER_SOL,
    0,
  );
}
