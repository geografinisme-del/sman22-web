import type { Metadata } from "next";
import { GaleriInteraktif } from "@/components/GaleriInteraktif";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getGaleri } from "@/lib/data";

export const metadata: Metadata = { title: "Galeri" };

export default async function Galeri() {
  const galeri = (await getGaleri()).filter((g) => g.gambar);
  return (
    <>
      <PageHeader
        judul="Galeri kegiatan"
        label="Kehidupan siswa"
        deskripsi={galeri.length ? `${galeri.length} foto dokumentasi kegiatan sekolah. Pilih foto untuk melihat lebih besar.` : "Dokumentasi kegiatan sekolah."}
      />
      <Section>{galeri.length === 0 ? <Kosong teks="Belum ada foto yang diterbitkan." /> : <GaleriInteraktif foto={galeri} />}</Section>
    </>
  );
}
