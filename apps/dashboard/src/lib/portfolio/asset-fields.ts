import { z } from "zod";

export const ASSET_CLASSES = [
  "cash",
  "bond",
  "stock",
  "gold",
  "digital_asset",
] as const;

export const ASSET_TYPES = [
  "thai_cash",
  "thai_fixed_cash",
  "foreign_cash",
  "thai_stock",
  "offshore_stock",
  "gold",
  "thai_government_bond",
  "thai_coperate_bond",
  "foreign_government_bond",
  "foreign_coperate_bond",
  "digital_asset",
] as const;

export const RISK_LEVELS = [
  "safe_core",
  "surface_core",
  "lower_satellite",
  "mid_satellite",
  "higher_satellite",
] as const;

export const SYMBOL_TYPES = [
  "thai_stock",
  "thai_mutual_fund",
  "offshore_stock",
  "cryptocurrency",
  "hyperliquid_vault",
] as const;

export const CUSTODY_TYPES = [
  "thai_custodial",
  "foreign_custodial",
  "self_custodial",
  "protocol_custodial",
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];
export type AssetType = (typeof ASSET_TYPES)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type SymbolType = (typeof SYMBOL_TYPES)[number];
export type CustodyType = (typeof CUSTODY_TYPES)[number];

export const ASSET_TYPES_BY_CLASS: Record<AssetClass, readonly AssetType[]> = {
  cash: ["thai_cash", "thai_fixed_cash", "foreign_cash"],
  bond: [
    "thai_government_bond",
    "thai_coperate_bond",
    "foreign_government_bond",
    "foreign_coperate_bond",
  ],
  stock: ["thai_stock", "offshore_stock"],
  gold: ["gold"],
  digital_asset: ["digital_asset"],
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  thai_cash: "Thai cash",
  thai_fixed_cash: "Thai fixed cash",
  foreign_cash: "Foreign cash",
  thai_stock: "Thai stock",
  offshore_stock: "Offshore stock",
  gold: "Gold",
  thai_government_bond: "Thai gov bond",
  thai_coperate_bond: "Thai corp bond",
  foreign_government_bond: "Foreign gov bond",
  foreign_coperate_bond: "Foreign corp bond",
  digital_asset: "Digital asset",
};

export const SYMBOL_TYPE_LABEL: Record<SymbolType, string> = {
  thai_stock: "Thai stock (Yahoo .BK)",
  thai_mutual_fund: "Thai mutual fund (SEC)",
  offshore_stock: "Offshore stock (Yahoo)",
  cryptocurrency: "Crypto (CoinGecko)",
  hyperliquid_vault: "Hyperliquid vault",
};

const id = z.number().int().positive();
const nonNeg = z.number().finite().nonnegative();

export function refineCreateAsset(
  value: {
    assetClass: AssetClass;
    assetType: AssetType;
    symbol?: string | null;
    symbolType?: SymbolType | null;
  },
  ctx: z.RefinementCtx,
) {
  if (!ASSET_TYPES_BY_CLASS[value.assetClass].includes(value.assetType)) {
    ctx.addIssue({
      code: "custom",
      path: ["assetType"],
      message: `${value.assetType} is not valid for class ${value.assetClass}`,
    });
  }
  const symbol = value.symbol?.trim() ?? "";
  if (value.symbolType != null && symbol.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["symbol"],
      message: "symbol is required when symbolType is set",
    });
  }
}

export const createAssetFieldsSchema = z
  .object({
    investmentAccountId: id,
    name: z.string().trim().min(1).max(200),
    symbol: z.string().trim().max(64).nullable().optional(),
    symbolType: z.enum(SYMBOL_TYPES).nullable().optional(),
    assetType: z.enum(ASSET_TYPES),
    assetClass: z.enum(ASSET_CLASSES),
    riskLevel: z.enum(RISK_LEVELS),
    amount: nonNeg,
    unit: z.string().trim().min(1).max(32),
    averageCost: nonNeg,
    currentPrice: nonNeg.optional(),
    currencyId: id,
  })
  .strict()
  .superRefine(refineCreateAsset);

export type CreateAssetFields = z.infer<typeof createAssetFieldsSchema>;

export type ParsedCreateAsset = Omit<
  CreateAssetFields,
  "symbol" | "symbolType" | "currentPrice"
> & {
  symbol: string | null;
  symbolType: SymbolType | null;
  currentPrice: number;
};

export function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

export function parseCreateAssetFields(input: unknown): ParsedCreateAsset {
  const parsed = createAssetFieldsSchema.parse(input);
  return {
    ...parsed,
    symbol: emptyToNull(parsed.symbol),
    symbolType: parsed.symbolType ?? null,
    currentPrice: parsed.currentPrice ?? parsed.averageCost,
  };
}

export function defaultAssetType(assetClass: AssetClass): AssetType {
  return ASSET_TYPES_BY_CLASS[assetClass][0]!;
}

export function defaultSymbolType(
  assetClass: AssetClass,
  assetType: AssetType,
): SymbolType | null {
  if (assetClass === "digital_asset") return "cryptocurrency";
  if (assetType === "thai_stock") return "thai_stock";
  if (assetType === "offshore_stock") return "offshore_stock";
  return null;
}

export function defaultUnit(
  assetClass: AssetClass,
  symbol: string,
  currencySymbol: string,
) {
  const ticker = symbol.trim();
  if (ticker) return ticker;
  if (assetClass === "cash") return currencySymbol || "THB";
  if (assetClass === "stock") return "share";
  if (assetClass === "gold") return "oz";
  if (assetClass === "digital_asset") return "coin";
  return "unit";
}
