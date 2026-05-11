export interface ThbOptions {
  sign?: boolean;
  decimals?: number;
}

export function thb(value: number, opts: ThbOptions = {}) {
  const { sign = false, decimals = 0 } = opts;
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (sign) return (value >= 0 ? "+" : "−") + "฿" + abs;
  return (value < 0 ? "−" : "") + "฿" + abs;
}

export function pct(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "—";
  const abs = (Math.abs(value) * 100).toFixed(decimals);
  return (value >= 0 ? "+" : "−") + abs + "%";
}

export function nativeAmount(value: number, code: string, decimals?: number) {
  const d = decimals ?? (code === "JPY" ? 0 : 2);
  return (
    value.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }) +
    " " +
    code
  );
}

const STALE_THRESHOLD_HOURS = 24;

export function isStale(
  date: Date | string | null | undefined,
  now: Date = new Date(),
) {
  if (!date) return true;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return true;
  const diffHours = (now.getTime() - d.getTime()) / 3_600_000;
  return diffHours > STALE_THRESHOLD_HOURS;
}

export function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + "th";
  switch (n % 10) {
    case 1:
      return n + "st";
    case 2:
      return n + "nd";
    case 3:
      return n + "rd";
    default:
      return n + "th";
  }
}

export function num(value: number | null | undefined, decimals = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
