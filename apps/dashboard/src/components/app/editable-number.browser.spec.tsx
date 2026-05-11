import { describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { EditableNumber } from "./editable-number";

describe("<EditableNumber>", () => {
  it("calls onSave with the parsed number when save is clicked", async () => {
    const onSave = vi.fn();
    const screen = render(
      <EditableNumber value={100} onSave={onSave} ariaLabel="Edit balance" />,
    );

    await screen.getByRole("button", { name: "Edit balance" }).click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("250");
    await page.getByRole("button", { name: "save" }).click();

    expect(onSave).toHaveBeenCalledWith(250);
  });

  it("submits on Enter key", async () => {
    const onSave = vi.fn();
    const screen = render(
      <EditableNumber value={50} onSave={onSave} ariaLabel="Edit value" />,
    );

    await screen.getByRole("button", { name: "Edit value" }).click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("75");
    await input
      .element()
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );

    expect(onSave).toHaveBeenCalledWith(75);
  });

  it("cancels editing on Escape without calling onSave", async () => {
    const onSave = vi.fn();
    const screen = render(
      <EditableNumber value={42} onSave={onSave} ariaLabel="Edit" />,
    );

    await screen.getByRole("button", { name: "Edit" }).click();
    const input = page.getByRole("spinbutton");
    await input.clear();
    await input.fill("999");
    await input
      .element()
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );

    expect(onSave).not.toHaveBeenCalled();
    await expect.element(page.getByText("฿42")).toBeInTheDocument();
  });

  it("does not call onSave when the value is unchanged", async () => {
    const onSave = vi.fn();
    const screen = render(
      <EditableNumber value={123} onSave={onSave} ariaLabel="Edit" />,
    );

    await screen.getByRole("button", { name: "Edit" }).click();
    await page.getByRole("button", { name: "save" }).click();

    expect(onSave).not.toHaveBeenCalled();
  });
});
