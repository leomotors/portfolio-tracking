import { expect, test } from "vitest";

import { formatDate } from "./dateFormat.js";

test("formatDate", () => {
  expect(formatDate(new Date("2021-01-01"))).toBe("2021-01-01");
});
