import QRCode from "qrcode";
import { JudulHalaman } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { NavPerpus } from "@/components/perpus/Nav";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";
import { sekolah } from "@/content/sekolah";

export const metadata = { title: "Label Buku" };

/** Label punggung/sampul: QR berisi kode eksemplar (dibaca pemindai di meja sirkulasi) */
export default async function LabelBuku({ searchParams }: { searchParams: Promise<{ buku?: string; dari?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("perpus.kelola");
  let q = supabase.from("eksemplar").select("kode, buku(judul, nomor_panggil)").neq("status", "dihapus").order("kode").limit(120);
  if (sp.buku && uuid.safeParse(sp.buku).success) q = q.eq("buku_id", sp.buku);
  if (sp.dari && /^PUS\d{6}$/.test(sp.dari.toUpperCase())) q = q.gte("kode", sp.dari.toUpperCase());
  const { data } = await q;
  const label = await Promise.all(((data ?? []) as unknown as { kode: string; buku: { judul: string; nomor_panggil: string } | null }[]).map(async (e) => ({
    ...e, qr: `data:image/svg+xml;utf8,${encodeURIComponent(await QRCode.toString(e.kode, { type: "svg", margin: 0 }))}`,
  })));
  return (
    <>
      <div className="print:hidden">
        <JudulHalaman judul="Label Buku" deskripsi="QR berisi kode eksemplar. Tempel di sampul belakang; pindai saat pinjam/kembali." aksi={<TombolCetak label="Cetak label" />} />
        <NavPerpus kelola />
        <form className="mb-6 flex gap-2 text-sm"><input name="dari" defaultValue={sp.dari} placeholder="Mulai dari kode, mis. PUS000101" className="rounded-full border border-black/15 bg-white px-4 py-2" /><button className="rounded-full bg-brand-900 px-4 py-2 font-semibold text-white">Tampilkan</button><span className="self-center text-black/50">{label.length} label (maks. 120)</span></form>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
        {label.map((e) => (
          <div key={e.kode} className="flex items-center gap-2 rounded border border-black/30 bg-white p-1.5 break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.qr} alt="" className="h-14 w-14 shrink-0" />
            <div className="min-w-0 text-[9px] leading-tight">
              <p className="font-semibold">Perpus {sekolah.namaPendek}</p>
              <p className="font-mono text-xs font-bold">{e.kode}</p>
              <p className="truncate">{e.buku?.nomor_panggil || e.buku?.judul}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
