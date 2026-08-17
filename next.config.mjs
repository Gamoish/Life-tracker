/** @type {import('next').NextConfig} */
const nextConfig = {
  // `pg` is a native-ish driver; keep it out of the bundler and require it at runtime.
  serverExternalPackages: ["pg"],
};

// NOTE: the PWA wrapper (@ducanh2912/next-pwa) gets added here in the final
// build step, once the app shell exists. Kept plain for now.
export default nextConfig;
