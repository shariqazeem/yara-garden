/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Base44 hosting serves a single-page app, so the whole world is exported as static
  // files and every former /api route now runs as a Base44 backend function.
  // See lib/base44.ts for the adapter that routes them.
  output: "export",

  // No Next image optimisation server exists in a static export; the art is already
  // sized and served straight from /public.
  images: { unoptimized: true },
};

export default nextConfig;
