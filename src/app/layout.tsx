import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PitaPratinjau } from "@/components/PitaPratinjau";
import "./globals.css";
import { sekolah } from "@/content/sekolah";
import { getSitus } from "@/lib/data";
import { cssBidang } from "@/lib/bidang";
import { fontJakarta, fontMono } from "./fonts";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSitus();
  const judul = seo.judul || sekolah.nama;
  return {
    metadataBase: new URL(sekolah.urlSitus),
    title: { default: judul, template: `%s | ${sekolah.namaPendek}` },
    description: seo.deskripsi,
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: sekolah.nama,
      title: judul,
      description: seo.deskripsi,
      images: [seo.gambar || "/images/gedung.jpg"],
    },
    twitter: { card: "summary_large_image", title: judul, description: seo.deskripsi, images: [seo.gambar || "/images/gedung.jpg"] },
  };
}

// colorScheme "light": cegah peramban HP (mode gelap paksa) mengubah warna situs sehingga tampilan HP & laptop seragam
// viewport-fit=cover: env(safe-area-inset-*) aktif di iPhone (header, footer, tombol Bantuan memakainya)
export const viewport: Viewport = { themeColor: "#1f6ff0", colorScheme: "light", viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HighSchool",
    name: sekolah.nama,
    url: sekolah.urlSitus,
    address: { "@type": "PostalAddress", addressLocality: "Bandung", addressRegion: "Jawa Barat", addressCountry: "ID" },
  };

  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${fontJakarta.variable} ${fontMono.variable}`}>
      <head>
        {/* warna penanda bidang (src/lib/bidang.ts) — nilai tetap dari kode, bukan masukan pengguna */}
        <style dangerouslySetInnerHTML={{ __html: cssBidang() }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <PitaPratinjau />
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Vercel Speed Insights (tier gratis) & Web Analytics: data kinerja & kunjungan pengunjung sungguhan */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
