/**
 * Title suffix: space + colored circle emoji(s) for Discord (net-worth day-over-day).
 * Tier by |percentDiffNetWorth|: &lt; 1% → 1, &lt; 3% → 2, else 3. Color by netDeltaThb sign.
 */
export function circleEmojiSuffix(
  netDeltaThb: number,
  percentDiffNetWorth: number | null,
): string {
  if (percentDiffNetWorth === null || !Number.isFinite(percentDiffNetWorth)) {
    return "";
  }

  if (netDeltaThb === 0) {
    return "";
  }

  const absPct = Math.abs(percentDiffNetWorth);
  const tier = absPct < 1 ? 1 : absPct < 3 ? 2 : 3;
  const emoji = netDeltaThb > 0 ? "🟢" : "🔴";

  return ` ${emoji.repeat(tier)}`;
}
