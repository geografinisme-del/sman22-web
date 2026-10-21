import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_SISWA_ABSEN, awalBulan, hariIniWIB, type KodeAbsen } from "@/lib/admin/absensi";
import { konteksPortal } from "../../data";

export const metadata = { title: "Kalender Kehadiran" };

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function geserBulan(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function KalenderAnak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bulan?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, anak } = await konteksPortal();
  const a = anak.find((x) => x.id === id);
  if (!a) notFound();

  const hari = hariIniWIB();
  const bulanIni = hari.slice(0, 7);
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan ?? "") && sp.bulan! <= bulanIni ? sp.bulan! : bulanIni;
  const [y, m] = bulan.split("-").map(Number);
  const jumlahHari = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const awal = awalBulan(`${bulan}-01`);
  const akhir = `${bulan}-${String(jumlahHari).padStart(2, "0")}`;

  const [{ data: absen }, { data: libur }, { data: atur }] = await Promise.all([
    supabase.from("absensi_siswa").select("tanggal, status, keterangan").eq("siswa_id", a.id).gte("tanggal", awal).lte("tanggal", akhir),
    supabase.from("hari_libur").select("tanggal, keterangan").gte("tanggal", awal).lte("tanggal", akhir),
    supabase.from("pengaturan_absensi").select("hari_sekolah").eq("id", 1).maybeSingle(),
  ]);
  const catat = new Map((absen ?? []).map((r) => [r.tanggal as string, r]));
  const libMap = new Map((libur ?? []).map((r) => [r.tanggal as string, r.keterangan as string]));
  const hariSekolah = new Set<number>((atur?.hari_sekolah as number[] | undefined) ?? [1, 2, 3, 4, 5]);

  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Senin = 0
  const sel: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: jumlahHari }, (_, i) => `${bulan}-${String(i + 1).padStart(2, "0")}`)];
  const daftar = [...catat.values()].sort((p, q) => (p.tanggal < q.tanggal ? -1 : 1));

  return (
    <div className="space-y-5">
      <Link href="/portal" className="text-sm text-blue-teks">← Beranda</Link>
      <div>
        <h1 className="text-3xl leading-tight">{a.nama}</h1>
        <p className="text-sm text-[var(--muted)]">{a.kelas ? `Kelas ${a.kelas}` : ""}</p>
      </div>

      <section className="rounded-3xl bg-white p-4 ring-1 ring-black/5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/portal/anak/${a.id}?bulan=${geserBulan(bulan, -1)}`} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10" aria-label="Bulan sebelumnya">←</Link>
          <h2 className="text-2xl">{BULAN[m - 1]} {y}</h2>
          {bulan < bulanIni ? (
            <Link href={`/portal/anak/${a.id}?bulan=${geserBulan(bulan, 1)}`} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-black/10" aria-label="Bulan berikutnya">→</Link>
          ) : (
            <span className="w-9" />
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label={`Kalender ${BULAN[m - 1]} ${y}`}>
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => (
            <div key={h} className="pb-1 font-semibold text-[var(--muted)]">{h}</div>
          ))}
          {sel.map((t, i) => {
            if (!t) return <div key={`k${i}`} />;
            const isodow = ((new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
            const r = catat.get(t);
            const lib = libMap.get(t);
            const masaDepan = t > hari;
            const sekolah = hariSekolah.has(isodow) && !lib;
            let kelas = "bg-soft text-black/30";
            let isi = "";
            if (r) {
              kelas = `${STATUS_SISWA_ABSEN[r.status as KodeAbsen].warna} text-white`;
              isi = STATUS_SISWA_ABSEN[r.status as KodeAbsen].pendek;
            } else if (lib) {
              kelas = "bg-rose-50 text-rose-400";
            } else if (sekolah && !masaDepan) {
              kelas = "bg-emerald-50 text-emerald-800";
            }
            return (
              <div
                key={t}
                title={r ? `${STATUS_SISWA_ABSEN[r.status as KodeAbsen].label}${r.keterangan ? ` – ${r.keterangan}` : ""}` : lib ?? undefined}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl ${kelas} ${t === hari ? "ring-2 ring-blue" : ""}`}
              >
                <span className="text-sm font-semibold">{Number(t.slice(8))}</span>
                {isi && <span className="text-[10px] font-bold leading-none">{isi}</span>}
              </div>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
          <li><span className="mr-1 inline-block h-3 w-3 rounded bg-emerald-50 align-middle ring-1 ring-emerald-200" />Hadir</li>
          {(["T", "S", "I", "A", "PC"] as KodeAbsen[]).map((k) => (
            <li key={k}><span className={`mr-1 inline-block h-3 w-3 rounded align-middle ${STATUS_SISWA_ABSEN[k].warna}`} />{STATUS_SISWA_ABSEN[k].label}</li>
          ))}
          <li><span className="mr-1 inline-block h-3 w-3 rounded bg-rose-50 align-middle ring-1 ring-rose-200" />Libur</li>
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-2xl">Catatan bulan ini</h2>
        {daftar.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Tidak ada catatan ketidakhadiran atau keterlambatan.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5 text-sm">
            {daftar.map((r) => (
              <li key={r.tanggal} className="flex justify-between gap-3 py-2">
                <span>
                  {new Date(r.tanggal + "T00:00:00Z").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                  {r.keterangan && <span className="block text-xs text-[var(--muted)]">{r.keterangan}</span>}
                </span>
                <span className="shrink-0 font-semibold">{STATUS_SISWA_ABSEN[r.status as KodeAbsen].label}</span>
              </li>
            ))}
          </ul>
        )}
        {libMap.size > 0 && (
          <p className="mt-3 text-xs text-[var(--muted)]">Libur: {[...libMap.entries()].map(([t, k]) => `${Number(t.slice(8))} (${k})`).join(", ")}</p>
        )}
      </section>
    </div>
  );
}
