import { JadwalMingguan } from "@/components/jadwal/JadwalMingguan";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import { muatEntri, muatJam, muatPerubahan, namaUntukPerubahan, teksPerubahan } from "@/lib/admin/jadwal-data";
import { formatTanggal } from "@/lib/format";
import { konteksPortal } from "../data";

export const metadata = { title: "Jadwal Pelajaran" };

export default async function JadwalPortal() {
  const { supabase, anak } = await konteksPortal();
  const hari = hariIniWIB();
  const isoHari = ((new Date(hari + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  const kelasIds = [...new Set(anak.map((a) => a.kelas_id).filter(Boolean))] as string[];
  const [jam, perubahan, ...perKelas] = await Promise.all([
    muatJam(supabase),
    muatPerubahan(supabase, hari, geserTanggal(hari, 6)),
    ...kelasIds.map((k) => muatEntri(supabase, "kelas_id", k)),
  ]);
  const entriKelas = new Map(kelasIds.map((k, i) => [k, perKelas[i]]));
  const nama = await namaUntukPerubahan(supabase, perubahan);

  if (!kelasIds.length) return <p className="rounded-2xl bg-white p-6 text-black/60 ring-1 ring-black/5">Belum ada kelas untuk ditampilkan.</p>;

  return (
    <div className="space-y-8">
      {anak.filter((a) => a.kelas_id).map((a) => {
        const entri = entriKelas.get(a.kelas_id!) ?? [];
        const ids = new Set(entri.map((e) => e.id));
        const milik = perubahan.filter((p) => ids.has(p.jadwal_id));
        const catatan = Object.fromEntries(milik.filter((p) => p.tanggal === hari).map((p) => [p.jadwal_id, teksPerubahan(p, nama)]));
        const akanDatang = milik.filter((p) => p.tanggal > hari).sort((x, y) => (x.tanggal < y.tanggal ? -1 : 1));
        return (
          <section key={a.id}>
            <h1 className="font-serif text-3xl">Jadwal kelas {a.kelas}</h1>
            {anak.length > 1 && <p className="text-sm text-black/50">{a.nama}</p>}
            {akanDatang.length > 0 && (
              <div className="my-4 rounded-2xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
                <p className="font-semibold">Perubahan jadwal minggu ini</p>
                <ul className="mt-1 space-y-0.5">
                  {akanDatang.map((p) => {
                    const e = entri.find((x) => x.id === p.jadwal_id);
                    return <li key={p.id}>{formatTanggal(p.tanggal, { weekday: "short" })} · JP {e?.jp_ke} {e?.mapel}: {teksPerubahan(p, nama)}</li>;
                  })}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <JadwalMingguan jam={jam} entri={entri} mode="kelas" hariIni={isoHari} catatan={catatan} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
