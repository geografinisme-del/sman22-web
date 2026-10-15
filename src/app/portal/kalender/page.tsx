import Link from "next/link";
import { bulanBerikut, KalenderBulan, LegendaKegiatan, namaBulan } from "@/components/kalender/Bulan";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { JENIS_KEGIATAN, jamKegiatan, KOLOM_KEGIATAN, rentangTanggal, type Kegiatan } from "@/lib/kalender";
import { konteksPortal } from "../data";

export const metadata = { title: "Kalender Sekolah" };

export default async function KalenderPortal({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await konteksPortal();
  const hariIni = hariIniWIB();
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan ?? "") ? sp.bulan! : hariIni.slice(0, 7);
  const dari = bulanBerikut(bulan, -1) + "-20";
  const sampai = bulanBerikut(bulan, 1) + "-10";
  const [{ data: keg }, { data: libur }, { data: dekat }] = await Promise.all([
    supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).is("deleted_at", null).lte("mulai", sampai).gte("selesai", dari).order("mulai"),
    supabase.from("hari_libur").select("tanggal, keterangan").gte("tanggal", dari).lte("tanggal", sampai),
    supabase.from("kegiatan_kalender").select(KOLOM_KEGIATAN).is("deleted_at", null).gte("selesai", hariIni).lte("mulai", geserTanggal(hariIni, 45)).order("mulai").limit(15),
  ]);
  const akanDatang = (dekat ?? []) as Kegiatan[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Kalender sekolah</h1>
        <p className="text-sm text-[#5b6270]">Ujian, kegiatan, dan hari libur. Kegiatan umum bisa ditambahkan ke kalender HP lewat <a href="/kalender.ics" className="underline">tautan iCal</a>.</p>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-serif text-2xl">45 hari ke depan</h2>
        {akanDatang.length === 0 ? <p className="mt-2 text-sm text-[#5b6270]">Belum ada kegiatan.</p> : (
          <ul className="mt-3 divide-y divide-black/5">
            {akanDatang.map((k) => (
              <li key={k.id} className="flex gap-3 py-2.5 text-sm">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${JENIS_KEGIATAN[k.jenis].titik}`} aria-hidden />
                <span>
                  <span className="block font-semibold">{k.judul}{k.kbm_libur && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-900">tidak ada KBM</span>}</span>
                  <span className="block text-[#5b6270]">{rentangTanggal(k.mulai, k.selesai)}{jamKegiatan(k) && ` · ${jamKegiatan(k)}`}{k.lokasi && ` · ${k.lokasi}`}</span>
                  {k.keterangan && <span className="block text-[#5b6270]">{k.keterangan}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Link href={`?bulan=${bulanBerikut(bulan, -1)}`} className="rounded-full px-3 py-1.5 ring-1 ring-black/15" aria-label="Bulan sebelumnya">←</Link>
          <h2 className="min-w-40 text-center font-serif text-2xl capitalize">{namaBulan(bulan)}</h2>
          <Link href={`?bulan=${bulanBerikut(bulan, 1)}`} className="rounded-full px-3 py-1.5 ring-1 ring-black/15" aria-label="Bulan berikutnya">→</Link>
        </div>
        <LegendaKegiatan />
        <KalenderBulan bulan={bulan} kegiatan={(keg ?? []) as Kegiatan[]} libur={new Map((libur ?? []).map((l) => [l.tanggal as string, l.keterangan as string]))} hariIni={hariIni} />
      </section>
    </div>
  );
}
