import type { Metadata } from "next";
import { DaftarPengumuman } from "@/components/langit/Bagian";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getPengumuman } from "@/lib/data";

export const metadata: Metadata = { title: "Pengumuman", description: "Informasi resmi SMA Negeri 22 Bandung." };

export default async function Pengumuman() {
  const daftar = await getPengumuman();
  // pengumuman penting/prioritas di atas, lalu terbaru
  const urut = [...daftar].sort((a, b) => Number(b.prioritas || b.penting) - Number(a.prioritas || a.penting));
  return (
    <>
      <PageHeader judul="Pengumuman" label="Kabar & agenda" deskripsi="Informasi resmi sekolah untuk siswa, orang tua, dan masyarakat." />
      <Section>{urut.length === 0 ? <Kosong teks="Belum ada pengumuman." /> : <div className="max-w-[860px]"><DaftarPengumuman pengumuman={urut} lengkap /></div>}</Section>
    </>
  );
}
