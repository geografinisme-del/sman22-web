import type { Metadata } from "next";
import Link from "next/link";
import { Gambar } from "@/components/Gambar";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { getBerita } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Berita", description: "Berita dan kegiatan terbaru sekolah." };

export default async function DaftarBerita() {
  const list = await getBerita();
  return (
    <>
      <PageHeader judul="Berita" deskripsi="Kabar kegiatan, prestasi, dan program sekolah." />
      <Section>
        {list.length === 0 ? (
          <Kosong teks="Belum ada berita." />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/berita/${b.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl bg-white transition hover:shadow-md"
                >
                  <Gambar src={b.gambar} alt={b.judul} className="aspect-video" />
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-merah">
                      {b.kategori} · {formatTanggal(b.tanggal)}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl leading-tight group-hover:text-merah">{b.judul}</h2>
                    <p className="mt-2 text-sm text-black/60">{b.ringkasan}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
