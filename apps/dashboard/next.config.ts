import path from "node:path";

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The assistant renders model-authored markdown, and the model's context holds
// third-party web/X search results. A CSP is the backstop for that: even if the
// model is talked into emitting a URL, the browser will not fetch it off-origin.
// `img-src`/`connect-src` are the ones that matter here; script/style stay
// permissive because Next inlines hydration and the theme/privacy bootstraps.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // cdn.discordapp.com serves the signed-in user's avatar.
  "img-src 'self' data: blob: https://cdn.discordapp.com",
  "media-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  // The real-estate page embeds a Google Maps iframe.
  "frame-src https://www.google.com",
  // Not in dev, where the app is served over plain http on localhost.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  transpilePackages: ["@repo/heatmap", "@repo/database"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
