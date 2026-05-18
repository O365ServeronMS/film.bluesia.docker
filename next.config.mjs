/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['torrent-stream', 'parse-torrent'],
  async headers() {
    return [
      {
        source: "/list/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=1800, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "public, s-maxage=1800, stale-while-revalidate=86400" },
          { key: "Cloudflare-CDN-Cache-Control", value: "public, s-maxage=1800, stale-while-revalidate=86400" }
        ]
      },
      {
        source: "/api/torrent/stream",
        headers: [
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "no-store" }
        ]
      }
    ];
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
