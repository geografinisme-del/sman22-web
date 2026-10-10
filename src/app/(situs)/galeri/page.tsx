import type { Metadata } from "next";
import { Gambar } from "@/components/Gambar";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getGaleri } from "@/lib/data";

export const metadata: Metadata = { title: "Galeri" };

export default async function Galeri() {
  const galeri = await getGaleri();
  return (
    <>
      <PageHeader judul="Galeri" deskripsi="Dokumentasi kegiatan sekolah." />
      <Section>
        {galeri.length === 0 ? (
          <Kosong teks="Belum ada foto." />
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {galeri.map((g) => (
              <li key={g.id}>
                <figure className="overflow-hidden rounded-2xl bg-white ">
                  <Gambar src={g.gambar} alt={g.judul} className="aspect-square" sizes="(min-width: 768px) 33vw, 50vw" />
                  <figcaption className="p-3 text-sm text-black/70">{g.judul}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
