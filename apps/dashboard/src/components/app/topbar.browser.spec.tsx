import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { Topbar } from "./topbar";

describe("<Topbar>", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "light");
    try {
      localStorage.removeItem("theme");
    } catch {
      // ignore
    }
  });

  it("toggles the data-theme attribute on click", async () => {
    const screen = render(<Topbar />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("persists the theme choice to localStorage", async () => {
    const screen = render(<Topbar />);
    await screen.getByRole("button", { name: "Toggle theme" }).click();
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
