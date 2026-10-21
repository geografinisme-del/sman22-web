import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtikelBerita } from "@/components/ArtikelBerita";
import { sekolah } from "@/content/sekolah";
import { getBerita, getBeritaBySlug } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const list = await getBerita();
  return list.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBeritaBySlug(slug);
  if (!b) return {};
  return {
    title: b.judul,
    description: b.ringkasan,
    openGraph: { type: "article", title: b.judul, description: b.ringkasan, images: b.gambar ? [b.gambar] : undefined },
  };
}

export default async function DetailBerita({ params }: Props) {
  const { slug } = await params;
  const [b, semua] = await Promise.all([getBeritaBySlug(slug), getBerita(24)]);
  if (!b) notFound();
  // berita terkait: kategori sama dulu, lalu terbaru
  const terkait = semua
    .filter((x) => x.slug !== b.slug)
    .sort((x, y) => Number(y.kategori === b.kategori) - Number(x.kategori === b.kategori))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: b.judul,
    description: b.ringkasan,
    datePublished: b.tanggal,
    image: b.gambar ? [b.gambar] : undefined,
    publisher: { "@type": "EducationalOrganization", name: sekolah.nama },
  };
  return (
    <>
      <ArtikelBerita b={b} terkait={terkait} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
