import type { Metadata } from "next";
import Link from "next/link";
import { Kosong, PageHeader, Section } from "@/components/ui";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perpustakaan", description: "Katalog buku Perpustakaan SMAN 22 Bandung — cari judul dan cek ketersediaan." };
export const dynamic = "force-dynamic";
const PER = 24;

type K = { id: string; judul: string; pengarang: string; penerbit: string; tahun: number | null; kategori: string; rak: string; sampul_url: string; tautan_digital: string; tersedia: number; total: number; jumlah_hasil: number; rekomendasi: boolean; rating: number | null; jumlah_ulasan: number };

export default async function Perpustakaan({ searchParams }: { searchParams: Promise<{ q?: string; hal?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const hal = Math.max(1, Number(sp.hal) || 1);
  const { data } = supabaseAktif ? await (await supabaseServer()).rpc("katalog_publik", { p_cari: q, p_batas: PER, p_lewati: (hal - 1) * PER }) : { data: [] };
  const list = (data ?? []) as K[];
  const total = Number(list[0]?.jumlah_hasil ?? 0);
  return (
    <>
      <PageHeader judul="Perpustakaan" deskripsi="Cari buku di katalog dan cek apakah tersedia sebelum datang ke perpustakaan." />
      <Section>
        <form className="mb-6 flex gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Judul, pengarang, kategori, atau ISBN" aria-label="Cari buku" className="flex-1 rounded-lg border border-black/15 bg-white px-5 py-3" />
          <button className="rounded-lg bg-[var(--tema-utama)] px-6 py-3 font-semibold text-white">Cari</button>
        </form>
        <p className="-mt-3 mb-6 text-sm"><Link href="?q=rekomendasi" className="font-semibold text-[var(--tema-utama)] underline">★ Rekomendasi pustakawan</Link></p>
        {list.length === 0 ? <Kosong teks={q ? `Tidak ada buku untuk “${q}”.` : "Katalog belum tersedia."} /> : (
          <>
            <p className="mb-3 text-sm text-black/50">{total.toLocaleString("id-ID")} judul</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <li key={b.id} className="flex gap-4 kartu p-4 ">
                  {b.sampul_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.sampul_url} alt="" className="h-28 w-20 shrink-0 rounded object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  ) : <div className="grid h-28 w-20 shrink-0 place-items-center rounded bg-brand-50 font-serif text-3xl text-[var(--tema-utama)]" aria-hidden>{b.judul.slice(0, 1)}</div>}
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.15em] text-black/50">{b.kategori}</p>
                    <h2 className="font-semibold leading-snug"><Link href={`/perpustakaan/${b.id}`} className="hover:underline">{b.judul}</Link></h2>
                    {(b.rekomendasi || b.rating) && <p className="text-xs">{b.rekomendasi && <span className="mr-2 rounded bg-amber-100 px-1.5 font-semibold text-amber-900">Rekomendasi</span>}{b.rating && <span className="text-amber-600">★ {b.rating} <span className="text-black/50">({b.jumlah_ulasan})</span></span>}</p>}
                    <p className="text-sm text-black/60">{[b.pengarang, b.tahun].filter(Boolean).join(" · ")}</p>
                    <p className={`mt-2 text-sm font-semibold ${b.tersedia ? "text-emerald-700" : "text-[var(--tema-utama)]"}`}>{b.tersedia ? `${b.tersedia} tersedia` : "Sedang dipinjam semua"}{b.rak && <span className="font-normal text-black/50"> · rak {b.rak}</span>}</p>
                    {b.tautan_digital && <a href={b.tautan_digital} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-[var(--tema-utama)] underline">Baca versi digital</a>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between text-sm">
              {hal > 1 ? <Link href={`?q=${encodeURIComponent(q)}&hal=${hal - 1}`} className="rounded-lg px-4 py-2 ring-1 ring-black/15">← Sebelumnya</Link> : <span />}
              {hal * PER < total && <Link href={`?q=${encodeURIComponent(q)}&hal=${hal + 1}`} className="rounded-lg px-4 py-2 ring-1 ring-black/15">Berikutnya →</Link>}
            </div>
          </>
        )}
        <p className="mt-8 text-sm text-black/50">Siswa & guru dapat memesan buku dari halaman detail buku, lalu melihat & memperpanjang pinjaman di <Link href="/masuk" className="underline">portal</Link>.</p>
      </Section>
    </>
  );
}
