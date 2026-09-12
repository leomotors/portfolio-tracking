import { describe, expect, it } from "vitest";

import { pnlLines } from "./summary";

describe("pnlLines", () => {
  it("keeps the single Current P/L line when nothing was ever withdrawn", () => {
    expect(
      pnlLines(
        { openPnl: 12_340, cost: 100_000, taken: 0 },
        { openPnl: 11_340, taken: 0 },
      ),
    ).toBe("Current P/L: 12.34% (+1,000 THB)");
  });

  it("omits the delta with no prior snapshot", () => {
    expect(pnlLines({ openPnl: 12_340, cost: 100_000, taken: 0 }, null)).toBe(
      "Current P/L: 12.34%",
    );
  });

  it("reports 0.00% rather than dividing by a zero cost basis", () => {
    expect(pnlLines({ openPnl: 0, cost: 0, taken: 0 }, null)).toBe(
      "Current P/L: 0.00%",
    );
  });

  it("adds taken P/L back and breaks open / taken out", () => {
    expect(
      pnlLines(
        { openPnl: 10_000, cost: 81_000, taken: 50_000 },
        { openPnl: 8_766, taken: 50_000 },
      ),
    ).toBe(
      "All-time P/L: 60,000 THB (+1,234 THB)\n" +
        "  open 10,000 THB (12.35%) · taken 50,000 THB",
    );
  });

  // The regression: withdrawing 100,000 that held 30,000 of profit drops
  // value by 100,000 and cost by 70,000, so open P/L falls by exactly the
  // 30,000 taken. The all-time delta must be flat, not -30,000.
  it("shows no day loss when a withdrawal only moves profit out", () => {
    const previous = { openPnl: 30_000, taken: 0 };
    const current = { openPnl: 0, cost: 100_000, taken: 30_000 };

    expect(current.openPnl - previous.openPnl).toBe(-30_000);
    expect(pnlLines(current, previous)).toBe(
      "All-time P/L: 30,000 THB\n  open 0 THB (0.00%) · taken 30,000 THB",
    );
  });

  // A withdrawal booked today is in the live total but not in yesterday's
  // as-of total, so the day's real price move still comes through.
  it("keeps the day's price movement alongside a same-day withdrawal", () => {
    expect(
      pnlLines(
        { openPnl: 500, cost: 100_000, taken: 30_000 },
        { openPnl: 30_000, taken: 0 },
      ),
    ).toBe(
      "All-time P/L: 30,500 THB (+500 THB)\n" +
        "  open 500 THB (0.50%) · taken 30,000 THB",
    );
  });

  it("switches to the all-time line for a prior-only taken total", () => {
    expect(
      pnlLines(
        { openPnl: 1_000, cost: 10_000, taken: 0 },
        { openPnl: 1_000, taken: 5_000 },
      ),
    ).toBe(
      "All-time P/L: 1,000 THB (-5,000 THB)\n" +
        "  open 1,000 THB (10.00%) · taken 0 THB",
    );
  });

  it("reports a negative all-time total", () => {
    expect(
      pnlLines({ openPnl: -12_000, cost: 100_000, taken: 2_000 }, null),
    ).toBe(
      "All-time P/L: -10,000 THB\n  open -12,000 THB (-12.00%) · taken 2,000 THB",
    );
  });
});
