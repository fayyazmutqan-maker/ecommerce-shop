import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          ...(!isDev ? [{
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          }] : []),
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdnjs.cloudflare.com https://challenges.cloudflare.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://lh3.googleusercontent.com",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' http://localhost:* ws://localhost:* https://api.tap.company https://vitals.vercel-insights.com`,
              "frame-src 'self' https://goSellJSLib.b-cdn.net https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              isDev ? "" : "upgrade-insecure-requests",
            ].filter(Boolean).join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
