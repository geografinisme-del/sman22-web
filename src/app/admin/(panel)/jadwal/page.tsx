import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { TombolCetak } from "@/components/jadwal/Bantu";
import { JadwalMingguan, JadwalSatuHari } from "@/components/jadwal/JadwalMingguan";
import { NavJadwal } from "@/components/jadwal/NavJadwal";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { HARI, namaHari } from "@/lib/admin/jadwal";
import { muatEntri, muatJam, muatPerubahan, namaUntukPerubahan, teksPerubahan } from "@/lib/admin/jadwal-data";
import { formatTanggal } from "@/lib/format";
import { TombolUnduh } from "@/components/admin/TombolUnduh";

export const metadata = { title: "Jadwal Pelajaran" };

type Lihat = "kelas" | "guru" | "ruang" | "hari";
const TAB: { k: Lihat; l: string }[] = [
  { k: "kelas", l: "Per kelas" },
  { k: "guru", l: "Per guru" },
  { k: "ruang", l: "Per ruang" },
  { k: "hari", l: "Per hari" },
];

export default async function LihatJadwal({ searchParams }: { searchParams: Promise<{ lihat?: string; id?: string; hari?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const lihat: Lihat = (["kelas", "guru", "ruang", "hari"] as const).find((x) => x === sp.lihat) ?? "kelas";
  const hariIni = hariIniWIB();
  const isoHariIni = ((new Date(hariIni + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;

  const [jam, semua, perubahan, { data: ta }, { data: ruangList }] = await Promise.all([
    muatJam(supabase),
    muatEntri(supabase),
    muatPerubahan(supabase, hariIni),
    supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle(),
    supabase.from("ruang").select("id, nama").is("deleted_at", null).order("nama"),
  ]);
  const { data: kelasList } = ta
    ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama")
    : { data: [] as { id: string; nama: string }[] };
  const nama = await namaUntukPerubahan(supabase, perubahan);
  const catatan = Object.fromEntries(perubahan.map((p) => [p.jadwal_id, teksPerubahan(p, nama)]));

  const guruList = [...new Map(semua.filter((e) => e.pegawai_id).map((e) => [e.pegawai_id!, e.guru ?? "—"])).entries()]
    .map(([id, n]) => ({ id, nama: n }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  const opsi =
    lihat === "kelas" ? (kelasList ?? []) : lihat === "guru" ? guruList : lihat === "ruang" ? (ruangList ?? []) : [];
  const pilih = opsi.find((o) => o.id === sp.id) ?? opsi[0];
  const hariPilih = Number(sp.hari) >= 1 && Number(sp.hari) <= 7 ? Number(sp.hari) : isoHariIni <= 6 ? isoHariIni : 1;

  const kolom = { kelas: "kelas_id", guru: "pegawai_id", ruang: "ruang_id" } as const;
  const entri = lihat === "hari" ? semua.filter((e) => e.hari === hariPilih) : pilih ? semua.filter((e) => e[kolom[lihat]] === pilih.id) : [];
  const hariAda = [...new Set(jam.map((j) => j.hari))].sort();
  const judulCetak = lihat === "hari" ? `Jadwal hari ${namaHari(hariPilih)}` : pilih ? `Jadwal ${lihat === "kelas" ? "kelas " : ""}${pilih.nama}` : "Jadwal";

  return (
    <>
      <JudulHalaman
        judul="Jadwal Pelajaran"
        deskripsi={`${ta ? `Tahun ajaran ${ta.nama}. ` : ""}Sel kuning = ada perubahan hari ini (${formatTanggal(hariIni, { weekday: "long" })}).`}
        aksi={
          <div className="flex flex-wrap gap-2 print:hidden">
            <TombolCetak />
            <TombolUnduh href={`/admin/jadwal/ekspor?lihat=${lihat === "hari" ? "kelas" : lihat}`} namaCadangan="jadwal.xlsx">Unduh Excel</TombolUnduh>
            {lihat === "kelas" && pilih && punya(akses, "jadwal.kelola") && <TombolLink href={`/admin/jadwal/susun?kelas=${pilih.id}`}>Ubah jadwal kelas ini</TombolLink>}
          </div>
        }
      />
      <NavJadwal akses={akses} aktif="/admin/jadwal" />

      <div className="mb-5 flex flex-wrap items-end gap-3 print:hidden">
        <div className="flex rounded-full bg-white p-1 ring-1 ring-black/10" role="tablist">
          {TAB.map((t) => (
            <a key={t.k} href={`/admin/jadwal?lihat=${t.k}`} role="tab" aria-selected={lihat === t.k}
               className={`rounded-full px-4 py-1.5 text-sm ${lihat === t.k ? "bg-ink text-white" : "hover:bg-black/5"}`}>
              {t.l}
            </a>
          ))}
        </div>
        <form className="flex items-end gap-2">
          <input type="hidden" name="lihat" value={lihat} />
          {lihat === "hari" ? (
            <select name="hari" defaultValue={hariPilih} aria-label="Hari" className="rounded-xl border border-black/15 bg-white px-3 py-2">
              {hariAda.map((h) => <option key={h} value={h}>{HARI[h]}</option>)}
            </select>
          ) : (
            <select name="id" defaultValue={pilih?.id} aria-label="Pilih" className="w-56 rounded-xl border border-black/15 bg-white px-3 py-2">
              {opsi.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
            </select>
          )}
          <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
        </form>
      </div>

      <h2 className="mb-3 text-3xl">{judulCetak}</h2>
      {lihat === "hari" ? (
        <JadwalSatuHari jam={jam.filter((j) => j.hari === hariPilih)} entri={entri} kelas={kelasList ?? []} catatan={hariPilih === isoHariIni ? catatan : {}} />
      ) : !pilih ? (
        <p className="rounded-2xl bg-white p-6 text-black/60 ring-1 ring-black/5">
          {lihat === "guru" ? "Belum ada guru yang terjadwal." : lihat === "ruang" ? "Belum ada data ruang." : "Belum ada kelas di tahun ajaran aktif."}
        </p>
      ) : (
        <JadwalMingguan jam={jam} entri={entri} mode={lihat} hariIni={isoHariIni} catatan={catatan} />
      )}
    </>
  );
}
