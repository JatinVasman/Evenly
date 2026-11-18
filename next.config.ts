import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-fetch",
    "@libsql/core",
    "@libsql/isomorphic-ws",
    "libsql",
    "@node-rs/argon2",
  ],
};

export default nextConfig;
