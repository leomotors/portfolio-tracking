import { expect, test } from "vitest";

import {
  formatAsOfLabel,
  formatAsOfTime,
  formatDate,
  getYesterday,
  orPreviousWorkDay,
} from "./date.js";

test("formatDate", () => {
  expect(formatDate(new Date("2021-01-01"))).toBe("2021-01-01");
});

test("getYesterday", () => {
  const date = new Date("2021-01-02");
  const yest = new Date("2021-01-01");
  expect(formatDate(getYesterday(date))).toBe(formatDate(yest));

  // Original date should not be modified
  expect(formatDate(date)).toBe("2021-01-02");
});

test("orPreviousWorkDay", () => {
  const friday = new Date("2025-12-05"); // Friday
  expect(formatDate(orPreviousWorkDay(friday))).toBe("2025-12-05");

  const saturday = new Date("2025-12-06"); // Saturday
  expect(formatDate(orPreviousWorkDay(saturday))).toBe("2025-12-05");

  const sunday = new Date("2025-12-07"); // Sunday
  expect(formatDate(orPreviousWorkDay(sunday))).toBe("2025-12-05");
  expect(sunday.getDate()).toBe(7); // original date should not be modified
});

test("formatAsOfLabel is ICT weekday date", () => {
  expect(formatAsOfLabel(new Date("2026-09-20T13:05:00+07:00"))).toBe(
    "SUN 20 SEP 2026",
  );
});

test("formatAsOfTime is ICT clock", () => {
  expect(formatAsOfTime(new Date("2026-09-20T13:05:00+07:00"))).toBe(
    "AS OF 13:05 ICT",
  );
});
