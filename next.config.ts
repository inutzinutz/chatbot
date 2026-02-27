import type { NextConfig } from "next";

// Origins allowed to call the chatbot API and load the widget
const ALLOWED_ORIGINS = [
  "https://www.dji13store.com",
  "https://dji13store.com",
  // Add more origins here as needed, e.g. staging:
  // "https://staging.dji13store.com",
];

const CORS_HEADERS = [
  { key: "Access-Control-Allow-Origin",  value: ALLOWED_ORIGINS.join(", ") },
  { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, x-pdpa-consent, x-conversation-id, x-internal-secret" },
  { key: "Access-Control-Max-Age",       value: "86400" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      // Chat API — called by the widget on every message
      {
        source: "/api/chat",
        headers: CORS_HEADERS,
      },
      // Products API — widget may list products
      {
        source: "/api/products",
        headers: CORS_HEADERS,
      },
      // Widget JS file itself — must be loadable cross-origin
      {
        source: "/widget.js",
        headers: [
          ...CORS_HEADERS,
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" },
          { key: "Content-Type",  value: "application/javascript; charset=utf-8" },
        ],
      },
      // Widget CSS (if served separately in future)
      {
        source: "/widget.css",
        headers: [
          ...CORS_HEADERS,
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
