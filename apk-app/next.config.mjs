import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: no server, no API routes, no middleware. Capacitor loads
  // this output directory straight off the device's filesystem, so nothing
  // here can depend on a Node server existing at runtime.
  output: "export",
  distDir: "out",
  images: {
    unoptimized: true,
  },
  // This app lives inside the existing web app's git repo (a sibling
  // top-level folder, not a workspace of it) — pin the trace root here so
  // Next doesn't get confused by the parent repo's own lockfile.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

export default nextConfig;
