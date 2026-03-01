const { resolve } = require('path');
require('dotenv').config({ path: resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Only expose PUBLIC / non-secret values to the client bundle.
    // NEXTAUTH_URL, NEXTAUTH_SECRET and GOOGLE_CLIENT_SECRET are used server-side only
    // and must NOT appear here.
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    WEB_URL: process.env.WEB_URL,
  },
};

module.exports = nextConfig;
