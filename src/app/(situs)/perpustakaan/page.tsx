import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Kosong, PageHeader } from "@/components/ui";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "E-Library", description: "E-Library SMA Negeri 22 Bandung — cari buku di katalog, saring per kategori, dan cek ketersediaan." };
export const dynamic = "force-dynamic";
const PER = 24;
type Aturan = { lama_pinjam: number; maks_pinjam: number; maks_perpanjang: number };

type K = {
  id: string;
  judul: string;
  pengarang: string;
  tahun: number | null;
  kategori: string;
  rak: string;
  sampul_url: string;
  tautan_digital: string;
  tersedia: number;
  total: number;
  jumlah_hasil: number;
  rekomendasi: boolean;
  rating: number | null;
  jumlah_ulasan: number;
  akses_digital: string;
};

/**
 * Katalog publik E-Library. Data dari RPC katalog (hanya buku tampil_publik); tautan digital hanya
 * dikirim database bila koleksinya publik atau pengunjung warga sekolah yang masuk.
 * Layanan pribadi (pinjaman, reservasi) ada di portal setelah masuk; ruang kerja petugas di Portal Manajemen.
 */
export default async function Perpustakaan({ searchParams }: { searchParams: Promise<{ q?: string; hal?: string; kategori?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const kategori = (sp.kategori ?? "").slice(0, 60);
  const hal = Math.max(1, Number(sp.hal) || 1);
  const sb = supabaseAktif ? await supabaseServer() : null;

  let list: K[] = [];
  let gagal = false;
  let kategoriList: { kategori: string; jumlah: number }[] = [];
  let aturan: Aturan | null = null;
  if (sb) {
    const [hasil, kat, at] = await Promise.all([
      kategori
        ? sb.rpc("katalog_publik_kategori", { p_kategori: kategori, p_cari: q, p_batas: PER, p_lewati: (hal - 1) * PER })
        : sb.rpc("katalog_publik", { p_cari: q, p_batas: PER, p_lewati: (hal - 1) * PER }),
      sb.rpc("kategori_katalog_publik"),
      sb.rpc("aturan_perpus_publik"),
    ]);
    // RPC kategori belum dimigrasikan → saringan kategori tidak tersedia (bukan halaman rusak)
    gagal = Boolean(hasil.error);
    list = (hasil.data ?? []) as K[];
    kategoriList = kat.error ? [] : ((kat.data ?? []) as typeof kategoriList);
    aturan = at.error ? null : (((at.data ?? []) as Aturan[])[0] ?? null);
  }
  const total = Number(list[0]?.jumlah_hasil ?? 0);
  const tautanHal = (h: number) => `?${new URLSearchParams({ ...(q && { q }), ...(kategori && { kategori }), hal: String(h) })}`;
  const saring = (k: string) => `?${new URLSearchParams({ ...(q && { q }), ...(k && { kategori: k }) })}`;

  return (
    <>
      <PageHeader judul="E-Library" label="Perpustakaan SMA Negeri 22 Bandung" deskripsi="Cari buku di katalog, saring per kategori, dan cek ketersediaannya sebelum datang ke perpustakaan.">
              <form role="search" className="perpus-cari perpus-cari-besar">
                <label htmlFor="cari-buku" className="sr-only">
                  Cari buku
                </label>
                <Search size={18} aria-hidden className="perpus-cari-ikon" />
                <input id="cari-buku" name="q" type="search" defaultValue={q} placeholder="Judul, pengarang, atau ISBN" autoComplete="off" />
                {kategori && <input type="hidden" name="kategori" value={kategori} />}
                <button type="submit" className="btn btn-primary">
                  Cari
                </button>
              </form>
      </PageHeader>

      <section className="lgt-bagian">
        <div className="lgt-wadah grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">

            <nav aria-label="Saring kategori" className="flex flex-wrap gap-2">
              <Link href={saring("")} aria-current={!kategori && q !== "rekomendasi" ? "true" : undefined} className="chip-saring">
                Semua
              </Link>
              <Link href="?q=rekomendasi" aria-current={q === "rekomendasi" ? "true" : undefined} className="chip-saring">
                Rekomendasi pustakawan
              </Link>
              {kategoriList.map((k) => (
                <Link key={k.kategori} href={saring(k.kategori)} aria-current={kategori === k.kategori ? "true" : undefined} className="chip-saring">
                  {k.kategori} <span className="tabular-nums text-[var(--muted)]">({k.jumlah})</span>
                </Link>
              ))}
            </nav>

            <div className="mt-6" aria-live="polite">
              {gagal ? (
                <Kosong teks="Katalog gagal dimuat." sub="Coba muat ulang halaman beberapa saat lagi." />
              ) : list.length === 0 ? (
                <Kosong
                  teks={q || kategori ? `Tidak ada buku untuk ${q ? `“${q}”` : ""}${q && kategori ? " di " : ""}${kategori ? `kategori ${kategori}` : ""}.` : "Katalog belum tersedia."}
                  sub={q || kategori ? "Coba kata kunci lain atau pilih Semua." : "Koleksi sedang didata oleh petugas perpustakaan."}
                />
              ) : (
                <>
                  <p className="mb-3 text-sm text-[var(--muted)]">
                    {total.toLocaleString("id-ID")} judul{kategori && ` · kategori ${kategori}`}
                  </p>
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-muncul="kelompok">
                    {list.map((b) => (
                      <li key={b.id} className="kartu flex gap-4 p-4">
                        <Link href={`/perpustakaan/${b.id}`} className="group w-20 shrink-0" tabIndex={-1} aria-hidden>
                          <span className="sampul-buku">
                            {b.sampul_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- sampul dari katalog (domain beragam)
                              <img src={b.sampul_url} alt="" referrerPolicy="no-referrer" loading="lazy" />
                            ) : (
                              <span>{b.judul.match(/[\p{L}\p{N}]/u)?.[0] ?? "?"}</span>
                            )}
                          </span>
                        </Link>
                        <div className="min-w-0">
                          {b.kategori && <p className="text-sm text-[var(--muted)]">{b.kategori}</p>}
                          <h2 className="text-[1.0625rem] font-semibold leading-snug">
                            <Link href={`/perpustakaan/${b.id}`} className="hover:text-[var(--tema-utama)] hover:underline">
                              {b.judul}
                            </Link>
                          </h2>
                          <p className="text-sm text-[var(--muted)]">{[b.pengarang, b.tahun].filter(Boolean).join(" · ")}</p>
                          {(b.rekomendasi || b.rating) && (
                            <p className="mt-1 text-sm">
                              {b.rekomendasi && <span className="label-status mr-2">Rekomendasi</span>}
                              {b.rating && (
                                <span className="text-[var(--muted)]">
                                  ★ {b.rating} <span className="text-[var(--muted)]">({b.jumlah_ulasan} ulasan)</span>
                                </span>
                              )}
                            </p>
                          )}
                          <p className={`mt-2 text-sm font-semibold ${b.tersedia ? "text-emerald-800" : "text-[#8a4b00]"}`}>
                            {b.total === 0 ? "Belum ada eksemplar" : b.tersedia ? `${b.tersedia} dari ${b.total} tersedia` : "Sedang dipinjam semua"}
                            {b.rak && <span className="font-normal text-[var(--muted)]"> · rak {b.rak}</span>}
                          </p>
                          {b.tautan_digital ? (
                            <a href={b.tautan_digital} target="_blank" rel="noopener noreferrer" className="tautan mt-1 inline-block text-sm">
                              Baca versi digital<span className="sr-only"> (tab baru)</span>
                            </a>
                          ) : (
                            b.akses_digital === "warga" && <p className="mt-1 text-sm text-[var(--muted)]">Versi digital untuk warga sekolah (masuk dulu).</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex justify-between gap-3">
                    {hal > 1 ? (
                      <Link href={tautanHal(hal - 1)} className="btn">
                        ← Sebelumnya
                      </Link>
                    ) : (
                      <span />
                    )}
                    {hal * PER < total && (
                      <Link href={tautanHal(hal + 1)} className="btn">
                        Berikutnya →
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <aside className="space-y-6" aria-label="Panduan layanan perpustakaan">
            <div className="kartu p-5" data-muncul>
              <h2 className="flex items-center gap-2 text-[1.125rem] font-semibold">
                <BookOpen size={20} aria-hidden className="text-[var(--tema-utama)]" /> Cara meminjam
              </h2>
              <ol className="mt-3 space-y-2 text-[0.9375rem] text-[var(--muted)]">
                <li>
                  <strong>1. Cari</strong> buku dan cek ketersediaannya di katalog.
                </li>
                <li>
                  <strong>2. Pesan</strong> dari halaman detail buku setelah masuk portal (siswa & guru).
                </li>
                <li>
                  <strong>3. Ambil & kembalikan</strong> di perpustakaan; pantau tenggat di portal.
                </li>
              </ol>
              {aturan && (
                <p className="mt-3 border-t border-[var(--line)] pt-3 text-[0.9375rem] text-[var(--muted)]">
                  Lama pinjam {aturan.lama_pinjam} hari · maksimal {aturan.maks_pinjam} buku
                  {aturan.maks_perpanjang > 0 ? ` · dapat diperpanjang ${aturan.maks_perpanjang}×` : ""}.
                </p>
              )}
            </div>
            <div className="kartu p-5" data-muncul>
              <h2 className="text-[1.125rem] font-semibold">Layanan pribadi</h2>
              <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">Pinjaman aktif, reservasi, perpanjangan, jurnal baca, dan koleksi digital khusus warga sekolah.</p>
              <Link href="/admin/login?sebagai=siswa" className="btn btn-primary mt-3 w-full">
                Masuk Portal Sekolah
                <ArrowRight size={18} aria-hidden className="ikon-geser" />
              </Link>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Petugas perpustakaan mengelola koleksi, anggota, sirkulasi, dan laporan melalui{" "}
                <Link href="/admin/login?sebagai=staf" className="tautan">
                  Portal Manajemen
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
