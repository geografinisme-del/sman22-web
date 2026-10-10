import { redirect } from "next/navigation";
import { JudulHalaman, Kartu, KosongAdmin, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { berperan, wajibLogin } from "@/lib/admin/auth";

export const metadata = { title: "Kelas Saya" };

type Ortu = { hubungan: string; orang_tua: { nama: string; telepon: string } };

export default async function KelasSaya() {
  const { supabase, akses } = await wajibLogin();
  if (!berperan(akses, "wali_kelas")) redirect("/admin?pesan=tanpa-akses");
  const { data: pegawaiId } = await supabase.rpc("pegawai_saya");
  if (!pegawaiId) {
    return (
      <>
        <JudulHalaman judul="Kelas Saya" />
        <KosongAdmin teks="Akun Anda belum ditautkan ke data guru. Minta operator/super admin menautkannya di menu Pengguna." />
      </>
    );
  }
  const { data: daftar } = await supabase
    .from("kelas_ringkasan")
    .select("id, nama, tahun_ajaran, jumlah_siswa")
    .eq("wali_kelas_id", pegawaiId)
    .eq("tahun_aktif", true)
    .is("deleted_at", null);

  if (!daftar?.length) {
    return (
      <>
        <JudulHalaman judul="Kelas Saya" />
        <KosongAdmin teks="Anda belum ditetapkan sebagai wali kelas pada tahun ajaran aktif." />
      </>
    );
  }

  const isi = await Promise.all(
    daftar.map(async (k) => {
      const { data } = await supabase
        .from("anggota_kelas")
        .select("siswa:siswa_id(id, nisn, nama, jenis_kelamin, telepon, status, siswa_orang_tua(hubungan, orang_tua:orang_tua_id(nama, telepon)))")
        .eq("kelas_id", k.id)
        .range(0, 999);
      const siswa = (data ?? [])
        .map((a) => a.siswa as unknown as { id: string; nisn: string | null; nama: string; jenis_kelamin: string | null; telepon: string; status: string; siswa_orang_tua: Ortu[] })
        .filter((s) => s && s.status === "aktif")
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
      return { kelas: k, siswa };
    }),
  );

  const { data: sb } = await supabase.rpc("saran_bk_wali");
  const saranBk = (sb ?? []) as { siswa_id: string; siswa: string; kelas: string; saran: string }[];
  return (
    <>
      <JudulHalaman judul="Kelas Saya" deskripsi="Data ini hanya bisa dilihat oleh Anda sebagai wali kelas. Mohon dijaga kerahasiaannya." />
      {saranBk.length > 0 && (
        <Kartu className="mb-6">
          <h2 className="mb-1 font-serif text-2xl">Saran pendampingan dari BK</h2>
          <p className="mb-3 text-sm text-black/60">Dibagikan guru BK untuk membantu Anda mendampingi siswa. Isi konseling tetap rahasia — jangan menanyakannya kepada siswa di depan teman.</p>
          <ul className="divide-y divide-black/5 text-sm">{saranBk.map((x) => (
            <li key={x.siswa_id} className="py-2"><strong>{x.siswa}</strong> <span className="text-black/50">· {x.kelas}</span><p className="mt-0.5">{x.saran}</p></li>
          ))}</ul>
        </Kartu>
      )}
      {isi.map(({ kelas, siswa }) => (
        <Kartu key={kelas.id} className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">
              {kelas.nama} <span className="text-base text-black/50">· {kelas.tahun_ajaran} · {siswa.length} siswa</span>
            </h2>
            <div className="flex gap-2">
              <a href={`/admin/absensi/kelas/${kelas.id}`} className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white">Isi absensi hari ini</a>
              <a href={`/admin/absensi/rekap?kelas=${kelas.id}`} className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-black/10">Rekap</a>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className={kelasTabel}>
              <thead>
                <tr>
                  <th className={kelasTh}>No</th>
                  <th className={kelasTh}>Nama</th>
                  <th className={kelasTh}>NISN</th>
                  <th className={kelasTh}>L/P</th>
                  <th className={kelasTh}>Kontak orang tua</th>
                </tr>
              </thead>
              <tbody>
                {siswa.map((s, i) => (
                  <tr key={s.id}>
                    <td className={`${kelasTd} text-black/50`}>{i + 1}</td>
                    <td className={`${kelasTd} font-medium`}>{s.nama}</td>
                    <td className={`${kelasTd} tabular-nums`}>{s.nisn ?? "—"}</td>
                    <td className={kelasTd}>{s.jenis_kelamin ?? "—"}</td>
                    <td className={kelasTd}>
                      {s.siswa_orang_tua?.length
                        ? s.siswa_orang_tua.map((o) => (
                            <span key={o.orang_tua.nama} className="block">
                              {o.orang_tua.nama} ({o.hubungan}){o.orang_tua.telepon && ` · ${o.orang_tua.telepon}`}
                            </span>
                          ))
                        : <span className="text-black/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
      ))}
    </>
  );
}
