import type { Metadata, Viewport } from "next";
import "./globals.css";
import { sekolah } from "@/content/sekolah";
import { getSitus } from "@/lib/data";

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

export const viewport: Viewport = { themeColor: "#121831" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HighSchool",
    name: sekolah.nama,
    url: sekolah.urlSitus,
    address: { "@type": "PostalAddress", addressLocality: "Bandung", addressRegion: "Jawa Barat", addressCountry: "ID" },
  };

  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
