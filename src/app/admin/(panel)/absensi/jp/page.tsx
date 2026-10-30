import { redirect } from "next/navigation";
import { JudulHalaman, KosongAdmin } from "@/components/admin/ui";
import { hariIniWIB, tanggalValid } from "@/lib/admin/absensi";
import { berperan, punya, wajibLogin } from "@/lib/admin/auth";
import { BOLEH } from "@/lib/admin/akses-modul";
import { jamPendek } from "@/lib/admin/jadwal";
import { kelasWaliSaya } from "@/lib/admin/kelas-wali";
import { formatTanggal } from "@/lib/format";

export const metadata = { title: "Kehadiran per Jam Pelajaran" };

const WARNA: Record<string, string> = { S: "bg-sky-600", I: "bg-indigo-600", A: "bg-red-600", T: "bg-amber-500", D: "bg-slate-600" };

export default async function RekapJp({ searchParams }: { searchParams: Promise<{ kelas?: string; tanggal?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const semua = punya(akses, "absensi.lihat") && Boolean(akses && BOLEH.mengajar(akses));
  if (!semua && !berperan(akses, "wali_kelas")) {
    // guru tanpa hak memantau: presensi & jurnal per jam diisi dari jadwal mengajarnya sendiri
    redirect(akses && BOLEH.mengajar(akses) ? "/admin/jadwal-saya" : "/admin?pesan=tanpa-akses");
  }
  const tanggal = tanggalValid(sp.tanggal) ? sp.tanggal : hariIniWIB();
  const hari = ((new Date(tanggal + "T00:00:00Z").getUTCDay() + 6) % 7) + 1;
  let kelas: { id: string; nama: string }[];
  if (semua) {
    const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
    const { data } = ta ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama") : { data: [] };
    kelas = data ?? [];
  } else kelas = await kelasWaliSaya(supabase);
  const pilih = kelas.find((k) => k.id === sp.kelas) ?? kelas[0];
  if (!pilih) return <KosongAdmin teks="Belum ada kelas." />;

  const { data: jadwal } = await supabase.from("jadwal_lengkap").select("id, jp_ke, mapel, kode_mapel, guru, jam_mulai").eq("kelas_id", pilih.id).eq("hari", hari).eq("tahun_aktif", true).order("jp_ke");
  const ids = (jadwal ?? []).map((j) => j.id);
  const [{ data: siswa }, { data: harian }, { data: ajp }, { data: jurnal }] = await Promise.all([
    supabase.from("siswa_kelas_aktif").select("id, nama").eq("kelas_id", pilih.id).is("deleted_at", null).eq("status", "aktif").order("nama"),
    supabase.from("absensi_siswa").select("siswa_id, status").eq("tanggal", tanggal),
    ids.length ? supabase.from("absensi_jp").select("jadwal_id, siswa_id, status, keterangan").eq("tanggal", tanggal).in("jadwal_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("jurnal_jp").select("jadwal_id, materi, jumlah_hadir, jumlah_siswa").eq("tanggal", tanggal).in("jadwal_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const petaHarian = new Map((harian ?? []).map((h) => [h.siswa_id, h.status]));
  const petaJp = new Map((ajp ?? []).map((a) => [`${a.jadwal_id}|${a.siswa_id}`, a]));
  const petaJurnal = new Map((jurnal ?? []).map((j) => [j.jadwal_id, j]));
  // indikasi bolos: alpa di jam pelajaran padahal tidak tercatat sakit/izin/alpa harian
  const bolos = (siswa ?? []).filter((s) => !["S", "I", "A"].includes(petaHarian.get(s.id) ?? "") && ids.some((id) => petaJp.get(`${id}|${s.id}`)?.status === "A"));

  return (
    <>
      <JudulHalaman judul="Kehadiran per Jam Pelajaran" deskripsi="Diisi guru mapel di setiap jam. Sel kosong = hadir. Tanda ⚠ = alpa di jam pelajaran padahal datang ke sekolah." />
      <form className="mb-5 flex flex-wrap items-end gap-2">
        <select name="kelas" defaultValue={pilih.id} aria-label="Kelas" className="w-40 rounded-xl border border-black/15 bg-white px-3 py-2">
          {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <input type="date" name="tanggal" defaultValue={tanggal} max={hariIniWIB()} aria-label="Tanggal" className="rounded-xl border border-black/15 bg-white px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
        <span className="self-center text-sm text-black/60">{formatTanggal(tanggal, { weekday: "long" })}</span>
      </form>

      {bolos.length > 0 && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          ⚠ Indikasi meninggalkan pelajaran: {bolos.map((s) => s.nama).join(", ")}
        </p>
      )}
      {!jadwal?.length ? (
        <KosongAdmin teks="Tidak ada jadwal pelajaran untuk kelas ini pada hari tersebut." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 border-b border-black/10 bg-soft px-3 py-2 text-sm">Siswa</th>
                  <th className="border-b border-black/10 bg-soft px-2 py-2 text-center">Harian</th>
                  {jadwal.map((j) => (
                    <th key={j.id} className="border-b border-black/10 bg-soft px-2 py-2 text-center" title={`${j.mapel} · ${j.guru ?? ""}`}>
                      JP {j.jp_ke}<span className="block font-normal text-black/50">{j.kode_mapel || j.mapel.slice(0, 8)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(siswa ?? []).map((s) => (
                  <tr key={s.id} className={bolos.some((b) => b.id === s.id) ? "bg-amber-50" : ""}>
                    <td className="sticky left-0 border-b border-black/5 bg-inherit px-3 py-1.5 text-sm">{s.nama}</td>
                    <td className="border-b border-black/5 px-2 text-center font-semibold">{petaHarian.get(s.id) ?? ""}</td>
                    {jadwal.map((j) => {
                      const a = petaJp.get(`${j.id}|${s.id}`);
                      const diisi = petaJurnal.has(j.id);
                      return (
                        <td key={j.id} className="border-b border-black/5 px-2 py-1 text-center" title={a?.keterangan || undefined}>
                          {a ? <span className={`inline-block rounded px-1.5 font-bold text-white ${WARNA[a.status]}`}>{a.status}</span> : diisi ? <span className="text-black/20">·</span> : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="mt-8 text-2xl">Jurnal mengajar</h2>
          <ul className="mt-3 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
            {jadwal.map((j) => {
              const r = petaJurnal.get(j.id);
              return (
                <li key={j.id} className="flex flex-wrap gap-3 px-4 py-3 text-sm">
                  <span className="w-28 shrink-0 text-black/50">JP {j.jp_ke}{j.jam_mulai && ` · ${jamPendek(j.jam_mulai)}`}</span>
                  <span className="min-w-0 flex-1"><strong>{j.mapel}</strong> <span className="text-black/50">{j.guru}</span>
                    <span className="block text-black/70">{r ? r.materi || "(materi tidak diisi)" : <span className="text-amber-700">Belum diisi guru</span>}</span>
                  </span>
                  {r && <span className="text-black/60">{r.jumlah_hadir}/{r.jumlah_siswa} hadir</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
