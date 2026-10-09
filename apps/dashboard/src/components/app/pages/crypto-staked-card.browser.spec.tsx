import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { type StakedDailyPoint, type StakedPosition } from "@/lib/db/queries";

import { buildStakedGroupStat, StakedGroupCard } from "./crypto-staked-card";

const actions = vi.hoisted(() => ({
  updateStakedApy: vi.fn(async () => {}),
  updateStakedCurrent: vi.fn(async () => {}),
  updateStakedDeposited: vi.fn(async () => {}),
  updateStakedReceipt: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/actions", () => actions);

const ACCOUNTS = new Map([
  [731, "Wallet A"],
  [482, "Wallet B"],
]);

function position(overrides: Partial<StakedPosition>): StakedPosition {
  return {
    id: 263,
    assetId: 9104,
    name: "Ether.fi Liquid BTC",
    provider: "etherfi_liquid",
    underlyingSymbol: "WBTC",
    depositedUnderlying: 0.4,
    currentUnderlying: 0.42,
    receiptSymbol: "liquidBTC",
    receiptAmount: 0.4,
    projectedApy: 0.03,
    stakedSince: "2025-03-01",
    syncSource: "chain",
    syncedAt: new Date("2025-06-02T09:00:00Z"),
    syncError: null,
    currentPrice: 60_000,
    currencyId: 7,
    investmentAccountId: 731,
    ...overrides,
  };
}

const walletA = position({});
const walletB = position({
  id: 618,
  assetId: 9217,
  name: "Ether.fi Liquid BTC (B)",
  depositedUnderlying: 0.25,
  currentUnderlying: 0.26,
  receiptAmount: 0.25,
  investmentAccountId: 482,
});

const stat = (
  members: StakedPosition[],
  daily: Map<number, StakedDailyPoint[]> = new Map(),
) =>
  buildStakedGroupStat(
    members,
    daily,
    () => 30,
    (id) => (id == null ? "Unlinked" : (ACCOUNTS.get(id) ?? "Unlinked")),
  );

describe("buildStakedGroupStat", () => {
  it("sums members and keeps per-account figures", () => {
    const s = stat([walletA, walletB]);

    expect(s.deposited).toBeCloseTo(0.65, 12);
    expect(s.current).toBeCloseTo(0.68, 12);
    expect(s.receiptAmount).toBeCloseTo(0.65, 12);
    expect(s.earned).toBeCloseTo(0.03, 12);
    expect(s.value).toBeCloseTo(0.68 * 60_000 * 30, 6);
    expect(s.earnedThb).toBeCloseTo(0.03 * 60_000 * 30, 6);
    expect(s.members.map((m) => m.accountName)).toEqual([
      "Wallet A",
      "Wallet B",
    ]);
    expect(s.members[1]!.value).toBeCloseTo(0.26 * 60_000 * 30, 6);
    expect(s.apyMethod).toBe("simple");
  });

  it("uses the time-weighted APY over the summed history", () => {
    const daily = new Map<number, StakedDailyPoint[]>([
      [
        263,
        Array.from({ length: 11 }, (_, i) => ({
          stakedPositionId: 263,
          date: `2025-04-${String(i + 1).padStart(2, "0")}`,
          currentUnderlying: 0.4 * Math.pow(1.05, i / 365),
          depositedUnderlying: 0.4,
        })),
      ],
    ]);
    const s = stat([walletA], daily);

    expect(s.apyMethod).toBe("twr");
    expect(s.apy!).toBeCloseTo(0.05, 8);
    expect(s.spark).toHaveLength(11);
  });

  it("leaves value null when no member has a price", () => {
    const s = stat([position({ currentPrice: null })]);
    expect(s.value).toBeNull();
    expect(s.earnedThb).toBeNull();
  });
});

describe("<StakedGroupCard>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("edits a single position directly, without an account breakdown", async () => {
    const screen = await render(<StakedGroupCard stat={stat([walletA])} />);

    await expect
      .element(screen.getByRole("button", { name: "By account" }))
      .not.toBeInTheDocument();

    await screen
      .getByRole("button", {
        name: "Edit deposited amount for Ether.fi Liquid BTC",
      })
      .click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("0.41");
    await page.getByRole("button", { name: "save" }).click();

    await vi.waitFor(() => {
      expect(actions.updateStakedDeposited).toHaveBeenCalledWith(263, 0.41);
    });
  });

  it("shows read-only totals and edits each wallet from the breakdown", async () => {
    const screen = await render(
      <StakedGroupCard stat={stat([walletA, walletB])} />,
    );

    await expect.element(screen.getByText("2 accounts")).toBeInTheDocument();
    await expect
      .element(screen.getByText("0.65000000 liquidBTC"))
      .toBeInTheDocument();
    await expect
      .element(
        screen.getByRole("button", {
          name: "Edit deposited amount for Ether.fi Liquid BTC",
          exact: true,
        }),
      )
      .not.toBeInTheDocument();
    await expect.element(screen.getByText("Wallet B")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "By account" });
    await toggle.click();
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await expect.element(screen.getByText("Wallet A")).toBeInTheDocument();
    await expect.element(screen.getByText("Wallet B")).toBeInTheDocument();

    await screen
      .getByRole("button", {
        name: "Edit receipt balance for Ether.fi Liquid BTC (B) (Wallet B)",
      })
      .click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("0.2");
    await page.getByRole("button", { name: "save" }).click();

    await vi.waitFor(() => {
      expect(actions.updateStakedReceipt).toHaveBeenCalledWith(618, 0.2);
    });
  });

  it("saves the projected APY to every wallet in the group", async () => {
    const screen = await render(
      <StakedGroupCard stat={stat([walletA, walletB])} />,
    );

    await screen
      .getByRole("button", {
        name: "Edit projected APY for Ether.fi Liquid BTC",
      })
      .click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("2");
    await page.getByRole("button", { name: "save" }).click();

    await vi.waitFor(() => {
      expect(actions.updateStakedApy).toHaveBeenCalledTimes(2);
    });
    expect(actions.updateStakedApy).toHaveBeenCalledWith(263, 0.02);
    expect(actions.updateStakedApy).toHaveBeenCalledWith(618, 0.02);
  });

  it("flags a sync error from any wallet", async () => {
    const screen = await render(
      <StakedGroupCard
        stat={stat([walletA, { ...walletB, syncError: "eth_call failed" }])}
      />,
    );

    await expect
      .element(screen.getByText("sync error"))
      .toHaveAttribute("title", "Ether.fi Liquid BTC (B): eth_call failed");
  });
});
