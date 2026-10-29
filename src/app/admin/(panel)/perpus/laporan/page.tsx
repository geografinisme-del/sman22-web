import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormKunjungan, FormPengaturanPerpus } from "@/components/perpus/Form";
import { NavPerpus } from "@/components/perpus/Nav";
import { awalBulan, hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibBoleh } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { redirect } from "next/navigation";
import { tgl, type Pinjaman } from "@/lib/perpus";
import { lunasiDenda } from "../../../actions-perpus";

export const metadata = { title: "Laporan Perpustakaan" };

export default async function Laporan({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibBoleh(BOLEH.katalogPerpus);
  const kelola = punya(akses, "perpus.kelola");
  if (!kelola && !punya(akses, "perpus.lihat")) redirect("/admin/perpus");
  const hari = hariIniWIB();
  const dari = /^\d{4}-\d{2}-\d{2}$/.test(sp.dari ?? "") ? sp.dari! : awalBulan(hari);
  const sampai = /^\d{4}-\d{2}-\d{2}$/.test(sp.sampai ?? "") ? sp.sampai! : hari;
  const [{ data: stat }, { data: c }, { data: riwayat }] = await Promise.all([
    supabase.rpc("statistik_perpus", { p_dari: dari, p_sampai: sampai }),
    supabase.from("pengaturan_perpus").select("*").eq("id", 1).single(),
    supabase.rpc("daftar_pinjaman", { p_aktif: false }),
  ]);
  const s = (stat ?? {}) as { pinjam_periode: number; kunjungan_periode: number; denda_belum_lunas: number; populer: { judul: string; n: number }[]; per_kelas: { kelas: string; n: number }[] };
  const denda = ((riwayat ?? []) as Pinjaman[]).filter((p) => !p.denda_lunas && Number(p.denda) > 0);
  return (
    <>
      <JudulHalaman judul="Laporan Perpustakaan" deskripsi="Statistik peminjaman, kunjungan, buku terpopuler, dan denda." />
      <NavPerpus kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <form className="mb-6 flex flex-wrap items-end gap-2 text-sm">
        <label>Dari<input type="date" name="dari" defaultValue={dari} className="ml-2 rounded-lg border border-black/15 px-2 py-1.5" /></label>
        <label>Sampai<input type="date" name="sampai" defaultValue={sampai} className="ml-2 rounded-lg border border-black/15 px-2 py-1.5" /></label>
        <button className="rounded-full bg-ink px-4 py-2 font-semibold text-white">Tampilkan</button>
      </form>
      <ul className="mb-6 grid grid-cols-3 gap-3">
        {[["Peminjaman", s.pinjam_periode], ["Kunjungan", s.kunjungan_periode], ["Denda belum lunas (Rp)", s.denda_belum_lunas]].map(([l, v]) => (
          <li key={String(l)} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-3xl tabular-nums">{Number(v ?? 0).toLocaleString("id-ID")}</p><p className="text-sm text-black/60">{l}</p></li>
        ))}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <Kartu><h2 className="mb-3 text-2xl">Buku terpopuler</h2>
          {s.populer?.length ? <ol className="list-decimal space-y-1 pl-5 text-sm">{s.populer.map((p) => <li key={p.judul}>{p.judul} <span className="text-black/50">({p.n}×)</span></li>)}</ol> : <p className="text-sm text-black/50">Belum ada data.</p>}
        </Kartu>
        <Kartu><h2 className="mb-3 text-2xl">Peminjaman per kelas</h2>
          {s.per_kelas?.length ? <ul className="space-y-1 text-sm">{s.per_kelas.map((p) => <li key={p.kelas} className="flex gap-2"><span className="w-20">{p.kelas}</span><span className="h-4 rounded bg-muted" style={{ width: `${Math.min(100, p.n * 8)}%` }} /><span>{p.n}</span></li>)}</ul> : <p className="text-sm text-black/50">Belum ada data.</p>}
        </Kartu>
        {kelola && <Kartu><h2 className="mb-3 text-2xl">Catat kunjungan</h2><FormKunjungan /></Kartu>}
        {kelola && c && <Kartu><h2 className="mb-3 text-2xl">Aturan peminjaman</h2><FormPengaturanPerpus c={c} /></Kartu>}
        <Kartu className="lg:col-span-2">
          <h2 id="denda" className="mb-3 text-2xl">Denda belum lunas</h2>
          {denda.length === 0 ? <p className="text-sm text-black/50">Tidak ada.</p> : (
            <ul className="divide-y divide-black/5 text-sm">{denda.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2"><span className="flex-1">{p.peminjam} {p.kelas && <span className="text-black/50">{p.kelas}</span>} — {p.judul} (kembali {p.kembali_pada && tgl(p.kembali_pada)})</span>
                <span className="font-semibold tabular-nums">Rp{Number(p.denda).toLocaleString("id-ID")}</span>
                {kelola && <form action={lunasiDenda}><input type="hidden" name="id" value={p.id} /><button className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/15">Lunas</button></form>}</li>))}</ul>
          )}
        </Kartu>
      </div>
    </>
  );
}
