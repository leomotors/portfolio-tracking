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
