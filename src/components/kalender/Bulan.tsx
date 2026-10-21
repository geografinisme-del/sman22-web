import Link from "next/link";
import { JENIS_KEGIATAN, type Kegiatan } from "@/lib/kalender";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function tambahHari(t: string, n: number) {
  const d = new Date(t + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Petak satu bulan (Senin di kiri). Hari libur dari data absensi ikut ditandai. */
export function KalenderBulan({ bulan, kegiatan, libur, hariIni, tautan }: { bulan: string; kegiatan: Kegiatan[]; libur: Map<string, string>; hariIni: string; tautan?: (k: Kegiatan) => string }) {
  const awal = `${bulan}-01`;
  const geser = (new Date(awal + "T00:00:00Z").getUTCDay() + 6) % 7;
  const mulaiPetak = tambahHari(awal, -geser);
  const hari = Array.from({ length: 42 }, (_, i) => tambahHari(mulaiPetak, i));
  const minggu = hari.slice(35).every((h) => h.slice(0, 7) !== bulan) ? hari.slice(0, 35) : hari;

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
      <div className="grid grid-cols-7 border-b border-black/10 bg-soft text-center text-xs font-semibold uppercase tracking-wider text-black/50">
        {HARI.map((h) => <div key={h} className="py-2">{h}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {minggu.map((h, i) => {
          const isi = kegiatan.filter((k) => k.mulai <= h && k.selesai >= h);
          const luar = h.slice(0, 7) !== bulan;
          const lib = libur.get(h);
          return (
            <div key={h} className={`min-h-20 border-b border-r border-black/5 p-1 sm:min-h-24 sm:p-1.5 ${luar ? "bg-black/[0.02] text-black/30" : ""} ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}>
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${h === hariIni ? "bg-ink font-bold text-white" : lib || i % 7 === 6 ? "font-semibold text-blue-teks" : ""}`}>
                {Number(h.slice(8))}
              </div>
              {lib && !isi.some((k) => k.kbm_libur) && !luar && <p className="truncate text-[10px] text-blue-teks" title={lib}>{lib}</p>}
              <ul className="space-y-0.5">
                {isi.slice(0, 3).map((k) => {
                  const chip = `block truncate rounded px-1 py-0.5 text-[10px] font-medium ring-1 sm:text-[11px] ${JENIS_KEGIATAN[k.jenis].warna}`;
                  return (
                    <li key={k.id}>
                      {tautan ? <Link href={tautan(k)} className={chip} title={k.judul}>{k.judul}</Link> : <span className={chip} title={k.judul}>{k.judul}</span>}
                    </li>
                  );
                })}
                {isi.length > 3 && <li className="text-[10px] text-black/50">+{isi.length - 3} lagi</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LegendaKegiatan() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60">
      {Object.values(JENIS_KEGIATAN).map((j) => (
        <li key={j.label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${j.titik}`} />{j.label}</li>
      ))}
    </ul>
  );
}

export const bulanBerikut = (b: string, n: number) => {
  const d = new Date(`${b}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
export const namaBulan = (b: string) => new Date(`${b}-01T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
