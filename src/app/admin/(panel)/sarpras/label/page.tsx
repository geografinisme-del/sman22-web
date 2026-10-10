import { JudulHalaman } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { NavSarpras } from "@/components/sarpras/Nav";
import { wajibIzin } from "@/lib/admin/auth";
import { qrBarang } from "@/lib/admin/qr";
import { uuid } from "@/lib/admin/schema";
import { sekolah } from "@/content/sekolah";

export const metadata = { title: "Label QR Inventaris" };

export default async function Label({ searchParams }: { searchParams: Promise<{ id?: string; ruang?: string; kategori?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("sarpras.kelola");
  let q = supabase.from("barang").select("id, kode, nama, ruang(nama)").is("deleted_at", null).order("kode").limit(120);
  if (sp.id && uuid.safeParse(sp.id).success) q = q.eq("id", sp.id);
  if (sp.ruang && uuid.safeParse(sp.ruang).success) q = q.eq("ruang_id", sp.ruang);
  if (sp.kategori && uuid.safeParse(sp.kategori).success) q = q.eq("kategori_id", sp.kategori);
  const [{ data }, { data: ruang }, { data: kategori }] = await Promise.all([
    q, supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"), supabase.from("kategori_barang").select("id, nama").order("urutan"),
  ]);
  const label = await Promise.all(((data ?? []) as unknown as { id: string; kode: string; nama: string; ruang: { nama: string } | null }[]).map(async (b) => ({ ...b, qr: await qrBarang(b.id) })));

  return (
    <>
      <div className="print:hidden">
        <JudulHalaman judul="Label QR Inventaris" deskripsi="Cetak di kertas stiker (A4, 3 kolom). Pindai dengan kamera HP untuk membuka data barang." aksi={<TombolCetak label="Cetak label" />} />
        <NavSarpras lihat kelola />
        <form className="mb-6 flex flex-wrap gap-2 text-sm">
          <select name="ruang" defaultValue={sp.ruang ?? ""} className="rounded-full border border-black/15 bg-white px-3 py-2" aria-label="Ruang"><option value="">Semua lokasi</option>{(ruang ?? []).map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
          <select name="kategori" defaultValue={sp.kategori ?? ""} className="rounded-full border border-black/15 bg-white px-3 py-2" aria-label="Kategori"><option value="">Semua kategori</option>{(kategori ?? []).map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}</select>
          <button className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white">Tampilkan</button>
          <span className="self-center text-black/50">{label.length} label (maks. 120 per cetak)</span>
        </form>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
        {label.map((b) => (
          <div key={b.id} className="flex items-center gap-2 rounded-lg border border-black/20 bg-white p-2 break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.qr} alt="" className="h-20 w-20 shrink-0" />
            <div className="min-w-0 text-[10px] leading-tight">
              <p className="font-semibold">{sekolah.namaPendek}</p>
              <p className="truncate text-xs font-semibold">{b.nama}</p>
              <p className="font-mono">{b.kode}</p>
              <p className="text-black/60">{b.ruang?.nama ?? ""}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
