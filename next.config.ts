import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake barrel exports for heavy libraries to reduce bundle size
    optimizePackageImports: [
      "framer-motion",
      "@codemirror/lang-python",
      "@codemirror/lang-javascript",
      "prosemirror-view",
      "prosemirror-state",
      "prosemirror-model",
      "lucide-react",
    ],
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "i.ibb.co",
      },
      {
        hostname: "wubiidettbyavutahgjb.supabase.co",
      },
      {
        hostname: "images.squarespace-cdn.com",
      },
    ],
  },

  // Security headers
  async headers() {
    // CSP directives - allow necessary resources while blocking XSS
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://wubiidettbyavutahgjb.supabase.co wss://wubiidettbyavutahgjb.supabase.co https://openrouter.ai https://api.elevenlabs.io https://api.tavily.com https://vercel.live https://va.vercel-scripts.com https://*.sentry.io",
      "media-src 'self' blob:",
      "frame-src 'self' https://vercel.live https://js.stripe.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
        ],
      },
    ];
  },

  // Redirect www to non-www for canonical URLs
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "aleccinew.vercel.app" }],
        destination: "https://bossbrainz.aleccimedia.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.bossbrainz.aleccimedia.com" }],
        destination: "https://bossbrainz.aleccimedia.com/:path*",
        permanent: true,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// Export with Sentry config
export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading in favor of Vercel source map uploads
  silent: true,
});
