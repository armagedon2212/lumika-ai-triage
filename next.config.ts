import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Regulamin jest czytany z dysku w route handlerach — dołączamy go do bundla funkcji na Vercelu.
  outputFileTracingIncludes: {
    "/api/**": ["./data/policies.md"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
