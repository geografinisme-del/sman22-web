import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKembali, FormPinjam } from "@/components/perpus/Form";
import { NavPerpus } from "@/components/perpus/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { tgl, type Pinjaman } from "@/lib/perpus";
import { batalPesan, perpanjangBuku } from "../../actions-perpus";

export const metadata = { title: "Perpustakaan" };

export default async function Perpus({ searchParams }: { searchParams: Promise<{ pesan?: string; galat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "perpus.kelola");
  const lihat = kelola || punya(akses, "perpus.lihat");

  if (!lihat) {
    const { data: saya } = await supabase.rpc("pegawai_saya");
    const { data: rsv } = saya ? await supabase.from("reservasi_buku").select("id, status, batas_ambil, buku(judul)").eq("pegawai_id", saya).in("status", ["menunggu", "siap"]) : { data: [] };
    const pesanan = (rsv ?? []) as unknown as { id: string; status: string; batas_ambil: string | null; buku: { judul: string } | null }[];
    const { data } = saya ? await supabase.from("pinjaman_buku").select("id, jatuh_tempo, kembali_pada, perpanjang, eksemplar(kode, buku(judul))").eq("pegawai_id", saya).order("pinjam_pada", { ascending: false }).limit(30) : { data: [] };
    type R = { id: string; jatuh_tempo: string; kembali_pada: string | null; perpanjang: number; eksemplar: { kode: string; buku: { judul: string } | null } | null };
    return (
      <>
        <JudulHalaman judul="Perpustakaan" deskripsi="Pinjaman buku Anda." aksi={<Link href="/perpustakaan" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Cari di katalog</Link>} />
        <Notifikasi kode={sp.pesan} />
        {sp.galat && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{sp.galat}</p>}
        {pesanan.length > 0 && (
          <Kartu className="mb-4">
            <h2 className="mb-2 font-semibold">Pesanan buku</h2>
            <ul className="divide-y divide-black/5 text-sm">{pesanan.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="flex-1 font-medium">{r.buku?.judul}</span>
                <span className={r.status === "siap" ? "font-semibold text-emerald-700" : "text-black/60"}>{r.status === "siap" ? `siap diambil s.d. ${tgl(r.batas_ambil!)}` : "dalam antrean"}</span>
                <form action={batalPesan}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kembali" value="/admin/perpus" /><button className="text-xs font-semibold text-blue-teks underline">Batalkan</button></form>
              </li>))}</ul>
          </Kartu>
        )}
        <Kartu>
          {(data ?? []).length === 0 ? <p className="text-sm text-black/50">Belum ada pinjaman.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{((data ?? []) as unknown as R[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="flex-1 font-medium">{r.eksemplar?.buku?.judul} <span className="font-mono text-xs text-black/50">{r.eksemplar?.kode}</span></span>
                <span className="text-black/60">{r.kembali_pada ? `dikembalikan ${tgl(r.kembali_pada)}` : `kembali ${tgl(r.jatuh_tempo)}`}</span>
                {!r.kembali_pada && <form action={perpanjangBuku}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kembali" value="/admin/perpus" /><button className="text-xs font-semibold text-blue-teks underline">Perpanjang</button></form>}
              </li>))}</ul>
          )}
        </Kartu>
      </>
    );
  }

  const [{ data: aktif }, { data: rsv }, { data: stat }] = await Promise.all([
    supabase.rpc("daftar_pinjaman", { p_aktif: true }),
    supabase.rpc("daftar_reservasi"),
    supabase.rpc("statistik_perpus", { p_dari: new Date(Date.UTC(2000, 0, 1)).toISOString().slice(0, 10), p_sampai: "2100-01-01" }),
  ]);
  const list = (aktif ?? []) as Pinjaman[];
  const s = (stat ?? {}) as Record<string, number>;
  const pesanan = (rsv ?? []) as { id: string; judul: string; pemesan: string; kelas: string; status: string; kode: string | null; batas_ambil: string | null; antrean: number }[];
  return (
    <>
      <JudulHalaman judul="Perpustakaan" deskripsi="Meja sirkulasi: pindai kartu/NISN lalu kode buku. Pemindai barcode/QR USB bisa langsung dipakai." />
      <NavPerpus kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Judul buku", s.judul], ["Eksemplar", s.eksemplar], ["Sedang dipinjam", s.dipinjam], ["Terlambat", s.terlambat]].map(([l, v]) => (
          <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className={`text-3xl tabular-nums ${l === "Terlambat" && Number(v) ? "text-amber-700" : ""}`}>{Number(v ?? 0).toLocaleString("id-ID")}</p><p className="text-sm text-black/60">{l}</p></li>
        ))}
      </ul>
      {kelola && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <Kartu><h2 className="mb-4 text-2xl">Pinjam</h2><FormPinjam /></Kartu>
          <Kartu><h2 className="mb-4 text-2xl">Kembali</h2><FormKembali /></Kartu>
        </div>
      )}
      {pesanan.length > 0 && (
        <Kartu className="mb-6">
          <h2 className="mb-3 text-2xl">Pesanan buku ({pesanan.length})</h2>
          <ul className="divide-y divide-black/5 text-sm">{pesanan.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-3 py-2 ${r.status === "siap" ? "" : "text-black/60"}`}>
              <span className="flex-1"><span className="font-medium">{r.judul}</span> · {r.pemesan} <span className="text-black/50">{r.kelas}</span></span>
              {r.status === "siap" ? <span className="font-semibold text-emerald-700">siapkan <span className="font-mono">{r.kode}</span> · s.d. {tgl(r.batas_ambil!)}</span> : <span>antrean ke-{r.antrean}</span>}
              {kelola && <form action={batalPesan}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="kembali" value="/admin/perpus" /><button className="text-xs font-semibold text-blue-teks underline">Batalkan</button></form>}
            </li>))}</ul>
          <p className="mt-2 text-xs text-black/50">Eksemplar yang disiapkan hanya bisa dipinjamkan kepada pemesannya. Pesanan yang tidak diambil 3 hari otomatis gugur dan diteruskan ke antrean berikutnya.</p>
        </Kartu>
      )}
      <Kartu>
        <h2 className="mb-3 text-2xl">Sedang dipinjam ({list.length})</h2>
        {list.length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Buku</th><th>Peminjam</th><th>Dipinjam</th><th>Jatuh tempo</th><th /></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className={`border-t border-black/5 ${p.terlambat ? "bg-red-50/60" : ""}`}>
                    <td className="py-2"><span className="font-medium">{p.judul}</span> <span className="font-mono text-xs text-black/50">{p.kode}</span></td>
                    <td>{p.peminjam} <span className="text-black/50">{p.kelas}</span></td>
                    <td>{tgl(p.pinjam_pada)}</td>
                    <td className={p.terlambat ? "font-semibold text-blue-teks" : ""}>{tgl(p.jatuh_tempo)}{p.terlambat > 0 && ` (+${p.terlambat} hari)`}</td>
                    <td className="text-right">{kelola && <form action={perpanjangBuku}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="kembali" value="/admin/perpus" /><button className="text-xs font-semibold text-blue-teks underline">Perpanjang</button></form>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>
    </>
  );
}
