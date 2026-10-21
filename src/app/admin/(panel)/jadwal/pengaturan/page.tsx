import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { NavJadwal } from "@/components/jadwal/NavJadwal";
import { wajibIzin } from "@/lib/admin/auth";
import { HARI, JENIS_JAM, jamPendek } from "@/lib/admin/jadwal";
import { muatJam } from "@/lib/admin/jadwal-data";
import { arsipReferensi, aturPiket, kosongkanJamHari } from "../../../actions-jadwal";
import { FormJam } from "./FormJam";
import { FormMapel, FormRuang } from "./FormRef";

export const metadata = { title: "Mapel, Jam & Piket" };

const KELOMPOK: Record<string, string> = { umum: "Umum", pilihan: "Pilihan", muatan_lokal: "Muatan lokal", lainnya: "Lainnya" };

export default async function PengaturanJadwal({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("jadwal.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const [{ data: mapel }, { data: ruang }, jam, { data: guru }, { data: piket }] = await Promise.all([
    supabase.from("mapel").select("id, nama, kode, kelompok").is("deleted_at", null).order("urutan").order("nama"),
    supabase.from("ruang").select("id, nama, jenis, kapasitas").is("deleted_at", null).order("nama"),
    muatJam(supabase),
    supabase.from("pegawai").select("id, nama").eq("jenis", "guru").eq("status", "aktif").is("deleted_at", null).order("nama"),
    ta ? supabase.from("piket_guru").select("id, hari, pegawai_id").eq("tahun_ajaran_id", ta.id) : Promise.resolve({ data: [] as { id: string; hari: number; pegawai_id: string }[] }),
  ]);
  const namaGuru = new Map((guru ?? []).map((g) => [g.id, g.nama]));
  const hariJam = [1, 2, 3, 4, 5, 6, 7].filter((h) => jam.some((j) => j.hari === h));

  return (
    <>
      <JudulHalaman judul="Mapel, Jam & Piket" deskripsi="Data dasar untuk menyusun jadwal. Cukup diatur sekali di awal tahun ajaran." />
      <NavJadwal akses={akses} aktif="/admin/jadwal/pengaturan" />
      <Notifikasi kode={sp.pesan} />

      <div className="space-y-8">
        <Kartu>
          <h2 className="text-3xl">Jam pelajaran</h2>
          {hariJam.length === 0 ? (
            <p className="mt-2 text-sm text-black/60">Belum diatur. Isi pola di bawah lalu simpan.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hariJam.map((h) => {
                const list = jam.filter((j) => j.hari === h);
                return (
                  <div key={h} className="rounded-xl bg-soft p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold">{HARI[h]} · {list.filter((j) => j.jp_ke).length} JP</p>
                      <form action={kosongkanJamHari}>
                        <input type="hidden" name="hari" value={h} />
                        <button className="text-xs text-blue-teks underline" aria-label={`Kosongkan jam ${HARI[h]}`}>kosongkan</button>
                      </form>
                    </div>
                    <ol className="space-y-0.5 text-xs">
                      {list.map((j) => (
                        <li key={j.urutan} className={j.jp_ke ? "" : "text-black/50"}>
                          <span className="inline-block w-24 tabular-nums">{jamPendek(j.jam_mulai)}–{jamPendek(j.jam_selesai)}</span>
                          {j.jp_ke ? `JP ${j.jp_ke}` : j.label || JENIS_JAM[j.jenis]}
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
          <details className="mt-6" open={hariJam.length === 0}>
            <summary className="cursor-pointer font-semibold text-blue-teks">Atur / ubah jam pelajaran</summary>
            <div className="mt-4"><FormJam /></div>
          </details>
        </Kartu>

        <Kartu>
          <h2 className="text-3xl">Mata pelajaran</h2>
          <div className="mt-4"><FormMapel /></div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {(mapel ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2 text-sm">
                <span>{m.nama} {m.kode && <span className="text-black/50">({m.kode})</span>} <span className="text-xs text-black/40">· {KELOMPOK[m.kelompok]}</span></span>
                <form action={arsipReferensi}>
                  <input type="hidden" name="tabel" value="mapel" /><input type="hidden" name="id" value={m.id} />
                  <button className="text-xs text-black/50 underline hover:text-blue-teks" aria-label={`Arsipkan ${m.nama}`}>arsipkan</button>
                </form>
              </li>
            ))}
          </ul>
          {!mapel?.length && <p className="mt-3 text-sm text-black/50">Belum ada mapel. Mapel juga dibuat otomatis saat menempel penugasan dari Excel.</p>}
        </Kartu>

        <Kartu>
          <h2 className="text-3xl">Ruang</h2>
          <p className="mt-1 text-sm text-black/60">Opsional. Isi bila ingin mencegah dua kelas memakai laboratorium/lapangan yang sama di jam yang sama.</p>
          <div className="mt-4"><FormRuang /></div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {(ruang ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-full bg-soft px-3 py-1.5 text-sm">
                {r.nama}{r.kapasitas ? <span className="text-xs text-black/40">· {r.kapasitas}</span> : null}
                <form action={arsipReferensi}>
                  <input type="hidden" name="tabel" value="ruang" /><input type="hidden" name="id" value={r.id} />
                  <button className="text-black/40 hover:text-blue-teks" aria-label={`Arsipkan ruang ${r.nama}`}>×</button>
                </form>
              </li>
            ))}
          </ul>
        </Kartu>

        <Kartu>
          <h2 id="piket" className="text-3xl">Jadwal piket guru</h2>
          <form action={aturPiket} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="aksi" value="tambah" />
            <select name="hari" aria-label="Hari piket" className="rounded-xl border border-black/15 bg-white px-3 py-2">
              {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{HARI[h]}</option>)}
            </select>
            <select name="pegawai_id" aria-label="Guru piket" className="w-64 rounded-xl border border-black/15 bg-white px-3 py-2">
              {(guru ?? []).map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
            <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Tambah</button>
          </form>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((h) => {
              const list = (piket ?? []).filter((p) => p.hari === h);
              return (
                <div key={h} className="rounded-xl bg-soft p-3 text-sm">
                  <p className="font-semibold">{HARI[h]}</p>
                  {list.length === 0 ? <p className="text-xs text-black/40">—</p> : (
                    <ul className="mt-1 space-y-1">
                      {list.map((p) => (
                        <li key={p.id} className="flex justify-between gap-2">
                          <span>{namaGuru.get(p.pegawai_id) ?? "—"}</span>
                          <form action={aturPiket}>
                            <input type="hidden" name="aksi" value="hapus" /><input type="hidden" name="id" value={p.id} />
                            <button className="text-black/40 hover:text-blue-teks" aria-label="Hapus dari piket">×</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-black/50">Agar bisa mencatat keterlambatan & mengatur guru pengganti, beri juga peran <strong>Guru Piket</strong> di menu Pengguna & Peran.</p>
        </Kartu>
      </div>
    </>
  );
}
