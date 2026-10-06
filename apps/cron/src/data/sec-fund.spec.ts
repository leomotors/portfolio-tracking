import {
  afterEach,
  beforeEach,
  expect,
  type MockInstance,
  test,
  vi,
} from "vitest";

import { logger } from "@/core/logger";

import {
  fetchFundPrices,
  secFundClient,
  secFundIssues,
  secFundSummaryLine,
} from "./sec-fund.js";

vi.mock("@repo/database/client", () => ({
  db: {
    select: () => ({
      from: async () => [
        { symbol: "FUND-A", projectId: "P1" },
        { symbol: "FUND-B", projectId: "P2" },
      ],
    }),
  },
}));

vi.mock("@/core/environment", () => ({
  environment: { SEC_OCP_APIM_SUBSCRIPTION_KEY: "test-key" },
}));

type GetResult = Awaited<ReturnType<typeof secFundClient.GET>>;

function ok(symbol: string, navDate: string, lastVal: number): GetResult {
  return {
    data: {
      items: [
        { fund_class_name: symbol, nav_date: navDate, last_val: lastVal },
      ],
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  } as unknown as GetResult;
}

function status(code: number): GetResult {
  return {
    data: undefined,
    error: undefined,
    response: { status: code } as Response,
  } as unknown as GetResult;
}

let get: MockInstance<typeof secFundClient.GET>;

beforeEach(() => {
  get = vi.spyOn(secFundClient, "GET");
  vi.useFakeTimers();
  secFundIssues.recovered.length = 0;
  secFundIssues.keptNewer.length = 0;
  secFundIssues.failed.length = 0;
  vi.spyOn(logger, "debug").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function run(symbols: string[]) {
  const promise = fetchFundPrices(symbols);
  await vi.runAllTimersAsync();
  return promise;
}

test("retries a 204 once and records the recovery", async () => {
  get
    .mockResolvedValueOnce(status(204))
    .mockResolvedValueOnce(ok("FUND-B", "2026-10-02", 2))
    .mockResolvedValueOnce(ok("FUND-A", "2026-10-02", 1));

  const results = await run(["FUND-A", "FUND-B"]);

  expect(results).toEqual([
    { symbol: "FUND-B", price: 2, date: "2026-10-02T00:00:00.000Z" },
    { symbol: "FUND-A", price: 1, date: "2026-10-02T00:00:00.000Z" },
  ]);
  expect(get).toHaveBeenCalledTimes(3);
  expect(secFundIssues.recovered).toEqual(["FUND-A"]);
  expect(secFundIssues.failed).toEqual([]);
});

test("a second transient failure warns instead of erroring", async () => {
  get.mockResolvedValue(status(503));
  const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
  const error = vi.spyOn(logger, "error").mockImplementation(() => {});

  const results = await run(["FUND-A"]);

  expect(results).toEqual([]);
  expect(get).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalledOnce();
  expect(error).not.toHaveBeenCalled();
  expect(secFundIssues.failed).toEqual(["FUND-A"]);
});

test("non-transient failures error without a retry", async () => {
  get.mockResolvedValue(status(400));
  const error = vi.spyOn(logger, "error").mockImplementation(() => {});

  await run(["FUND-A", "UNMAPPED"]);

  expect(get).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalledTimes(2);
  expect(secFundIssues.failed).toEqual(["FUND-A", "UNMAPPED"]);
});

test("secFundSummaryLine lists only non-empty outcomes", () => {
  expect(secFundSummaryLine()).toBeNull();

  secFundIssues.recovered.push("FUND-A");
  secFundIssues.failed.push("FUND-B", "FUND-C");

  expect(secFundSummaryLine()).toBe(
    "🏦 SEC fund API: 1 recovered on retry · 2 failed",
  );
});
