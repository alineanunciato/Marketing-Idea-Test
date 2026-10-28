import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings from wrangler.jsonc.
initOpenNextCloudflareForDev();
