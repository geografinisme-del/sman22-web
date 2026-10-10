import { notFound } from "next/navigation";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { sekolah } from "@/content/sekolah";
import { getAkses } from "@/lib/admin/auth";
import { pilihKerangka, type BarisAnalisis } from "@/lib/admin/mutu-data";
import { CELAH, PERSETUJUAN, STATUS_CAPAIAN } from "@/lib/mutu";

export const metadata = { title: "Laporan mutu", robots: { index: false } };

export default async function CetakMutu({ searchParams }: { searchParams: Promise<{ k?: string; periode?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await getAkses();
  if (!supabase) notFound();
  const { kini, periode } = await pilihKerangka(supabase, sp.k, sp.periode);
  if (!kini) notFound();
  const { data } = await supabase.rpc("analisis_mutu", { p_kerangka: kini.id, p_periode: periode });
  const baris = (data ?? []) as BarisAnalisis[];
  if (!baris.length) notFound();
  const standar = [...new Map(baris.map((b) => [b.standar_id, `${b.standar_kode}. ${b.standar}`])).entries()];
  const n = baris.length, ok = (f: (b: BarisAnalisis) => boolean) => Math.round((100 * baris.filter(f).length) / n);
  return (
    <main className="mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      <style>{`@page { size: A4; margin: 14mm }`}</style>
      <div className="mb-4 flex justify-end print:hidden"><TombolCetak /></div>
      <p className="text-xs uppercase tracking-[0.3em] text-black/60">{sekolah.nama}</p>
      <h1 className="font-serif text-3xl">Laporan Evaluasi Diri & Bukti Mutu</h1>
      <p className="mt-1">{kini.nama} — {kini.kode} versi {kini.versi} · periode {periode}</p>
      <p className="mt-3 rounded-lg bg-black/5 p-3 text-xs">Persentase berikut menunjukkan kelengkapan pengisian dan bukti di sistem, bukan pernyataan kepatuhan. Penilaian mutu dilakukan oleh tim penjaminan mutu dan asesor.</p>
      <p className="mt-3">Indikator: <strong>{n}</strong> · sudah dievaluasi <strong>{ok((b) => b.status !== "belum")}%</strong> · memiliki bukti <strong>{ok((b) => b.jumlah_bukti > 0)}%</strong> · disetujui <strong>{ok((b) => b.persetujuan === "disetujui")}%</strong></p>
      {standar.map(([sid, nama]) => (
        <section key={sid} className="mt-6 break-inside-avoid-page">
          <h2 className="border-b border-black pb-1 font-serif text-xl">{nama}</h2>
          <table className="mt-2 w-full border-collapse text-xs">
            <thead><tr className="text-left"><th className="w-12 py-1">Kode</th><th>Indikator</th><th>Target</th><th>Capaian</th><th className="w-8">Skor</th><th>Status</th><th>Bukti</th></tr></thead>
            <tbody>{baris.filter((b) => b.standar_id === sid).map((b) => (
              <tr key={b.indikator_id} className="border-t border-black/20 align-top">
                <td className="py-1 font-mono">{b.kode}</td><td>{b.nama}<div className="text-[10px] text-black/50">{b.pemilik}{b.celah.length > 0 && ` · ${b.celah.map((c) => CELAH[c]).join(", ")}`}</div></td>
                <td>{b.target}</td><td>{b.capaian}</td><td>{b.skor ?? ""}</td><td>{STATUS_CAPAIAN[b.status]?.label}<div className="text-[10px] text-black/50">{PERSETUJUAN[b.persetujuan]?.label}</div></td><td>{b.jumlah_bukti}</td>
              </tr>))}</tbody>
          </table>
        </section>
      ))}
      <p className="mt-8 text-xs text-black/50">Dicetak dari sistem informasi sekolah. Daftar bukti lengkap (termasuk sidik jari SHA-256 berkas) tersedia di paket laporan Excel.</p>
    </main>
  );
}
