import type { NextConfig } from "next";
export default { experimental: { serverActions: { bodySizeLimit: "7mb" } } } satisfies NextConfig;
