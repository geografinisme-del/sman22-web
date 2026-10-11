import type { Metadata } from "next";
import { GaleriInteraktif } from "@/components/GaleriInteraktif";
import { Kosong, PageHeader } from "@/components/ui";
import { getGaleri } from "@/lib/data";

export const metadata: Metadata = { title: "Galeri" };

export default async function Galeri() {
  const galeri = (await getGaleri()).filter((g) => g.gambar);
  return (
    <>
      <PageHeader judul="Galeri" deskripsi="Dokumentasi kegiatan sekolah. Klik foto untuk melihat lebih besar.">
        {galeri.length > 0 && (
          <span className="inline-flex items-baseline gap-2 rounded-full bg-[#f3f0fc] px-4 py-2">
            <strong className="font-serif text-xl font-medium text-[#284fd7]">{galeri.length}</strong>
            <span className="text-xs text-[#5e6074]">foto kegiatan</span>
          </span>
        )}
      </PageHeader>
      <section className="lp-wadah py-10 sm:py-12">
        {galeri.length === 0 ? <Kosong teks="Belum ada foto." /> : <GaleriInteraktif foto={galeri} />}
      </section>
    </>
  );
}
