import Link from "next/link";
import { JudulHalaman, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { NavJadwal } from "@/components/jadwal/NavJadwal";
import { wajibIzin } from "@/lib/admin/auth";
import { arsipPenugasan } from "../../../actions-jadwal";
import { TambahPenugasan, TempelPenugasan, UbahPenugasan } from "./Form";
import { TabPills } from "@/components/admin/TabPills";

export const metadata = { title: "Penugasan Mengajar" };

type P = { id: string; kelas_id: string; kelas: string; mapel_id: string; mapel: string; pegawai_id: string | null; guru: string | null; jp_per_minggu: number; jp_terjadwal: number };

export default async function Penugasan({ searchParams }: { searchParams: Promise<{ kelas?: string; pesan?: string; lihat?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibIzin("jadwal.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  if (!ta) return <KosongAdmin teks="Belum ada tahun ajaran aktif." />;
  const [{ data: kelas }, { data: mapel }, { data: guru }, { data: semua }] = await Promise.all([
    supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("tingkat").order("nama"),
    supabase.from("mapel").select("id, nama").is("deleted_at", null).order("nama"),
    supabase.from("pegawai").select("id, nama").eq("jenis", "guru").eq("status", "aktif").is("deleted_at", null).order("nama"),
    supabase.from("penugasan_ringkasan").select("*").eq("tahun_ajaran_id", ta.id).order("mapel").limit(5000),
  ]);
  const list = (semua ?? []) as P[];
  const beban = sp.lihat === "beban";
  const pilih = (kelas ?? []).find((k) => k.id === sp.kelas) ?? kelas?.[0];
  const baris = list.filter((p) => p.kelas_id === pilih?.id);
  const target = baris.reduce((s, p) => s + p.jp_per_minggu, 0);

  const perGuru = new Map<string, { nama: string; target: number; terjadwal: number; kelas: Set<string> }>();
  for (const p of list) {
    const k = p.pegawai_id ?? "-";
    const g = perGuru.get(k) ?? { nama: p.guru ?? "Belum ditentukan", target: 0, terjadwal: 0, kelas: new Set<string>() };
    g.target += p.jp_per_minggu; g.terjadwal += p.jp_terjadwal; g.kelas.add(p.kelas);
    perGuru.set(k, g);
  }

  return (
    <>
      <JudulHalaman judul="Penugasan Mengajar" deskripsi={`Guru, mapel, dan JP per minggu tiap kelas (TA ${ta.nama}). Jadwal hanya bisa diisi dari penugasan ini.`} />
      <NavJadwal akses={akses} aktif="/admin/jadwal/penugasan" />
      <Notifikasi kode={sp.pesan} />
      <TabPills label="Tampilan penugasan" item={[{ href: "/admin/jadwal/penugasan", label: "Per kelas" }, { href: "/admin/jadwal/penugasan?lihat=beban", label: "Beban mengajar guru" }]} aktif={beban ? "/admin/jadwal/penugasan?lihat=beban" : "/admin/jadwal/penugasan"} />

      {beban ? (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-black/10 bg-soft text-xs uppercase tracking-wider text-black/50">
              <th className="px-4 py-3">Guru</th><th className="px-4 py-3">Kelas</th><th className="px-4 py-3 text-right">JP target</th><th className="px-4 py-3 text-right">JP terjadwal</th>
            </tr></thead>
            <tbody>
              {[...perGuru.entries()].sort((a, b) => b[1].target - a[1].target).map(([id, g]) => (
                <tr key={id} className="border-b border-black/5">
                  <td className="px-4 py-2.5 font-medium">{g.nama}</td>
                  <td className="px-4 py-2.5 text-black/60">{[...g.kelas].sort().join(", ")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.target}{g.target < 24 && id !== "-" && <span className="ml-1 text-xs text-amber-700" title="Kurang dari 24 JP">⚠</span>}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${g.terjadwal !== g.target ? "text-amber-700" : "text-emerald-700"}`}>{g.terjadwal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!perGuru.size && <p className="p-6 text-sm text-black/50">Belum ada penugasan.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {!kelas?.length ? <KosongAdmin teks="Belum ada kelas di tahun ajaran aktif." /> : (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <form className="mb-4 flex flex-wrap items-end gap-2">
                <select name="kelas" defaultValue={pilih?.id} aria-label="Kelas" className="w-48 rounded-xl border border-black/15 bg-white px-3 py-2">
                  {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Tampilkan</button>
                <span className="ml-auto text-sm text-black/60">{baris.length} mapel · {target} JP/minggu</span>
              </form>
              {pilih && <TambahPenugasan kelasId={pilih.id} mapel={(mapel ?? []).filter((m) => !baris.some((b) => b.mapel_id === m.id))} guru={guru ?? []} />}
              <ul className="mt-5 divide-y divide-black/5">
                {baris.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-48 font-semibold">{p.mapel}</span>
                    <UbahPenugasan id={p.id} kelasId={p.kelas_id} pegawaiId={p.pegawai_id} jp={p.jp_per_minggu} guru={guru ?? []} mapel={p.mapel} />
                    <span className={`text-xs ${p.jp_terjadwal === p.jp_per_minggu ? "text-emerald-700" : "text-amber-700"}`}>terjadwal {p.jp_terjadwal}/{p.jp_per_minggu}</span>
                    <form action={arsipPenugasan} className="ml-auto">
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="kelas_id" value={p.kelas_id} />
                      <button className="text-xs text-black/50 underline hover:text-blue-teks">arsipkan</button>
                    </form>
                  </li>
                ))}
              </ul>
              {!baris.length && <p className="mt-4 text-sm text-black/50">Belum ada mapel untuk kelas ini.</p>}
              {pilih && baris.length > 0 && (
                <Link href={`/admin/jadwal/susun?kelas=${pilih.id}`} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Susun jadwal {pilih.nama} →</Link>
              )}
            </section>
          )}
          <details className="rounded-2xl bg-white p-5 ring-1 ring-black/5" open={list.length === 0}>
            <summary className="cursor-pointer font-semibold text-blue-teks">Isi banyak sekaligus (tempel dari Excel)</summary>
            <div className="mt-4"><TempelPenugasan /></div>
          </details>
        </div>
      )}
    </>
  );
}
