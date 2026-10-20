import Link from "next/link";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { hariIniWIB } from "@/lib/admin/absensi";
import { wajibIzin } from "@/lib/admin/auth";
import { JENIS_PERANGKAT, semesterSekarang, type JenisPerangkat } from "@/lib/kurikulum";
import { reviewPerangkat } from "../../../actions-kurikulum";
import { Status } from "@/components/kurikulum/Status";

export const metadata = { title: "Periksa Perangkat Ajar" };

type Rekap = { pegawai_id: string; guru: string; mapel: string; tingkat: string; prota: string; promes: string; atp: string; modul_ajar: number; modul_disetujui: number; total_diajukan: number };
type Item = { id: string; jenis: JenisPerangkat; judul: string; tingkat: string; semester: number; berkas_path: string; berkas_nama: string; tautan: string; diajukan_pada: string; pegawai_id: string; mapel: { nama: string } | null };

export default async function ReviewPerangkat({ searchParams }: { searchParams: Promise<{ semester?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await wajibIzin("kurikulum.kelola");
  const semester = sp.semester === "1" || sp.semester === "2" ? Number(sp.semester) : semesterSekarang(hariIniWIB());
  const [{ data: antri }, { data: rekap }] = await Promise.all([
    supabase.from("perangkat_ajar").select("id, jenis, judul, tingkat, semester, berkas_path, berkas_nama, tautan, diajukan_pada, pegawai_id, mapel(nama)").eq("status", "diajukan").is("deleted_at", null).order("diajukan_pada"),
    supabase.rpc("rekap_perangkat", { p_semester: semester }),
  ]);
  const list = (antri ?? []) as unknown as Item[];
  const r = (rekap ?? []) as Rekap[];
  const nama = new Map(r.map((x) => [x.pegawai_id, x.guru]));
  const lengkap = r.filter((x) => x.prota === "disetujui" && x.promes === "disetujui" && x.modul_disetujui > 0).length;

  return (
    <>
      <JudulHalaman judul="Periksa Perangkat Ajar" deskripsi="Setujui atau kembalikan dengan catatan revisi. Guru diberi tahu otomatis." aksi={<Link href="/admin/perangkat-ajar" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Perangkat saya</Link>} />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <Kartu className="mb-8">
        <h2 className="mb-3 text-2xl">Menunggu diperiksa ({list.length})</h2>
        {list.length === 0 ? <p className="text-sm text-black/50">Tidak ada yang menunggu.</p> : (
          <ul className="space-y-3">
            {list.map((d) => (
              <li key={d.id} className="rounded-xl bg-soft p-4 text-sm">
                <p className="font-semibold">{d.judul}</p>
                <p className="text-black/60">{nama.get(d.pegawai_id) ?? "Guru"} · {JENIS_PERANGKAT[d.jenis]} · {d.mapel?.nama} {d.tingkat} · smt {d.semester}</p>
                <div className="mt-1 flex gap-3 text-xs font-semibold">
                  {d.berkas_path && <a href={`/berkas/perangkat/${d.id}`} target="_blank" rel="noopener" className="text-blue-teks underline">Buka berkas{d.berkas_nama && ` (${d.berkas_nama})`}</a>}
                  {d.tautan && <a href={d.tautan} target="_blank" rel="noopener noreferrer" className="text-blue-teks underline">Buka tautan</a>}
                </div>
                <form action={reviewPerangkat} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input name="catatan" maxLength={1000} placeholder="Catatan (wajib bila revisi)" aria-label="Catatan" className="min-w-56 flex-1 rounded-xl border border-black/15 bg-white px-3 py-2" />
                  <button name="keputusan" value="setuju" className="rounded-full bg-emerald-700 px-4 py-2 font-semibold text-white">Setujui</button>
                  <button name="keputusan" value="revisi" className="rounded-full px-4 py-2 font-semibold text-amber-900 ring-1 ring-amber-300">Minta revisi</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-2xl">Rekap kelengkapan semester {semester}</h2>
        <span className="text-sm text-black/60">{lengkap}/{r.length} penugasan lengkap (prota, promes, ≥1 modul disetujui)</span>
        {[1, 2].map((s) => <Link key={s} href={`?semester=${s}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${s === semester ? "bg-ink text-white" : "ring-1 ring-black/10"}`}>Smt {s}</Link>)}
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Guru</th><th className="px-4 py-2">Mapel</th><th className="px-4 py-2">Prota</th><th className="px-4 py-2">Promes</th><th className="px-4 py-2">ATP</th><th className="px-4 py-2">Modul ajar</th></tr></thead>
          <tbody>
            {r.length === 0 ? <tr><td colSpan={6} className="px-4 py-3 text-black/50">Belum ada penugasan.</td></tr> : r.map((x) => (
              <tr key={x.pegawai_id + x.mapel + x.tingkat} className="border-t border-black/5">
                <td className="px-4 py-2 font-medium">{x.guru}</td><td className="px-4 py-2">{x.mapel} · {x.tingkat}</td>
                <td className="px-4 py-2"><Status s={x.prota} /></td><td className="px-4 py-2"><Status s={x.promes} /></td><td className="px-4 py-2"><Status s={x.atp} /></td>
                <td className="px-4 py-2 tabular-nums">{x.modul_disetujui}/{x.modul_ajar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
