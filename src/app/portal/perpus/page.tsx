import Link from "next/link";
import { hariIniWIB } from "@/lib/admin/absensi";
import { tgl } from "@/lib/perpus";
import { batalPesan, perpanjangBuku } from "@/app/admin/actions-perpus";
import { FormJurnal } from "@/components/perpus/Literasi";
import { konteksPortal } from "../data";

export const metadata = { title: "Perpustakaan" };

type R = { id: string; siswa_id: string; pinjam_pada: string; jatuh_tempo: string; kembali_pada: string | null; perpanjang: number; denda: number; denda_lunas: boolean; eksemplar: { kode: string; buku: { judul: string } | null } | null };

export default async function PerpusPortal({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase, anak, ortu } = await konteksPortal();
  const { data } = await supabase.from("pinjaman_buku").select("id, siswa_id, pinjam_pada, jatuh_tempo, kembali_pada, perpanjang, denda, denda_lunas, eksemplar(kode, buku(judul))").order("pinjam_pada", { ascending: false }).limit(60);
  const list = (data ?? []) as unknown as R[];
  const hari = hariIniWIB();
  const [{ data: rsv }, { data: jur }, { data: tan }, { data: duta }] = await Promise.all([
    supabase.from("reservasi_buku").select("id, siswa_id, status, batas_ambil, created_at, buku(judul)").in("status", ["menunggu", "siap"]).order("created_at"),
    supabase.from("jurnal_baca").select("id, siswa_id, judul, tanggal, halaman, menit, status, catatan_pembina").order("tanggal", { ascending: false }).limit(30),
    supabase.rpc("tantangan_saya"),
    supabase.rpc("daftar_duta"),
  ]);
  const pesanan = (rsv ?? []) as unknown as { id: string; siswa_id: string; status: string; batas_ambil: string | null; buku: { judul: string } | null }[];
  const jurnal = (jur ?? []) as { id: string; siswa_id: string; judul: string; tanggal: string; halaman: number; menit: number; status: string; catatan_pembina: string }[];
  const tantangan = (tan ?? []) as { id: string; judul: string; deskripsi: string; selesai: string; target_buku: number; target_menit: number; siswa_id: string; buku: number; menit: number }[];
  const dutaSaya = (duta ?? []) as { nama: string; peran: string }[];
  const PESAN: Record<string, string> = { diperpanjang: "Peminjaman diperpanjang.", "pesanan-batal": "Pesanan dibatalkan." };
  const STJ: Record<string, string> = { diajukan: "menunggu diperiksa", disetujui: "disetujui ✓", revisi: "perlu diperbaiki" };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h1 className="font-serif text-3xl">Perpustakaan</h1><p className="text-sm text-black/60">Pinjaman buku{ortu ? " anak" : ""} dan riwayatnya.</p></div>
        <Link href="/perpustakaan" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Cari buku</Link>
      </div>
      {sp.pesan && PESAN[sp.pesan] && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{PESAN[sp.pesan]}</p>}
      {dutaSaya.length > 0 && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">🏅 {dutaSaya.map((d) => `${d.nama} — ${d.peran}`).join(", ")} tahun ajaran ini.</p>}
      {sp.galat && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
      {anak.map((a) => {
        const milik = list.filter((p) => p.siswa_id === a.id);
        const aktif = milik.filter((p) => !p.kembali_pada);
        return (
          <section key={a.id} className="space-y-3">
            {ortu && <h2 className="font-semibold">{a.nama}</h2>}
            {pesanan.filter((r) => r.siswa_id === a.id).map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 text-sm ring-1 ${r.status === "siap" ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-black/5"}`}>
                <p className="flex-1"><strong>{r.buku?.judul}</strong><br />{r.status === "siap" ? `Siap diambil sampai ${tgl(r.batas_ambil!)}` : "Dalam antrean pesanan"}</p>
                <form action={batalPesan}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kembali" value="/portal/perpus" />
                  <button className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-black/15">Batalkan</button></form>
              </div>
            ))}
            {aktif.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-black/50 ring-1 ring-black/5">Tidak ada buku yang sedang dipinjam.</p> : (
              <ul className="space-y-2">
                {aktif.map((p) => {
                  const telat = p.jatuh_tempo < hari;
                  return (
                    <li key={p.id} className={`rounded-2xl bg-white p-4 ring-1 ${telat ? "ring-red-300" : "ring-black/5"}`}>
                      <p className="font-semibold">{p.eksemplar?.buku?.judul}</p>
                      <p className={`text-sm ${telat ? "font-semibold text-merah" : "text-black/60"}`}>Kembalikan paling lambat {tgl(p.jatuh_tempo)}{telat && " — terlambat"}</p>
                      {!telat && (
                        <form action={perpanjangBuku} className="mt-2"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="kembali" value="/portal/perpus" />
                          <button className="rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-black/15">Perpanjang</button></form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {milik.some((p) => p.kembali_pada) && (
              <details className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
                <summary className="cursor-pointer font-semibold">Riwayat ({milik.filter((p) => p.kembali_pada).length})</summary>
                <ul className="mt-2 divide-y divide-black/5">{milik.filter((p) => p.kembali_pada).map((p) => (
                  <li key={p.id} className="flex gap-2 py-1.5"><span className="flex-1">{p.eksemplar?.buku?.judul}</span><span className="text-black/50">{tgl(p.pinjam_pada)}</span>
                    {!p.denda_lunas && <span className="font-semibold text-merah">denda Rp{Number(p.denda).toLocaleString("id-ID")}</span>}</li>))}</ul>
              </details>
            )}
          </section>
        );
      })}

      {tantangan.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Tantangan literasi</h2>
          {tantangan.map((t) => {
            const pb = t.target_buku ? Math.min(100, Math.round((100 * t.buku) / t.target_buku)) : 100;
            const pm = t.target_menit ? Math.min(100, Math.round((100 * t.menit) / t.target_menit)) : 100;
            const p = Math.min(pb, pm);
            return (
              <div key={t.id + t.siswa_id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="font-semibold">{t.judul}{ortu && <span className="font-normal text-black/50"> · {anak.find((a) => a.id === t.siswa_id)?.nama}</span>}</p>
                {t.deskripsi && <p className="text-sm text-black/60">{t.deskripsi}</p>}
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-emerald-600" style={{ width: `${p}%` }} /></div>
                <p className="mt-1 text-xs text-black/60">{t.target_buku > 0 && `${t.buku}/${t.target_buku} buku`}{t.target_buku > 0 && t.target_menit > 0 && " · "}{t.target_menit > 0 && `${t.menit}/${t.target_menit} menit`} · sampai {tgl(t.selesai)}{p >= 100 && " — tuntas! 🎉"}</p>
              </div>
            );
          })}
          <p className="text-xs text-black/50">Dihitung dari jurnal baca yang sudah disetujui pembina.</p>
        </section>
      )}

      <section id="jurnal" className="space-y-3">
        <h2 className="font-serif text-2xl">Jurnal baca</h2>
        {!ortu && (
          <details className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <summary className="cursor-pointer font-semibold">+ Tulis jurnal baca</summary>
            <div className="mt-4"><FormJurnal hari={hari} /></div>
          </details>
        )}
        {jurnal.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-black/50 ring-1 ring-black/5">Belum ada jurnal baca.</p> : (
          <ul className="divide-y divide-black/5 rounded-2xl bg-white px-4 text-sm ring-1 ring-black/5">
            {jurnal.map((j) => (
              <li key={j.id} className="py-3">
                <p><strong>{j.judul}</strong> <span className="text-black/50">· {tgl(j.tanggal)} · {[j.halaman ? `${j.halaman} hlm` : "", j.menit ? `${j.menit} menit` : ""].filter(Boolean).join(", ")}</span></p>
                <p className={j.status === "revisi" ? "text-merah" : j.status === "disetujui" ? "text-emerald-700" : "text-black/50"}>{STJ[j.status]}{j.catatan_pembina && ` — ${j.catatan_pembina}`}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
