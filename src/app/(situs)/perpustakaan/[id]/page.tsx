import type { Metadata } from "next";
import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { notFound } from "next/navigation";
import { pesanBuku } from "@/app/admin/actions-perpus";
import { FormUlasan } from "@/components/perpus/Literasi";
import { PageHeader, Section } from "@/components/ui";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type B = { id: string; judul: string; pengarang: string; penerbit: string; tahun: number | null; isbn: string; kategori: string; nomor_panggil: string; rak: string; sinopsis: string; sampul_url: string; tautan_digital: string; lisensi: string; akses_digital: string; rekomendasi: boolean; tersedia: number; total: number; rating: number | null; jumlah_ulasan: number; lokasi: string[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ambil(id: string) {
  if (!supabaseAktif || !UUID.test(id)) return null;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("buku_publik", { p_id: id });
  return { sb, b: ((data ?? []) as B[])[0] ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await ambil((await params).id);
  return { title: r?.b ? `${r.b.judul} — Perpustakaan` : "Perpustakaan" };
}

const PESAN: Record<string, string> = {
  "pesanan-siap": "Buku dipesan dan sudah disiapkan. Ambil di perpustakaan dalam 3 hari.",
  "pesanan-antre": "Buku dipesan. Anda masuk antrean dan akan diberi tahu saat buku siap diambil.",
};

export default async function DetailBuku({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await ambil(id);
  if (!r?.b) notFound();
  const { sb, b } = r;
  const [{ data: u }, { data: ul }] = await Promise.all([sb.auth.getUser(), sb.rpc("ulasan_publik", { p_buku: b.id })]);
  const masuk = Boolean(u.user);
  const ulasan = (ul ?? []) as { rating: number; isi: string; penulis: string; dibuat: string }[];
  return (
    <>
      <PageHeader judul={b.judul} deskripsi={[b.pengarang, b.penerbit, b.tahun].filter(Boolean).join(" · ")} />
      <Section>
        <Link href="/perpustakaan" className="mb-6 inline-block text-sm underline">← Katalog</Link>
        {sp.pesan && PESAN[sp.pesan] && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{PESAN[sp.pesan]}</p>}
        {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat.slice(0, 200)}</p>}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="flex gap-5">
              {b.sampul_url ? (
                <MediaSlot src={b.sampul_url} alt="" ratio="2/3" sizes="128px" className="w-32 shrink-0 rounded-[12px]" />
              ) : <span className="sampul-buku w-32 shrink-0" aria-hidden><span>{b.judul.match(/[\p{L}\p{N}]/u)?.[0] ?? "?"}</span></span>}
              <dl className="grid grid-cols-[110px_1fr] content-start gap-y-1 text-sm">
                <dt className="text-[var(--muted)]">Kategori</dt><dd>{b.kategori || "—"}</dd>
                <dt className="text-[var(--muted)]">No. panggil</dt><dd>{b.nomor_panggil || "—"}</dd>
                <dt className="text-[var(--muted)]">ISBN</dt><dd>{b.isbn || "—"}</dd>
                <dt className="text-[var(--muted)]">Lokasi</dt><dd>{b.lokasi.join(", ") || "—"}{b.rak && ` · rak ${b.rak}`}</dd>
                <dt className="text-[var(--muted)]">Ulasan</dt><dd>{b.rating ? <span className="text-amber-600">★ {b.rating} <span className="text-[var(--muted)]">({b.jumlah_ulasan})</span></span> : "belum ada"}</dd>
              </dl>
            </div>
            {b.rekomendasi && <p className="inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">★ Rekomendasi pustakawan</p>}
            {b.sinopsis && <p className="whitespace-pre-line leading-relaxed text-[var(--muted)]">{b.sinopsis}</p>}
            <section>
              <h2 className="mb-3 text-2xl">Ulasan pembaca</h2>
              {ulasan.length === 0 ? <p className="text-sm text-[var(--muted)]">Belum ada ulasan.</p> : (
                <ul className="space-y-3">{ulasan.map((x, i) => (
                  <li key={i} className="kartu p-4">
                    <p className="text-amber-500" aria-label={`${x.rating} dari 5 bintang`}>{"★".repeat(x.rating)}<span className="text-black/20">{"★".repeat(5 - x.rating)}</span></p>
                    <p className="mt-1 text-sm">{x.isi}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{x.penulis} · {new Date(x.dibuat).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</p>
                  </li>))}</ul>
              )}
            </section>
          </div>
          <aside className="space-y-4 self-start">
            <div className="kartu p-5">
              <p className={`text-lg font-semibold ${b.tersedia ? "text-emerald-700" : "text-[var(--tema-utama)]"}`}>{b.tersedia ? `${b.tersedia} dari ${b.total} tersedia` : b.total ? "Sedang dipinjam semua" : "Tidak bisa dipinjam"}</p>
              {b.total > 0 && (masuk ? (
                <form action={pesanBuku} className="mt-3">
                  <input type="hidden" name="buku_id" value={b.id} /><input type="hidden" name="kembali" value={`/perpustakaan/${b.id}`} />
                  <button className="btn btn-primary w-full">{b.tersedia ? "Pesan & ambil nanti" : "Masuk antrean pesanan"}</button>
                  <p className="mt-2 text-xs text-[var(--muted)]">Buku ditahan 3 hari setelah siap. Untuk siswa dan guru/staf.</p>
                </form>
              ) : <p className="mt-2 text-sm text-[var(--muted)]"><Link href={`/masuk?lanjut=${encodeURIComponent(`/perpustakaan/${id}`)}`} className="underline">Masuk</Link> untuk memesan buku ini.</p>)}
              {b.tautan_digital ? (
                <a href={b.tautan_digital} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-lg px-5 py-3 text-center font-semibold ring-1 ring-blue text-[var(--tema-utama)]">Baca versi digital ↗</a>
              ) : b.akses_digital === "warga" && b.lisensi && !masuk ? <p className="mt-3 text-sm text-[var(--muted)]">Versi digital tersedia untuk warga sekolah — masuk untuk membaca.</p> : null}
              {b.lisensi && <p className="mt-2 text-xs text-[var(--muted)]">Lisensi: {b.lisensi}</p>}
            </div>
            {masuk && <div className="kartu p-5"><h2 className="mb-3 font-semibold">Tulis ulasan</h2><FormUlasan buku_id={b.id} /></div>}
          </aside>
        </div>
      </Section>
    </>
  );
}
