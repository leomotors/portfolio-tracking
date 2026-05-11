// @ts-check

import { createESLintConfig } from "@leomotors/config";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  createESLintConfig(),
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // eslint-plugin-react auto-detects the React version by walking the
    // filesystem, which is incompatible with ESLint v10's flat-config rule
    // context. Pinning the version here skips the runtime detection path.
    settings: { react: { version: "19.2" } },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/libs/*.d.ts",
  ]),
]);

export default eslintConfig;
