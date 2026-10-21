import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remote = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remote
      ? [
          {
            protocol: remote.protocol.replace(":", "") as "http" | "https",
            hostname: remote.hostname,
            port: remote.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    // Supabase lokal (pengujian) berjalan di localhost
    dangerouslyAllowLocalIP: remote?.hostname === "localhost" || remote?.hostname === "127.0.0.1",
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // alamat mudah diingat untuk E-Library (halaman aslinya tetap /perpustakaan)
  async redirects() {
    return [
      { source: "/e-library", destination: "/perpustakaan", permanent: false },
      // halaman masuk lama → halaman masuk per peran (308; semua parameter, termasuk ?lanjut=, ikut dibawa).
      // /admin/login tetap ada sebagai pengalih — admin/CMS masuk lewat halaman Guru & Tendik.
      { source: "/admin/login", has: [{ type: "query", key: "sebagai", value: "siswa" }], destination: "/portal-digital/masuk/siswa", permanent: true },
      { source: "/admin/login", has: [{ type: "query", key: "sebagai", value: "(ortu|orang_tua)" }], destination: "/portal-digital/masuk/orang-tua", permanent: true },
      { source: "/admin/login", destination: "/portal-digital/masuk/gtk", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/pratinjau/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
