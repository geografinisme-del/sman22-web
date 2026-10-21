import type { MetadataRoute } from "next";
import { sekolah } from "@/content/sekolah";
import { GRUP_LANGIT } from "@/content/menu-langit";
import { getBerita } from "@/lib/data";

export const revalidate = 3600;

/** Semua halaman menu "Langit cerah" (tautan internal) + berita terbit. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = sekolah.urlSitus.replace(/\/$/, "");
  const berita = await getBerita();
  const halaman = [
    "/",
    "/profil",
    "/pembelajaran",
    "/spmb",
    "/kontak",
    "/alumni",
    "/portal-digital",
    ...GRUP_LANGIT.flatMap((g) => g.anak.map((a) => a.href)),
  ].filter((h, i, a) => h.startsWith("/") && !h.includes("#") && a.indexOf(h) === i);
  return [
    ...halaman.map((h) => ({ url: `${base}${h === "/" ? "" : h}` })),
    ...berita.map((b) => ({ url: `${base}/berita/${b.slug}`, lastModified: b.tanggal })),
  ];
}
