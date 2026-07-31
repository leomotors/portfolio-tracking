import z from "zod";

import { environment } from "@/core/environment";

// Precomputed 4-byte function selectors (keccak256 of the signature), so no
// keccak dependency is needed for raw eth_call.
const SELECTOR_BALANCE_OF = "0x70a08231"; // balanceOf(address)
const SELECTOR_DECIMALS = "0x313ce567"; // decimals()
const SELECTOR_SYMBOL = "0x95d89b41"; // symbol()
const SELECTOR_GET_RATE = "0x679aefce"; // getRate()
const SELECTOR_GET_RATE_IN_QUOTE_SAFE = "0x820973da"; // getRateInQuoteSafe(address)

const callResultSchema = z.object({ result: z.string() });

export function encodeAddressParam(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return hex.padStart(64, "0");
}

export function decodeUint(hex: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Cannot decode uint from eth_call result: ${hex}`);
  }
  return BigInt(hex);
}

/** Decodes a solidity `string` return value (offset, length, utf8 data). */
export function decodeString(hex: string): string {
  const body = hex.replace(/^0x/, "");
  const length = Number(BigInt("0x" + body.slice(64, 128)));
  const data = body.slice(128, 128 + length * 2);
  return Buffer.from(data, "hex").toString("utf8");
}

export function toUnits(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

export type EvmChain = "ethereum" | "optimism";

function rpcUrlForChain(chain: EvmChain): string {
  switch (chain) {
    case "ethereum":
      return environment.ETH_RPC_URL;
    case "optimism":
      return environment.OP_RPC_URL;
  }
}

async function ethCall(
  chain: EvmChain,
  to: string,
  data: string,
): Promise<string> {
  const res = await fetch(rpcUrlForChain(chain), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });

  if (!res.ok) {
    throw new Error(
      `eth_call to ${to} failed: ${res.statusText} ${await res.text()}`,
    );
  }

  const json = (await res.json()) as { error?: unknown };
  if (json.error) {
    throw new Error(`eth_call to ${to} error: ${JSON.stringify(json.error)}`);
  }

  const { result } = callResultSchema.parse(json);
  if (!result || result === "0x") {
    throw new Error(`eth_call to ${to} returned no data (wrong address?)`);
  }
  return result;
}

export interface BoringVaultConfig {
  /** Which L1/L2 hosts the vault — picks ETH_RPC_URL or OP_RPC_URL */
  chain: EvmChain;
  /** Wallet holding the vault share tokens */
  wallet: string;
  /** Vault share token (BoringVault), e.g. liquidBTC / liquidETH */
  vault: string;
  /** AccountantWithRateProviders exposing getRate() */
  accountant: string;
  /** Decimals of the rate (= the quote asset's decimals) */
  rateDecimals: number;
  /** "base" (default) uses getRate(); an ERC20 address uses getRateInQuoteSafe */
  quote?: string;
  /** When set, the vault's on-chain symbol() must match (typo guard) */
  vaultSymbol?: string;
}

export interface BoringVaultBalance {
  /** Vault share tokens held (what the wallet literally shows) */
  shares: number;
  /** Underlying per share from the accountant */
  rate: number;
  /** shares x rate — underlying value in the quote asset */
  underlying: number;
}

/**
 * Current position in an Ether.fi Liquid (Veda BoringVault) vault: share
 * balance and its underlying value via the accountant's exchange rate.
 */
export async function fetchBoringVaultUnderlying(
  config: BoringVaultConfig,
): Promise<BoringVaultBalance> {
  const { chain } = config;

  if (config.vaultSymbol) {
    const symbol = decodeString(
      await ethCall(chain, config.vault, SELECTOR_SYMBOL),
    );
    if (symbol !== config.vaultSymbol) {
      throw new Error(
        `Vault ${config.vault} symbol is "${symbol}", expected "${config.vaultSymbol}"`,
      );
    }
  }

  const rateCall =
    config.quote && config.quote !== "base"
      ? ethCall(
          chain,
          config.accountant,
          SELECTOR_GET_RATE_IN_QUOTE_SAFE + encodeAddressParam(config.quote),
        )
      : ethCall(chain, config.accountant, SELECTOR_GET_RATE);

  const [sharesHex, shareDecimalsHex, rateHex] = await Promise.all([
    ethCall(
      chain,
      config.vault,
      SELECTOR_BALANCE_OF + encodeAddressParam(config.wallet),
    ),
    ethCall(chain, config.vault, SELECTOR_DECIMALS),
    rateCall,
  ]);

  const shares = toUnits(
    decodeUint(sharesHex),
    Number(decodeUint(shareDecimalsHex)),
  );
  const rate = toUnits(decodeUint(rateHex), config.rateDecimals);
  return { shares, rate, underlying: shares * rate };
}
