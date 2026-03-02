const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
    ],
  },
  // C7 fix: Security headers for the frontend
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'} https://accounts.google.com`,
              "font-src 'self' https://fonts.gstatic.com data:",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
  env: {
    // Only expose PUBLIC / non-secret values to the client bundle.
    // NEXTAUTH_URL, NEXTAUTH_SECRET and GOOGLE_CLIENT_SECRET are used server-side only
    // and must NOT appear here.
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    WEB_URL: process.env.WEB_URL,
  },
};

module.exports = nextConfig;
