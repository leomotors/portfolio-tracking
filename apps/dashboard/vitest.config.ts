import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/lib/portfolio/**"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/lib/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/components/**/*.browser.spec.tsx"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          setupFiles: ["./test/browser-setup.ts"],
        },
      },
    ],
  },
});
