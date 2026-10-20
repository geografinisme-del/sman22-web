import type { Metadata, Viewport } from "next";
import "./globals.css";
import { sekolah } from "@/content/sekolah";
import { getSitus } from "@/lib/data";
import { cssTema } from "@/lib/tema";
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
export const viewport: Viewport = { themeColor: "#f5f0e6", colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { tema } = await getSitus();
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
        {/* warna tema dari Admin → Tema & Tampilan (sudah divalidasi berformat #rrggbb) */}
        <style dangerouslySetInnerHTML={{ __html: cssTema(tema) }} />
        {/* warna penanda bidang (src/lib/bidang.ts) — nilai tetap dari kode, bukan masukan pengguna */}
        <style dangerouslySetInnerHTML={{ __html: cssBidang() }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
