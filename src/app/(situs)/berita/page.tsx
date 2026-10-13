import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Gambar } from "@/components/Gambar";
import { Reveal } from "@/components/Reveal";
import { Kosong, PageHeader } from "@/components/ui";
import { getBerita } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Berita", description: "Berita dan kegiatan terbaru sekolah." };

export default async function DaftarBerita({ searchParams }: { searchParams: Promise<{ kategori?: string }> }) {
  const { kategori } = await searchParams;
  const semua = await getBerita();
  const daftarKategori = [...new Set(semua.map((b) => b.kategori).filter(Boolean))];
  const list = kategori ? semua.filter((b) => b.kategori === kategori) : semua;
  const [utama, ...lain] = list;
  const chip = (aktif: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${aktif ? "bg-[var(--tema-utama)] text-white" : "ring-1 ring-[var(--tema-utama)]/20 hover:bg-[#f3f0fc]"}`;

  return (
    <>
      <PageHeader judul="Berita" deskripsi="Kabar kegiatan, prestasi, dan program sekolah.">
        {daftarKategori.length > 1 && (
          <nav aria-label="Saring kategori" className="flex flex-wrap gap-2">
            <Link href="/berita" scroll={false} className={chip(!kategori)} aria-current={!kategori ? "page" : undefined}>
              Semua <span className="opacity-60">{semua.length}</span>
            </Link>
            {daftarKategori.map((k) => (
              <Link key={k} href={`/berita?kategori=${encodeURIComponent(k)}`} scroll={false} className={chip(kategori === k)} aria-current={kategori === k ? "page" : undefined}>
                {k}
              </Link>
            ))}
          </nav>
        )}
      </PageHeader>

      <section className="lp-wadah py-10 sm:py-12">
        {!utama ? (
          <Kosong teks={kategori ? `Belum ada berita kategori ${kategori}.` : "Belum ada berita."} />
        ) : (
          <>
            <Reveal>
              <Link href={`/berita/${utama.slug}`} className="kartu group grid overflow-hidden md:grid-cols-[1.25fr_1fr]">
                <Gambar src={utama.gambar} alt={utama.judul} priority sizes="(min-width: 768px) 60vw, 100vw" className="kartu-gambar aspect-[16/10] md:aspect-auto md:min-h-[340px]" />
                <div className="flex flex-col p-6 sm:p-9">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">
                    Terbaru · {utama.kategori}
                  </p>
                  <h2 className="mt-3 font-serif text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.02em] transition group-hover:text-[var(--tema-utama)]">{utama.judul}</h2>
                  <p className="mt-4 text-[#555f6b]">{utama.ringkasan}</p>
                  <p className="mt-auto flex items-center justify-between pt-6 text-sm">
                    <time dateTime={utama.tanggal} className="text-[#646c7a]">
                      {formatTanggal(utama.tanggal)}
                    </time>
                    <span className="inline-flex items-center gap-2 font-semibold text-[var(--tema-utama)]">
                      Baca cerita <ArrowUpRight size={16} aria-hidden className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </p>
                </div>
              </Link>
            </Reveal>

            {lain.length > 0 && (
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {lain.map((b, i) => (
                  <Reveal as="li" key={b.slug} delay={(i % 3) * 110}>
                    <Link href={`/berita/${b.slug}`} className="kartu group flex h-full flex-col overflow-hidden">
                      <Gambar src={b.gambar} alt={b.judul} className="kartu-gambar aspect-[16/10]" />
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--tema-utama)]">{b.kategori}</p>
                        <h2 className="mt-2 font-serif text-[1.45rem] leading-[1.15] transition group-hover:text-[var(--tema-utama)]">{b.judul}</h2>
                        <p className="mt-2 line-clamp-2 text-sm text-[#626a76]">{b.ringkasan}</p>
                        <time dateTime={b.tanggal} className="mt-auto pt-4 text-xs text-[#646c7a]">
                          {formatTanggal(b.tanggal)}
                        </time>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
