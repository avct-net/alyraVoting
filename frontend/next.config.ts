import type { NextConfig } from "next";

// Nœud RPC local (Anvil) relayé par Next sous /rpc, pour que le navigateur n'ait pas besoin d'y accéder directement.
const LOCAL_RPC = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/rpc", destination: LOCAL_RPC }];
  },
};

export default nextConfig;
