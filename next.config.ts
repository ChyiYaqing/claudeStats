import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server serve its internal assets (HMR, dev-overlay font,
  // /_next/*) to browsers on other LAN devices. Without this, Next 16 treats
  // requests from a non-localhost origin as cross-origin and returns 403.
  // Dev-only — ignored by `next start`. Add other devices' access IPs here.
  allowedDevOrigins: ["192.168.50.73"],
};

export default nextConfig;
