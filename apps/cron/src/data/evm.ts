import z from "zod";

import { environment } from "@/core/environment";

// Precomputed 4-byte function selectors (keccak256 of the signature), so no
// keccak dependency is needed for raw eth_call.
const SELECTOR_BALANCE_OF = "0x70a08231"; // balanceOf(address)
const SELECTOR_DECIMALS = "0x313ce567"; // decimals()
const SELECTOR_SYMBOL = "0x95d89b41"; // symbol()
const SELECTOR_GET_RATE = "0x679aefce"; // getRate()
const SELECTOR_GET_RATE_IN_QUOTE_SAFE = "0x820973da"; // getRateInQuoteSafe(address)
const SELECTOR_SUPPLIED_OF = "0x05a5b843"; // suppliedOf(address,address)
const SELECTOR_DEBT_OF = "0x4c4ab169"; // debtOf(address,address)
const SELECTOR_GET_ACCOUNT_DATA = "0x5d78650e"; // getAccountData(address)
const SELECTOR_REGISTERED_ASSETS = "0x89398034"; // registeredAssets()
const SELECTOR_PRICE = "0xaea91078"; // price(address)

/** ether.fi PriceProvider and LendGateway AccountData USD fields */
export const ETHERFI_USD_DECIMALS = 6;

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

/** Consecutive ABI uint256 words from an eth_call result. */
export function decodeUintWords(hex: string): bigint[] {
  const body = hex.replace(/^0x/, "");
  if (body.length === 0 || body.length % 64 !== 0) {
    throw new Error(`Cannot decode uint words from eth_call result: ${hex}`);
  }
  const words: bigint[] = [];
  for (let i = 0; i < body.length; i += 64) {
    words.push(BigInt("0x" + body.slice(i, i + 64)));
  }
  return words;
}

/** ABI-encoded `address[]` (offset, length, padded addresses). */
export function decodeAddressArray(hex: string): string[] {
  const body = hex.replace(/^0x/, "");
  if (body.length < 128) {
    throw new Error(`Cannot decode address[] from eth_call result: ${hex}`);
  }
  const offset = Number(BigInt("0x" + body.slice(0, 64))) * 2;
  const length = Number(BigInt("0x" + body.slice(offset, offset + 64)));
  const start = offset + 64;
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    const word = body.slice(start + i * 64, start + (i + 1) * 64);
    if (word.length < 64) {
      throw new Error(`Truncated address[] at index ${i}`);
    }
    out.push("0x" + word.slice(24));
  }
  return out;
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

export async function ethCall(
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
  /**
   * Where share tokens sit. Default `wallet` is ERC-20 `balanceOf`.
   * `aave_v4` reads `suppliedOf(wallet, vault)` on a LendGateway
   * (vault tokens supplied as lending collateral, not an ERC-20 balance).
   */
  shareSource?: "wallet" | "aave_v4";
  /** LendGateway address; required for `shareSource: "aave_v4"` */
  lendGateway?: string;
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
    fetchShareBalanceHex(config),
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

async function fetchShareBalanceHex(
  config: BoringVaultConfig,
): Promise<string> {
  if (config.shareSource === "aave_v4") {
    if (config.lendGateway == null) {
      throw new Error(
        `shareSource aave_v4 needs lendGateway (wallet ${config.wallet})`,
      );
    }
    return ethCall(
      config.chain,
      config.lendGateway,
      SELECTOR_SUPPLIED_OF +
        encodeAddressParam(config.wallet) +
        encodeAddressParam(config.vault),
    );
  }

  return ethCall(
    config.chain,
    config.vault,
    SELECTOR_BALANCE_OF + encodeAddressParam(config.wallet),
  );
}

export interface LendGatewayAccountData {
  collateralUsd: number;
  debtUsd: number;
  availableBorrowsUsd: number;
  maxBorrowUsd: number;
  /** WAD (1e18 = 1.00). Unbounded / huge when there is no debt. */
  healthFactor: number;
}

export async function fetchLendGatewayAccountData(
  chain: EvmChain,
  lendGateway: string,
  wallet: string,
): Promise<LendGatewayAccountData> {
  const words = decodeUintWords(
    await ethCall(
      chain,
      lendGateway,
      SELECTOR_GET_ACCOUNT_DATA + encodeAddressParam(wallet),
    ),
  );
  if (words.length < 5) {
    throw new Error(
      `getAccountData returned ${words.length} words, expected 5`,
    );
  }
  return {
    collateralUsd: toUnits(words[0]!, ETHERFI_USD_DECIMALS),
    debtUsd: toUnits(words[1]!, ETHERFI_USD_DECIMALS),
    availableBorrowsUsd: toUnits(words[2]!, ETHERFI_USD_DECIMALS),
    maxBorrowUsd: toUnits(words[3]!, ETHERFI_USD_DECIMALS),
    healthFactor: toUnits(words[4]!, 18),
  };
}

export async function fetchLendGatewayRegisteredAssets(
  chain: EvmChain,
  lendGateway: string,
): Promise<string[]> {
  return decodeAddressArray(
    await ethCall(chain, lendGateway, SELECTOR_REGISTERED_ASSETS),
  );
}

export async function fetchLendGatewaySupplied(
  chain: EvmChain,
  lendGateway: string,
  wallet: string,
  asset: string,
): Promise<bigint> {
  return decodeUint(
    await ethCall(
      chain,
      lendGateway,
      SELECTOR_SUPPLIED_OF +
        encodeAddressParam(wallet) +
        encodeAddressParam(asset),
    ),
  );
}

export async function fetchLendGatewayDebt(
  chain: EvmChain,
  lendGateway: string,
  wallet: string,
  asset: string,
): Promise<bigint> {
  return decodeUint(
    await ethCall(
      chain,
      lendGateway,
      SELECTOR_DEBT_OF + encodeAddressParam(wallet) + encodeAddressParam(asset),
    ),
  );
}

export async function fetchErc20Symbol(
  chain: EvmChain,
  token: string,
): Promise<string> {
  return decodeString(await ethCall(chain, token, SELECTOR_SYMBOL));
}

export async function fetchErc20Decimals(
  chain: EvmChain,
  token: string,
): Promise<number> {
  return Number(decodeUint(await ethCall(chain, token, SELECTOR_DECIMALS)));
}

/** ether.fi PriceProvider: USD per whole token, 6 decimals. */
export async function fetchEtherfiUsdPrice(
  chain: EvmChain,
  priceProvider: string,
  token: string,
): Promise<number> {
  return toUnits(
    decodeUint(
      await ethCall(
        chain,
        priceProvider,
        SELECTOR_PRICE + encodeAddressParam(token),
      ),
    ),
    ETHERFI_USD_DECIMALS,
  );
}
