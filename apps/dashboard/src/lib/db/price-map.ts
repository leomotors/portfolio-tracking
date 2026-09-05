const COINGECKO_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSymbol(raw: string): string {
  const symbol = raw.trim();
  if (!symbol) throw new Error("Symbol is required");
  if (symbol.length > 64) throw new Error("Symbol is too long");
  return symbol;
}

export function normalizeCoingeckoId(raw: string): string {
  const id = raw.trim().toLowerCase();
  if (!id) throw new Error("CoinGecko id is required");
  if (!COINGECKO_ID_RE.test(id)) {
    throw new Error("CoinGecko id must be a slug like wrapped-bitcoin");
  }
  return id;
}

const SEC_PROJECT_ID_RE = /^[A-Z]{1,2}\d+_\d{4}$/;

export function normalizeSecProjectId(raw: string): string {
  const id = raw.trim().toUpperCase();
  if (!id) throw new Error("SEC project id is required");
  if (!SEC_PROJECT_ID_RE.test(id)) {
    throw new Error("SEC project id must look like M0311_2564");
  }
  return id;
}
