import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, Notifikasi } from "@/components/admin/ui";
import { FormAngkatan, FormImporLulusan } from "@/components/alumni/Form";
import { NavAlumni } from "@/components/alumni/Nav";
import { punya, wajibLogin } from "@/lib/admin/auth";

export const metadata = { title: "Alumni" };
type S = { tahun_lulus: number; total: number; berakun: number; mengisi: number; kuliah: number | null; bekerja: number | null; wirausaha: number | null; kuliah_bekerja: number | null; mencari_kerja: number | null; lainnya: number | null };
const sel = (v: number | null) => (v == null ? "< 3" : v);

export default async function Alumni({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const sp = await searchParams;
  const { supabase, akses } = await wajibLogin();
  const kelola = punya(akses, "alumni.kelola");
  if (!kelola && !punya(akses, "alumni.lihat")) redirect("/admin?pesan=tanpa-akses");
  const [{ data }, { data: ak }, { count: menunggu }] = await Promise.all([
    supabase.rpc("statistik_alumni"),
    supabase.from("angkatan_alumni").select("tahun, nama, koordinator").order("tahun", { ascending: false }),
    kelola ? supabase.from("pendaftaran_alumni").select("id", { count: "exact", head: true }).eq("status", "menunggu") : Promise.resolve({ count: 0 }),
  ]);
  const list = (data ?? []) as S[];
  const tot = list.reduce((a, s) => ({ total: a.total + s.total, berakun: a.berakun + s.berakun, mengisi: a.mengisi + s.mengisi }), { total: 0, berakun: 0, mengisi: 0 });
  return (
    <>
      <JudulHalaman judul="Alumni & Tracer Study" deskripsi="Statistik agregat per angkatan — tanpa data pribadi. Kelompok kurang dari 3 orang disamarkan."
        aksi={<a href="/admin/alumni/ekspor" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/15">Unduh statistik (Excel)</a>} />
      <NavAlumni kelola={kelola} />
      <Notifikasi kode={sp.pesan} />
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Profil alumni", tot.total], ["Punya akun", tot.berakun], ["Mengisi tracer", tot.mengisi], ["Menunggu verifikasi", menunggu ?? 0]].map(([l, v]) => (
          <li key={l} className="rounded-2xl bg-white p-4 ring-1 ring-black/5"><p className="text-3xl tabular-nums">{Number(v).toLocaleString("id-ID")}</p><p className="text-sm text-black/60">{l}</p></li>))}
      </ul>
      <Kartu>
        <h2 className="mb-3 text-2xl">Per angkatan</h2>
        {list.length === 0 ? <p className="text-sm text-black/50">Belum ada data. Buat profil dari data lulusan di bawah, atau tunggu alumni mendaftar.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-black/50"><th className="py-2">Angkatan</th><th>Profil</th><th>Akun</th><th>Mengisi</th><th>Kuliah</th><th>Bekerja</th><th>Wirausaha</th><th>Kuliah+kerja</th><th>Mencari kerja</th><th>Lainnya</th></tr></thead>
            <tbody>{list.map((s) => (
              <tr key={s.tahun_lulus} className="border-t border-black/5 tabular-nums"><td className="py-2 font-semibold">{s.tahun_lulus}</td><td>{s.total}</td><td>{s.berakun}</td><td>{s.mengisi}</td>
                <td>{sel(s.kuliah)}</td><td>{sel(s.bekerja)}</td><td>{sel(s.wirausaha)}</td><td>{sel(s.kuliah_bekerja)}</td><td>{sel(s.mencari_kerja)}</td><td>{sel(s.lainnya)}</td></tr>))}</tbody>
          </table></div>
        )}
      </Kartu>
      {kelola && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Kartu><h2 className="mb-2 text-2xl">Data lulusan → profil alumni</h2>
            <p className="mb-3 text-sm text-black/60">Membuat profil (tanpa akun) untuk siswa berstatus <strong>lulus</strong> yang belum punya profil. Dipakai untuk pencocokan pendaftaran & dasar tracer study.</p>
            <FormImporLulusan tahun={new Date().getFullYear()} /></Kartu>
          <Kartu><h2 className="mb-3 text-2xl">Angkatan</h2>
            <ul className="mb-3 text-sm">{(ak ?? []).map((a) => <li key={a.tahun}><strong>{a.tahun}</strong> {a.nama}{a.koordinator && ` · koordinator ${a.koordinator}`}</li>)}</ul>
            <FormAngkatan /></Kartu>
        </div>
      )}
    </>
  );
}
