import Link from "next/link";
import { JudulHalaman, Kartu, KosongAdmin, Notifikasi } from "@/components/admin/ui";
import { FormPerangkat } from "@/components/kurikulum/Form";
import { NavKurikulum } from "@/components/kurikulum/Nav";
import { hariIniWIB } from "@/lib/admin/absensi";
import { punya, wajibLogin } from "@/lib/admin/auth";
import { JENIS_PERANGKAT, semesterSekarang, type JenisPerangkat } from "@/lib/kurikulum";
import { Status } from "@/components/kurikulum/Status";
import { ubahStatusPerangkat } from "../../actions-kurikulum";
import { TabPills } from "@/components/admin/TabPills";

export const metadata = { title: "Perangkat Ajar" };

type Rekap = { mapel_id: string; mapel: string; tingkat: string; prota: string; promes: string; atp: string; modul_ajar: number; modul_disetujui: number };
type Item = { id: string; jenis: JenisPerangkat; judul: string; tingkat: string; semester: number; status: string; catatan_review: string; berkas_path: string; berkas_nama: string; tautan: string; created_at: string; mapel: { nama: string } | null };

export default async function PerangkatAjar({ searchParams }: { searchParams: Promise<{ semester?: string; pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const semester = sp.semester === "1" || sp.semester === "2" ? Number(sp.semester) : semesterSekarang(hariIniWIB());
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya)
    return (<><JudulHalaman judul="Perangkat Ajar" /><NavKurikulum /><KosongAdmin teks="Akun Anda belum ditautkan ke data guru." /></>);
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  const [{ data: rekap }, { data: item }] = await Promise.all([
    supabase.rpc("rekap_perangkat", { p_semester: semester }),
    ta ? supabase.from("perangkat_ajar").select("id, jenis, judul, tingkat, semester, status, catatan_review, berkas_path, berkas_nama, tautan, created_at, mapel(nama)")
      .eq("pegawai_id", saya).eq("tahun_ajaran_id", ta.id).eq("semester", semester).is("deleted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const milik = ((rekap ?? []) as (Rekap & { pegawai_id: string })[]).filter((r) => r.pegawai_id === saya);
  const daftar = (item ?? []) as unknown as Item[];

  return (
    <>
      <JudulHalaman judul="Perangkat Ajar" deskripsi="Unggah prota, promes, ATP, dan modul ajar untuk diperiksa Wakasek Kurikulum."
        aksi={punya(akses, "kurikulum.kelola") ? <Link href="/admin/perangkat-ajar/review" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Periksa perangkat guru →</Link> : undefined} />
      <NavKurikulum />
      <Notifikasi kode={sp.pesan} />
      <TabPills label="Semester" item={[1, 2].map((s) => ({ href: `?semester=${s}`, label: `Semester ${s}` }))} aktif={`?semester=${semester}`} />

      <section className="mb-8">
        <h2 className="mb-3 text-2xl">Kelengkapan saya</h2>
        {milik.length === 0 ? <KosongAdmin teks="Belum ada penugasan mengajar di tahun ajaran aktif." /> : (
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="bg-soft text-xs uppercase tracking-wider text-black/50"><th className="px-4 py-2">Mapel</th><th className="px-4 py-2">Prota</th><th className="px-4 py-2">Promes</th><th className="px-4 py-2">ATP</th><th className="px-4 py-2">Modul ajar</th></tr></thead>
              <tbody>
                {milik.map((r) => (
                  <tr key={r.mapel_id + r.tingkat} className="border-t border-black/5">
                    <td className="px-4 py-2 font-medium">{r.mapel} · {r.tingkat}</td>
                    <td className="px-4 py-2"><Status s={r.prota} /></td><td className="px-4 py-2"><Status s={r.promes} /></td><td className="px-4 py-2"><Status s={r.atp} /></td>
                    <td className="px-4 py-2">{r.modul_disetujui}/{r.modul_ajar} disetujui</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Kartu>
          <h2 className="mb-3 text-2xl">Unggahan semester {semester}</h2>
          {daftar.length === 0 ? <p className="text-sm text-black/50">Belum ada.</p> : (
            <ul className="divide-y divide-black/5">
              {daftar.map((d) => (
                <li key={d.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Status s={d.status} /><span className="font-semibold">{d.judul}</span></div>
                  <p className="text-black/60">{JENIS_PERANGKAT[d.jenis]} · {d.mapel?.nama} {d.tingkat}</p>
                  {d.catatan_review && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">Catatan kurikulum: {d.catatan_review}</p>}
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    {d.berkas_path && <a href={`/berkas/perangkat/${d.id}`} target="_blank" rel="noopener" className="text-blue-teks underline">Buka berkas{d.berkas_nama && ` (${d.berkas_nama})`}</a>}
                    {d.tautan && <a href={d.tautan} target="_blank" rel="noopener noreferrer" className="text-blue-teks underline">Buka tautan</a>}
                    {(d.status === "draf" || d.status === "revisi") && (
                      <form action={ubahStatusPerangkat}><input type="hidden" name="id" value={d.id} /><button name="aksi" value="ajukan" className="text-emerald-700 underline">Ajukan</button></form>
                    )}
                    {d.status === "diajukan" && (
                      <form action={ubahStatusPerangkat}><input type="hidden" name="id" value={d.id} /><button name="aksi" value="tarik" className="underline">Tarik pengajuan</button></form>
                    )}
                    {d.status !== "disetujui" && d.status !== "diajukan" && (
                      <form action={ubahStatusPerangkat}><input type="hidden" name="id" value={d.id} /><button name="aksi" value="arsip" className="text-blue-teks underline">Arsip</button></form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
        <Kartu className="self-start">
          <h2 className="mb-4 text-2xl">Unggah perangkat</h2>
          {milik.length ? <FormPerangkat tugas={milik.map((r) => ({ mapel_id: r.mapel_id, mapel: r.mapel, tingkat: r.tingkat }))} semester={semester} /> : <p className="text-sm text-black/50">Butuh penugasan mengajar.</p>}
          <p className="mt-4 text-xs text-black/50">Butuh bantuan menyusun modul ajar? Buka <Link href="/admin/kurikulum/atp" className="underline">CP, TP & ATP</Link> → Kerangka modul ajar (AI).</p>
        </Kartu>
      </div>
    </>
  );
}
