import { notFound } from "next/navigation";
import { sekolah } from "@/content/sekolah";
import { getAkses } from "@/lib/admin/auth";
import { qrSertifikat } from "@/lib/admin/qr";
import { JENIS_SERTIF } from "@/lib/ekskul";
import { TombolCetak } from "@/components/jadwal/Bantu";

export const metadata = { title: "Sertifikat", robots: { index: false } };
type D = { kode: string; nama: string; nisn: string; organisasi: string; logo_url: string; warna: string; jenis: string; judul: string; keterangan: string; tanggal: string; dicabut: boolean; pembina: string };

export default async function CetakSertifikat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await getAkses();
  if (!supabase) notFound();
  const { data } = await supabase.rpc("data_sertifikat", { p_id: id });
  const d = ((data ?? []) as D[])[0];
  if (!d) notFound();
  const qr = await qrSertifikat(d.kode);
  const tanggal = new Date(d.tanggal + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <main className="min-h-screen bg-neutral-200 p-6 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .jangan-cetak { display: none } }`}</style>
      <div className="jangan-cetak mx-auto mb-4 flex max-w-[297mm] justify-between text-sm">
        <span>{d.dicabut ? "⚠ Sertifikat ini sudah DICABUT." : "Gunakan Cetak → Simpan sebagai PDF, orientasi lanskap."}</span>
        <TombolCetak label="Cetak" />
      </div>
      <div className="overflow-x-auto print:overflow-visible"><section className="relative mx-auto flex h-[210mm] w-[297mm] flex-col bg-white p-[14mm] shadow-xl print:shadow-none" style={{ borderTop: `10mm solid ${d.warna}` }}>
        {d.dicabut && <p className="absolute inset-0 grid place-items-center text-[60pt] font-bold text-red-600/20 -rotate-12">DICABUT</p>}
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {d.logo_url && <img src={d.logo_url} alt="" className="h-16 w-16 object-contain" referrerPolicy="no-referrer" />}
          <div><p className="text-sm uppercase tracking-[0.3em] text-black/60">{sekolah.nama}</p><p className="font-serif text-2xl" style={{ color: d.warna }}>{d.organisasi}</p></div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-black/50">Sertifikat {JENIS_SERTIF[d.jenis]}</p>
          <p className="mt-6 text-lg">diberikan kepada</p>
          <p className="mt-2 font-serif text-[34pt] leading-tight">{d.nama}</p>
          <p className="text-sm text-black/50">NISN {d.nisn}</p>
          <p className="mt-6 max-w-[200mm] text-xl">{d.judul}</p>
          {d.keterangan && <p className="mt-2 max-w-[200mm] text-black/70">{d.keterangan}</p>}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR verifikasi" className="h-24 w-24" />
            <div className="text-xs text-black/60"><p>Verifikasi keaslian:</p><p className="font-mono text-sm text-black">{d.kode}</p><p>pindai QR atau buka /sertifikat</p></div>
          </div>
          <div className="text-center text-sm">
            <p>Bandung, {tanggal}</p>
            <p className="mt-16 font-semibold">{d.pembina || "Pembina"}</p>
            <p className="text-black/60">Pembina</p>
          </div>
        </div>
      </section></div>
    </main>
  );
}
