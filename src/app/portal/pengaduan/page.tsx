import Link from "next/link";
import { KATEGORI_ADUAN, STATUS_ADUAN } from "@/lib/humas";
import { Lencana } from "@/lib/lms";
import { FormNilai } from "@/components/humas/Publik";
import { konteksPortal } from "../data";

export const metadata = { title: "Pengaduan saya" };
type P = { id: string; tiket: string; kategori: string; judul: string; status: string; tanggapan_publik: string; dibuat: string; diperbarui: string; rating: number | null };

export default async function PengaduanSaya() {
  const { supabase } = await konteksPortal();
  const { data } = await supabase.rpc("pengaduan_saya");
  const list = (data ?? []) as P[];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1"><h1 className="font-serif text-3xl">Pengaduan & Aspirasi</h1><p className="text-sm text-black/60">Pengaduan yang Anda kirim saat masuk ke portal. Anda mendapat notifikasi setiap ada tanggapan.</p></div>
        <Link href="/pengaduan" className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">Kirim pengaduan</Link>
      </div>
      {list.length === 0 ? <p className="rounded-2xl bg-white p-5 text-black/50 ring-1 ring-black/5">Belum ada pengaduan.</p> : list.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-black/50">{p.tiket}</span><Lencana s={p.status} peta={STATUS_ADUAN} /><span className="text-xs text-black/50">{KATEGORI_ADUAN[p.kategori as keyof typeof KATEGORI_ADUAN]}</span></div>
          <p className="mt-2 font-semibold">{p.judul}</p>
          {p.tanggapan_publik ? <p className="mt-2 whitespace-pre-line rounded-xl bg-krem p-3 text-sm"><strong>Tanggapan sekolah:</strong> {p.tanggapan_publik}</p> : <p className="mt-2 text-sm text-black/50">Belum ada tanggapan.</p>}
          {["selesai", "ditolak"].includes(p.status) && (p.rating ? <p className="mt-2 text-sm text-black/60">Penilaian Anda: <span className="text-amber-500">{"★".repeat(p.rating)}</span></p> : <div className="mt-3"><FormNilai id={p.id} /></div>)}
          <p className="mt-2 text-xs text-black/40">Dikirim {new Date(p.dibuat).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })}</p>
        </div>
      ))}
    </div>
  );
}
