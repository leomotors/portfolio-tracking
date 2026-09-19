export const CLASS_COLOR: Record<string, string> = {
  cash: "oklch(0.72 0.10 235)",
  bond: "oklch(0.72 0.10 195)",
  stock: "oklch(0.70 0.10 145)",
  gold: "oklch(0.78 0.11 80)",
  digital_asset: "oklch(0.65 0.13 305)",
  real_estate: "oklch(0.62 0.10 40)",
};

export const RISK_COLOR: Record<string, string> = {
  safe_core: "oklch(0.78 0.06 235)",
  surface_core: "oklch(0.72 0.08 200)",
  lower_satellite: "oklch(0.70 0.10 150)",
  mid_satellite: "oklch(0.72 0.11 80)",
  higher_satellite: "oklch(0.65 0.14 30)",
};

export const CLASS_LABEL: Record<string, string> = {
  cash: "Cash",
  bond: "Bond",
  stock: "Stock",
  gold: "Gold",
  digital_asset: "Digital",
  real_estate: "Real Estate",
};

export const TYPE_COLOR: Record<string, string> = {
  thai_cash: "oklch(0.72 0.10 235)",
  thai_fixed_cash: "oklch(0.68 0.09 255)",
  foreign_cash: "oklch(0.70 0.10 210)",
  thai_stock: "oklch(0.70 0.10 145)",
  offshore_stock: "oklch(0.68 0.12 170)",
  gold: "oklch(0.78 0.11 80)",
  thai_government_bond: "oklch(0.72 0.10 195)",
  thai_coperate_bond: "oklch(0.68 0.09 175)",
  foreign_government_bond: "oklch(0.70 0.10 215)",
  foreign_coperate_bond: "oklch(0.66 0.08 185)",
  digital_asset: "oklch(0.65 0.13 305)",
  real_estate: "oklch(0.62 0.10 40)",
};

export const TYPE_LABEL: Record<string, string> = {
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
  real_estate: "Real Estate",
};

export const RISK_LABEL: Record<string, string> = {
  safe_core: "Safe Core",
  surface_core: "Surface Core",
  lower_satellite: "Lower Sat.",
  mid_satellite: "Mid Sat.",
  higher_satellite: "Higher Sat.",
};

export const RISK_ORDER = [
  "safe_core",
  "surface_core",
  "lower_satellite",
  "mid_satellite",
  "higher_satellite",
] as const;

export const CUSTODY_COLOR: Record<string, string> = {
  unclassified: "oklch(0.72 0.02 250)",
  thai_custodial: "oklch(0.72 0.10 235)",
  foreign_custodial: "oklch(0.70 0.10 145)",
  self_custodial: "oklch(0.65 0.13 305)",
  protocol_custodial: "oklch(0.72 0.11 80)",
};

export const CUSTODY_LABEL: Record<string, string> = {
  unclassified: "Unclassified",
  thai_custodial: "Thai custodial",
  foreign_custodial: "Foreign custodial",
  self_custodial: "Self-custodial",
  protocol_custodial: "Protocol custodial",
};

export const UNCLASSIFIED_CUSTODY = "unclassified";

export const CUSTODY_ORDER = [
  UNCLASSIFIED_CUSTODY,
  "thai_custodial",
  "foreign_custodial",
  "self_custodial",
  "protocol_custodial",
] as const;

export const CARD_BG: Record<string, string> = {
  visa: "oklch(0.30 0.04 250)",
  mastercard: "oklch(0.32 0.06 30)",
  american_express: "oklch(0.32 0.04 220)",
  jcb: "oklch(0.32 0.05 145)",
  unionpay: "oklch(0.30 0.04 0)",
};

export const CURRENCY_PALETTE = [
  "oklch(0.72 0.10 235)",
  "oklch(0.70 0.10 145)",
  "oklch(0.78 0.11 80)",
  "oklch(0.65 0.13 305)",
  "oklch(0.72 0.10 195)",
];
