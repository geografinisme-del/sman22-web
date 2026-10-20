import type { Metadata } from "next";
import Link from "next/link";
import { Gambar } from "@/components/Gambar";
import { Kosong, PageHeader } from "@/components/ui";
import { getBerita } from "@/lib/data";
import { formatTanggal } from "@/lib/format";

export const metadata: Metadata = { title: "Berita", description: "Berita dan kegiatan terbaru sekolah." };

export default async function DaftarBerita({ searchParams }: { searchParams: Promise<{ kategori?: string; q?: string }> }) {
  const { kategori, q: qMentah } = await searchParams;
  // pencarian sederhana (kotak cari menu layar penuh) — halaman pencarian lengkap dibuat di Tahap C
  const q = typeof qMentah === "string" ? qMentah.trim().slice(0, 80).toLowerCase() : "";
  const semua = await getBerita();
  const daftarKategori = [...new Set(semua.map((b) => b.kategori).filter(Boolean))];
  const list = semua
    .filter((b) => !kategori || b.kategori === kategori)
    .filter((b) => !q || [b.judul, b.ringkasan, b.kategori].some((t) => (t ?? "").toLowerCase().includes(q)));
  const [utama, ...lain] = list;
  const tab = (aktif: boolean) =>
    `inline-flex min-h-11 items-center border-b-2 px-1 text-[0.9375rem] font-semibold transition-colors duration-150 ${aktif ? "border-[var(--tema-utama)] text-[#1f2328]" : "border-transparent text-[#5b6270] hover:text-[#1f2328]"}`;

  return (
    <>
      <PageHeader judul="Berita" deskripsi="Kabar kegiatan, prestasi, dan program sekolah.">
        {daftarKategori.length > 1 && (
          <nav aria-label="Saring kategori" className="flex flex-wrap gap-x-5 border-b border-[#e5e1da]">
            <Link href="/berita" scroll={false} className={tab(!kategori)} aria-current={!kategori ? "page" : undefined}>
              Semua ({semua.length})
            </Link>
            {daftarKategori.map((k) => (
              <Link key={k} href={`/berita?kategori=${encodeURIComponent(k)}`} scroll={false} className={tab(kategori === k)} aria-current={kategori === k ? "page" : undefined}>
                {k}
              </Link>
            ))}
          </nav>
        )}
      </PageHeader>

      <section className="bagian">
        <div className="lp-wadah">
          {!utama ? (
            <Kosong teks={q ? `Tidak ada berita yang cocok dengan “${q}”.` : kategori ? `Belum ada berita kategori ${kategori}.` : "Belum ada berita yang diterbitkan."} />
          ) : (
            <>
              <Link href={`/berita/${utama.slug}`} className="group grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
                <Gambar src={utama.gambar} alt={utama.judul} priority sizes="(min-width: 768px) 55vw, 100vw" className="aspect-[3/2] rounded-[10px]" />
                <div>
                  <p className="text-sm text-[#5b6270]">
                    {utama.kategori} · <time dateTime={utama.tanggal}>{formatTanggal(utama.tanggal)}</time>
                  </p>
                  <h2 className="mt-2 group-hover:text-[var(--tema-utama)] group-hover:underline">{utama.judul}</h2>
                  {utama.ringkasan && <p className="mt-3 text-[1.0625rem] text-[#3b414b]">{utama.ringkasan}</p>}
                </div>
              </Link>

              {lain.length > 0 && (
                <ul className="mt-10 grid gap-x-8 gap-y-8 border-t border-[#e5e1da] pt-8 sm:grid-cols-2 lg:grid-cols-3">
                  {lain.map((b) => (
                    <li key={b.slug}>
                      <Link href={`/berita/${b.slug}`} className="group block">
                        <Gambar src={b.gambar} alt={b.judul} className="aspect-[3/2] rounded-[10px]" />
                        <p className="mt-3 text-sm text-[#5b6270]">
                          {b.kategori} · <time dateTime={b.tanggal}>{formatTanggal(b.tanggal)}</time>
                        </p>
                        <h3 className="mt-1 text-[1.1875rem] group-hover:text-[var(--tema-utama)] group-hover:underline">{b.judul}</h3>
                        {b.ringkasan && <p className="mt-1 line-clamp-2 text-[0.9375rem] text-[#3b414b]">{b.ringkasan}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
