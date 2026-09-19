import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { HBars } from "./h-bars";

function Harness() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  return (
    <HBars
      data={[
        { key: "stock", label: "Stock", value: 100, color: "green" },
        { key: "gold", label: "Gold", value: 40, color: "gold" },
      ]}
      valueFmt={(v) => `฿${v}`}
      showPercent
      selectedKey={selectedKey}
      onSelect={(key) =>
        setSelectedKey((current) => (current === key ? null : key))
      }
      members={{
        stock: [
          {
            key: "asset:1",
            label: "VOO",
            sublabel: "Dime",
            value: 40,
            origin: "asset",
          },
        ],
      }}
    />
  );
}

describe("<HBars>", () => {
  it("expands members when a row is selected and collapses on a second click", async () => {
    const screen = await render(<Harness />);

    await screen.getByRole("button", { name: /Stock/ }).click();
    await expect.element(screen.getByText("VOO")).toBeInTheDocument();
    await expect.element(screen.getByText("Dime")).toBeInTheDocument();

    await screen.getByRole("button", { name: /Stock/ }).click();
    await expect.element(screen.getByText("VOO")).not.toBeInTheDocument();
  });
});
