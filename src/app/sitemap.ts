import type { MetadataRoute } from "next";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";
import { getBerita } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = sekolah.urlSitus.replace(/\/$/, "");
  const berita = await getBerita();
  return [
    ...menu.map((m) => ({ url: `${base}${m.href === "/" ? "" : m.href}` })),
    ...berita.map((b) => ({ url: `${base}/berita/${b.slug}`, lastModified: b.tanggal })),
  ];
}
