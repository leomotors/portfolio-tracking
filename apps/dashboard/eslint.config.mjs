// @ts-check

import { createESLintConfig } from "@leomotors/config";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";

const nextConfig = {
  plugins: {
    "@next/next": nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
  },
};

const eslintConfig = defineConfig([
  createESLintConfig(),
  nextConfig,
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
  // Preserve the default ignores from Next's ESLint config.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/libs/*.d.ts",
  ]),
]);

export default eslintConfig;
