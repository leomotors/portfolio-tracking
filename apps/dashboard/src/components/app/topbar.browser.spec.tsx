import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Topbar } from "./topbar";

describe("<Topbar>", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.setAttribute("data-privacy", "visible");
    try {
      localStorage.removeItem("theme");
      localStorage.removeItem("privacy");
    } catch {
      // ignore
    }
  });

  it("toggles the data-theme attribute on click", async () => {
    const screen = await render(<Topbar />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("persists the theme choice to localStorage", async () => {
    const screen = await render(<Topbar />);
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("hides balances and persists the choice", async () => {
    const screen = await render(<Topbar />);
    expect(document.documentElement.getAttribute("data-privacy")).toBe(
      "visible",
    );
    await screen.getByRole("button", { name: "Hide balances" }).click();
    expect(document.documentElement.getAttribute("data-privacy")).toBe(
      "hidden",
    );
    expect(localStorage.getItem("privacy")).toBe("hidden");
    await screen.getByRole("button", { name: "Show balances" }).click();
    expect(document.documentElement.getAttribute("data-privacy")).toBe(
      "visible",
    );
  });
});
