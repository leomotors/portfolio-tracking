export type AddressKind = "evm" | "solana";

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HLV_PREFIX = "HLV:";

export function detectAddressKind(value: string): AddressKind | null {
  if (EVM_RE.test(value)) return "evm";
  // All-digit strings are valid base58 but are bank/broker numbers here.
  if (SOLANA_RE.test(value) && !/^\d+$/.test(value)) return "solana";
  return null;
}

export function shortenAddress(value: string): string {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** Splits a `HLV:<vaultAddress>` symbol; null for any other symbol. */
export function splitHlvSymbol(
  symbol: string,
): { prefix: string; address: string } | null {
  if (!symbol.toUpperCase().startsWith(HLV_PREFIX)) return null;
  const address = symbol.slice(HLV_PREFIX.length);
  if (detectAddressKind(address) !== "evm") return null;
  return { prefix: symbol.slice(0, HLV_PREFIX.length), address };
}

export type AccountNoLine = { label: string | null; value: string };

/** One entry per line of `accountNo`, splitting an optional `label: ` prefix. */
export function parseAccountNo(accountNo: string): AccountNoLine[] {
  return accountNo
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.+?):\s+(.+)$/.exec(line);
      return match
        ? { label: match[1], value: match[2] }
        : { label: null, value: line };
    });
}
