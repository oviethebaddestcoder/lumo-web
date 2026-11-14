import type { NextConfig } from "next";

// Content-Security-Policy. Pages are pre-rendered (Cache Components), and a
// pre-rendered shell can't carry a per-request nonce, so scripts allow
// 'self' + inline (Next's RSC payload) instead of a nonce. Everything else
// is locked down: no plugins, no <base> or form hijacking, no framing, and
// network/image/media access only to this site, the media CDN, uploads and
// Google sign-in, so an injected script couldn't send data anywhere else.
// (A nonce policy was tried and blocked every Next.js script; switching to
// one means rendering every page per request.)
const media = process.env.NEXT_PUBLIC_MEDIA_ORIGIN ?? "https:";
const uploads = process.env.NEXT_PUBLIC_UPLOAD_ORIGIN ?? "https:";
const dev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://accounts.google.com/gsi/client`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  `img-src 'self' data: blob: ${media} https://*.googleusercontent.com`,
  `media-src 'self' blob: ${media}`,
  `connect-src 'self' ${uploads} ${media} https://accounts.google.com/gsi/`,
  "frame-src https://accounts.google.com/gsi/",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The app shares long videos as /watch/{id}; they live at /v/{id}.
  async redirects() {
    return [{ source: "/watch/:id", destination: "/v/:id", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
