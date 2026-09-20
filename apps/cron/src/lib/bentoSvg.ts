/**
 * Discord bento SVG for the daily cron. librsvg cannot parse oklch(), so
 * accents are hex. Thai names need Noto Sans Thai (DejaVu has no Thai glyphs).
 */

export const BENTO_FONT_SANS =
  "Noto Sans, Noto Sans Thai, DejaVu Sans, sans-serif";
export const BENTO_FONT_MONO = "Noto Sans Mono, DejaVu Sans Mono, monospace";

const SCALE = 2;

const T = {
  bg: "#121110",
  bg2: "#161513",
  surface2: "#1f1d1a",
  surface3: "#26231f",
  ink: "#eae6dd",
  ink2: "#a8a399",
  ink3: "#6f6a61",
  hairline: "#26231f",
  pos: "#4e9a52",
  neg: "#de4e4b",
  pri: "#c99d4e",
} as const;

const W = 1200;
const M = 32;
const G = 16;
const COL = 80;
const PITCH = COL + G;
const NETWORTH_H = 632;
const MOVERS_H = 368;

const thbFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usdFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pctFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const THAI_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;

export type BentoNetworthData = {
  asOfLabel: string;
  asOfTime: string;
  netWorth: number;
  netDelta: number | null;
  bank: number;
  bankDelta: number | null;
  investCost: number;
  investValue: number;
  investValueDelta: number | null;
  realEstate: number;
  realEstateDelta: number | null;
  hasRealEstate: boolean;
  allTimePnl: number;
  allTimePnlDelta: number | null;
  takenPnl: number;
  hasTakenPnl: boolean;
};

export type BentoLendingPosition = {
  name: string;
  leftoverUsd: number;
  cashUsd: number;
  borrowedUsd: number;
  protocolHealthFactor: number | null;
};

export type BentoPerformer = {
  name: string;
  delta: number;
};

export type BentoMoversData = {
  asOfLabel: string;
  top: BentoPerformer | null;
  worst: BentoPerformer | null;
  lending: BentoLendingPosition[];
};

type TextOpts = {
  size?: number;
  weight?: number;
  fill?: string;
  anchor?: "start" | "end" | "middle";
  family?: string;
  tracking?: number;
};

function colX(n: number) {
  return M + (n - 1) * PITCH;
}

function spanW(cols: number) {
  return cols * COL + (cols - 1) * G;
}

function esc(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function thb(n: number) {
  return `${thbFmt.format(n)} THB`;
}

function signedThb(n: number) {
  if (Object.is(n, 0) || Math.abs(n) < 1e-6) return `±${thbFmt.format(0)} THB`;
  const sign = n > 0 ? "+" : "−";
  return `${sign}${thbFmt.format(Math.abs(n))} THB`;
}

function signedUsd(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}$${usdFmt.format(Math.abs(n))}`;
}

function usd(n: number) {
  return `$${usdFmt.format(n)}`;
}

function signedPct(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${pctFmt.format(Math.abs(n))}%`;
}

function deltaFill(n: number | null) {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 1e-6) return T.ink2;
  return n > 0 ? T.pos : T.neg;
}

function charWidth(ch: string, size: number, mono: boolean) {
  if (THAI_MARK.test(ch)) return 0;
  if (mono) return size * 0.6;
  if (ch === " ") return size * 0.28;
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x0e00 && code <= 0x0e7f) return size * 0.64;
  if (ch >= "A" && ch <= "Z") return size * 0.68;
  if (ch >= "0" && ch <= "9") return size * 0.62;
  if (ch === "-" || ch === "–") return size * 0.4;
  return size * 0.54;
}

export function measure(
  text: string,
  size: number,
  { mono = false }: { mono?: boolean } = {},
) {
  let width = 0;
  for (const ch of text) width += charWidth(ch, size, mono);
  return width;
}

function graphemeClusters(text: string): string[] {
  return Intl.Segmenter
    ? [
        ...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text),
      ].map((s) => s.segment)
    : [...text];
}

export function wrapLines(
  text: string,
  maxWidth: number,
  size: number,
  { maxLines = 2, mono = false }: { maxLines?: number; mono?: boolean } = {},
): string[] {
  const tokens: string[] = [];
  let buf = "";
  for (const g of graphemeClusters(text)) {
    if (g === " ") {
      if (buf) tokens.push(buf);
      tokens.push(" ");
      buf = "";
    } else {
      buf += g;
    }
  }
  if (buf) tokens.push(buf);

  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim().length > 0 || lines.length === 0) {
      lines.push(current.trimEnd());
    }
    current = "";
  };

  const pushGraphemes = (word: string) => {
    for (const g of graphemeClusters(word)) {
      const next = current + g;
      if (current && measure(next, size, { mono }) > maxWidth) {
        flush();
        current = g;
      } else {
        current = next;
      }
    }
  };

  for (const token of tokens) {
    if (token === " ") {
      const next = current + " ";
      if (measure(next, size, { mono }) > maxWidth) flush();
      else current = next;
      continue;
    }
    if (measure(token, size, { mono }) > maxWidth) {
      if (current) flush();
      pushGraphemes(token);
      continue;
    }
    const trial = current + token;
    if (current && measure(trial, size, { mono }) > maxWidth) {
      flush();
      current = token;
    } else {
      current = trial;
    }
  }
  if (current) flush();

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1] ?? "";
  let cut = last;
  while (cut && measure(`${cut}…`, size, { mono }) > maxWidth) {
    const clusters = graphemeClusters(cut);
    clusters.pop();
    cut = clusters.join("");
  }
  kept[maxLines - 1] = `${cut}…`;
  return kept;
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  {
    fill,
    rx = 0,
    stroke,
    sw = 1,
  }: { fill: string; rx?: number; stroke?: string; sw?: number },
) {
  const s = stroke
    ? ` stroke="${stroke}" stroke-width="${sw}"`
    : ` stroke="none"`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${s}/>`;
}

function txt(x: number, y: number, content: string, opts: TextOpts = {}) {
  const {
    size = 13,
    weight = 500,
    fill = T.ink,
    anchor = "start",
    family = BENTO_FONT_SANS,
    tracking = 0,
  } = opts;
  const ls = tracking ? ` letter-spacing="${tracking}"` : "";
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="alphabetic"${ls}>${esc(content)}</text>`;
}

function hairline(x1: number, x2: number, y: number) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${T.hairline}" stroke-width="1"/>`;
}

function tile(
  x: number,
  y: number,
  w: number,
  h: number,
  { hero = false, alert = false } = {},
) {
  return rect(x, y, w, h, {
    fill: hero ? T.surface2 : T.bg2,
    rx: hero ? 12 : 8,
    stroke: alert ? T.neg : T.hairline,
  });
}

function microLabel(
  x: number,
  y: number,
  label: string,
  { anchor = "start" }: { anchor?: "start" | "end" } = {},
) {
  return txt(x, y, label.toUpperCase(), {
    size: 12,
    weight: 600,
    fill: T.ink3,
    family: BENTO_FONT_SANS,
    tracking: 1.2,
    anchor,
  });
}

function metaStrip(y: number, left: string, right: string) {
  return [
    txt(M, y + 28, left, {
      size: 13,
      weight: 600,
      fill: T.ink2,
      tracking: 0.6,
    }),
    txt(W - M, y + 28, right, {
      size: 12,
      weight: 500,
      fill: T.ink3,
      anchor: "end",
      family: BENTO_FONT_MONO,
    }),
    hairline(M, W - M, y + 40),
  ].join("");
}

function compositionBar(
  data: BentoNetworthData,
  x: number,
  y: number,
  w: number,
) {
  const parts = [
    { label: "Investments", value: data.investValue, fill: T.pri },
    {
      label: "Real estate",
      value: data.hasRealEstate ? data.realEstate : 0,
      fill: T.ink2,
    },
    { label: "Bank", value: data.bank, fill: T.ink3 },
  ].filter((p) => p.value > 0);

  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  const gap = 2;
  const usable = w - gap * Math.max(parts.length - 1, 0);
  let cursor = x;
  const bars: string[] = [];
  const labels: string[] = [];

  for (const [i, part] of parts.entries()) {
    const bw = Math.max(4, (part.value / total) * usable);
    bars.push(rect(cursor, y, bw, 10, { fill: part.fill, rx: 6 }));
    cursor += bw + gap;
    labels.push(`${part.label} ${pctFmt.format((part.value / total) * 100)}%`);
    if (i < parts.length - 1) labels.push("·");
  }

  return [
    ...bars,
    txt(x, y + 32, labels.join("  "), {
      size: 12,
      weight: 500,
      fill: T.ink2,
      family: BENTO_FONT_MONO,
    }),
  ].join("");
}

function sleeveDelta(
  x: number,
  y: number,
  delta: number | null,
  fallback: string,
) {
  if (delta == null) {
    return txt(x, y, fallback, { size: 16, weight: 500, fill: T.ink3 });
  }
  if (Math.abs(delta) < 1e-6) {
    return txt(x, y, "Unchanged", { size: 16, weight: 500, fill: T.ink3 });
  }
  return txt(x, y, signedThb(delta), {
    size: 16,
    weight: 600,
    fill: T.ink2,
    family: BENTO_FONT_MONO,
  });
}

function svgDoc(width: number, height: number, inner: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${height * SCALE}" viewBox="0 0 ${width} ${height}">
${inner}
</svg>`;
}

export function renderNetworthSvg(data: BentoNetworthData): string {
  const hero = { x: colX(1), y: 88, w: spanW(8), h: 264 };
  const pnl = { x: colX(9), y: 88, w: spanW(4), h: 264 };
  const bank = { x: colX(1), y: 368, w: spanW(3), h: 172 };
  const inv = { x: colX(4), y: 368, w: spanW(5), h: 172 };
  const re = { x: colX(9), y: 368, w: spanW(4), h: 172 };

  const dayPct =
    data.netDelta != null && data.netWorth - data.netDelta !== 0
      ? (data.netDelta / (data.netWorth - data.netDelta)) * 100
      : null;
  const pnlPct =
    data.investCost === 0 ? null : (data.allTimePnl / data.investCost) * 100;
  const openPnl = data.investValue - data.investCost;

  const netDeltaLine =
    data.netDelta == null
      ? txt(hero.x + 32, 274, "Day change unavailable", {
          size: 18,
          weight: 500,
          fill: T.ink3,
        })
      : [
          txt(hero.x + 32, 274, `Today ${signedThb(data.netDelta)}`, {
            size: 22,
            weight: 600,
            fill: deltaFill(data.netDelta),
            family: BENTO_FONT_MONO,
          }),
          dayPct == null
            ? ""
            : txt(
                hero.x +
                  32 +
                  measure(`Today ${signedThb(data.netDelta)} `, 22, {
                    mono: true,
                  }),
                274,
                signedPct(dayPct),
                {
                  size: 18,
                  weight: 600,
                  fill: deltaFill(data.netDelta),
                  family: BENTO_FONT_MONO,
                },
              ),
        ].join("");

  const body = [
    rect(0, 0, W, NETWORTH_H, { fill: T.bg }),
    metaStrip(32, `PORTFOLIO · ${data.asOfLabel}`, data.asOfTime),

    tile(hero.x, hero.y, hero.w, hero.h, { hero: true }),
    microLabel(hero.x + 32, 130, "Total net worth"),
    txt(hero.x + 32, 224, thb(data.netWorth), {
      size: 56,
      weight: 600,
      family: BENTO_FONT_MONO,
    }),
    netDeltaLine,
    txt(hero.x + 32, 316, "Bank + investments + property", {
      size: 14,
      weight: 400,
      fill: T.ink2,
    }),

    tile(pnl.x, pnl.y, pnl.w, pnl.h),
    microLabel(
      pnl.x + 24,
      126,
      data.hasTakenPnl ? "All-time P/L" : "Current P/L",
    ),
    txt(pnl.x + 24, 186, thb(data.allTimePnl), {
      size: 34,
      weight: 600,
      family: BENTO_FONT_MONO,
    }),
    data.allTimePnlDelta == null
      ? ""
      : txt(pnl.x + 24, 226, signedThb(data.allTimePnlDelta), {
          size: 20,
          weight: 600,
          fill: deltaFill(data.allTimePnlDelta),
          family: BENTO_FONT_MONO,
        }),
    hairline(pnl.x + 24, pnl.x + pnl.w - 24, 258),
    txt(
      pnl.x + 24,
      286,
      pnlPct == null ? "— on cost" : `${signedPct(pnlPct)} on cost`,
      { size: 14, weight: 400, fill: T.ink2 },
    ),
    data.hasTakenPnl
      ? txt(
          pnl.x + 24,
          316,
          `Open ${thbFmt.format(openPnl)} · Taken ${thbFmt.format(data.takenPnl)}`,
          { size: 13, weight: 500, fill: T.ink3, family: BENTO_FONT_MONO },
        )
      : "",

    tile(bank.x, bank.y, bank.w, bank.h),
    microLabel(bank.x + 24, 400, "Bank"),
    txt(bank.x + 24, 452, thb(data.bank), {
      size: 24,
      weight: 600,
      family: BENTO_FONT_MONO,
    }),
    sleeveDelta(bank.x + 24, 488, data.bankDelta, "Liquid cash"),

    tile(inv.x, inv.y, inv.w, inv.h),
    microLabel(inv.x + 24, 400, "Investment value"),
    txt(inv.x + 24, 456, thb(data.investValue), {
      size: 28,
      weight: 600,
      family: BENTO_FONT_MONO,
    }),
    data.investValueDelta == null
      ? ""
      : txt(inv.x + 24, 488, signedThb(data.investValueDelta), {
          size: 18,
          weight: 600,
          fill: deltaFill(data.investValueDelta),
          family: BENTO_FONT_MONO,
        }),
    txt(inv.x + 24, 516, `Cost ${thb(data.investCost)}`, {
      size: 13,
      weight: 500,
      fill: T.ink3,
      family: BENTO_FONT_MONO,
    }),

    tile(re.x, re.y, re.w, re.h),
    microLabel(re.x + 24, 400, "Real estate"),
    txt(re.x + 24, 452, data.hasRealEstate ? thb(data.realEstate) : "—", {
      size: 24,
      weight: 600,
      family: BENTO_FONT_MONO,
    }),
    data.hasRealEstate
      ? sleeveDelta(re.x + 24, 488, data.realEstateDelta, "Unchanged")
      : txt(re.x + 24, 488, "Not tracked", {
          size: 16,
          weight: 500,
          fill: T.ink3,
        }),

    compositionBar(data, M, 564, spanW(12)),
  ].join("");

  return svgDoc(W, NETWORTH_H, body);
}

function performerBlock({
  tag,
  performer,
  empty,
  nameY,
  deltaY,
  nameX,
  nameW,
  deltaX,
}: {
  tag: string;
  performer: BentoPerformer | null;
  empty: string;
  nameY: number;
  deltaY: number;
  nameX: number;
  nameW: number;
  deltaX: number;
}) {
  if (!performer) {
    return [
      txt(nameX, nameY - 28, tag, {
        size: 11,
        weight: 600,
        fill: T.ink3,
        tracking: 1.2,
      }),
      txt(nameX, nameY, empty, { size: 16, weight: 500, fill: T.ink2 }),
    ].join("");
  }

  const lines = wrapLines(performer.name, nameW, 20, { maxLines: 2 });
  const nameTexts = lines.map((line, i) =>
    txt(nameX, nameY + i * 26, line, { size: 20, weight: 500, fill: T.ink }),
  );
  return [
    txt(nameX, nameY - 28, tag, {
      size: 11,
      weight: 600,
      fill: T.ink3,
      tracking: 1.2,
    }),
    ...nameTexts,
    txt(deltaX, deltaY, signedThb(performer.delta), {
      size: 26,
      weight: 600,
      fill: deltaFill(performer.delta),
      family: BENTO_FONT_MONO,
      anchor: "end",
    }),
  ].join("");
}

function lendingOne(
  pos: BentoLendingPosition,
  box: { x: number; y: number; w: number; h: number },
) {
  const pad = 24;
  const inner = box.w - pad * 2;
  const under = pos.leftoverUsd < 0;
  const status = under ? "Shortfall" : "Surplus";
  const maxBar = Math.max(pos.cashUsd, pos.borrowedUsd, 1);
  const trackW = inner - 150;
  const cashW = Math.max(6, (pos.cashUsd / maxBar) * trackW);
  const borrowW = Math.max(6, (pos.borrowedUsd / maxBar) * trackW);
  const name = wrapLines(pos.name, inner, 16, { maxLines: 1 })[0] ?? pos.name;
  const hf =
    pos.protocolHealthFactor == null
      ? "Protocol HF not reported"
      : `Protocol HF ${pos.protocolHealthFactor.toFixed(2)}`;

  return [
    tile(box.x, box.y, box.w, box.h, { alert: under }),
    microLabel(box.x + pad, box.y + 34, "Lending health"),
    txt(box.x + box.w - pad, box.y + 34, "1 POSITION", {
      size: 11,
      weight: 500,
      fill: T.ink3,
      anchor: "end",
      family: BENTO_FONT_MONO,
    }),
    txt(box.x + pad, box.y + 64, name, { size: 16, weight: 500, fill: T.ink }),
    microLabel(box.x + pad, box.y + 98, "Leftover cash"),
    txt(box.x + box.w - pad, box.y + 98, status.toUpperCase(), {
      size: 11,
      weight: 600,
      fill: deltaFill(pos.leftoverUsd),
      anchor: "end",
      tracking: 1.1,
    }),
    txt(box.x + pad, box.y + 142, signedUsd(pos.leftoverUsd), {
      size: 40,
      weight: 600,
      fill: deltaFill(pos.leftoverUsd),
      family: BENTO_FONT_MONO,
    }),
    rect(box.x + pad, box.y + 164, trackW, 8, { fill: T.surface3, rx: 6 }),
    rect(box.x + pad, box.y + 164, cashW, 8, { fill: T.ink2, rx: 6 }),
    txt(box.x + box.w - pad, box.y + 172, `Cash ${usd(pos.cashUsd)}`, {
      size: 11,
      weight: 500,
      fill: T.ink2,
      family: BENTO_FONT_MONO,
      anchor: "end",
    }),
    rect(box.x + pad, box.y + 186, trackW, 8, { fill: T.surface3, rx: 6 }),
    rect(box.x + pad, box.y + 186, borrowW, 8, { fill: T.ink3, rx: 6 }),
    txt(box.x + box.w - pad, box.y + 194, `Borrowed ${usd(pos.borrowedUsd)}`, {
      size: 11,
      weight: 500,
      fill: T.ink2,
      family: BENTO_FONT_MONO,
      anchor: "end",
    }),
    txt(box.x + pad, box.y + box.h - 20, hf, {
      size: 12,
      weight: 500,
      fill: T.ink3,
      family: BENTO_FONT_MONO,
    }),
  ].join("");
}

function lendingMany(
  positions: BentoLendingPosition[],
  box: { x: number; y: number; w: number; h: number },
) {
  const pad = 24;
  const inner = box.w - pad * 2;
  const sorted = [...positions].sort((a, b) => {
    const hfA = a.protocolHealthFactor ?? 99;
    const hfB = b.protocolHealthFactor ?? 99;
    if (hfA !== hfB) return hfA - hfB;
    return a.leftoverUsd - b.leftoverUsd;
  });
  const shown = sorted.slice(0, 3);
  const extra = sorted.length - shown.length;

  const rows = shown.map((pos, i) => {
    const y = box.y + 50 + i * 64;
    const name =
      wrapLines(pos.name, inner - 130, 15, { maxLines: 1 })[0] ?? pos.name;
    const hf =
      pos.protocolHealthFactor == null
        ? "HF not reported"
        : `HF ${pos.protocolHealthFactor.toFixed(2)}`;
    return [
      i === 0 ? "" : hairline(box.x + pad, box.x + box.w - pad, y - 8),
      txt(box.x + pad, y + 16, name, { size: 15, weight: 500, fill: T.ink }),
      txt(box.x + box.w - pad, y + 16, signedUsd(pos.leftoverUsd), {
        size: 18,
        weight: 600,
        fill: deltaFill(pos.leftoverUsd),
        family: BENTO_FONT_MONO,
        anchor: "end",
      }),
      txt(
        box.x + pad,
        y + 38,
        `Cash ${usd(pos.cashUsd)} · Borrowed ${usd(pos.borrowedUsd)} · ${hf}`,
        { size: 11, weight: 500, fill: T.ink3, family: BENTO_FONT_MONO },
      ),
    ].join("");
  });

  return [
    tile(box.x, box.y, box.w, box.h),
    microLabel(box.x + pad, box.y + 34, "Lending health"),
    txt(
      box.x + box.w - pad,
      box.y + 34,
      `${positions.length} POSITION${positions.length === 1 ? "" : "S"}`,
      {
        size: 11,
        weight: 500,
        fill: T.ink3,
        anchor: "end",
        family: BENTO_FONT_MONO,
      },
    ),
    ...rows,
    extra > 0
      ? txt(box.x + pad, box.y + box.h - 18, `+${extra} more`, {
          size: 12,
          weight: 500,
          fill: T.ink3,
        })
      : "",
  ].join("");
}

/** Returns null when there are no movers and no lending to show. */
export function renderMoversSvg(data: BentoMoversData): string | null {
  const hasLending = data.lending.length > 0;
  const hasMovers = data.top != null && data.worst != null;
  if (!hasLending && !hasMovers) return null;

  const movers = hasLending
    ? { x: colX(1), y: 88, w: spanW(7), h: 248 }
    : { x: colX(1), y: 88, w: spanW(12), h: 248 };
  const lendBox = { x: colX(8), y: 88, w: spanW(5), h: 248 };
  const nameW = hasLending ? 360 : 720;
  const nameX = movers.x + 24;
  const deltaX = movers.x + movers.w - 24;

  const lending = !hasLending
    ? ""
    : data.lending.length === 1
      ? lendingOne(data.lending[0]!, lendBox)
      : lendingMany(data.lending, lendBox);

  const body = [
    rect(0, 0, W, MOVERS_H, { fill: T.bg }),
    metaStrip(
      32,
      `DAY MOVERS & CREDIT · ${data.asOfLabel}`,
      "VS PREVIOUS SNAPSHOT",
    ),
    tile(movers.x, movers.y, movers.w, movers.h),
    performerBlock({
      tag: "TOP",
      performer: data.top,
      empty: "Day movers available from the next run",
      nameY: 158,
      deltaY: 166,
      nameX,
      nameW,
      deltaX,
    }),
    hairline(nameX, deltaX, 212),
    performerBlock({
      tag: "WORST",
      performer: data.worst,
      empty: "No loss recorded",
      nameY: 244,
      deltaY: 252,
      nameX,
      nameW,
      deltaX,
    }),
    lending,
  ].join("");

  return svgDoc(W, MOVERS_H, body);
}
