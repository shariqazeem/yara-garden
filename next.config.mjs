/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Base44 hosting serves a single-page app, so that build is exported as static files
  // and every /api route runs as a Base44 backend function instead (see lib/base44.ts).
  // The Vercel build leaves this unset so it can carry its own route handlers as a
  // fallback, and keep working even if Base44 is unreachable.
  output: process.env.BASE44_STATIC === "1" ? "export" : undefined,

  // No Next image optimisation server exists in a static export; the art is already
  // sized and served straight from /public.
  images: { unoptimized: true },
};

export default nextConfig;
