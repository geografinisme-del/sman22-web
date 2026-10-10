import Link from "next/link";
import { notFound } from "next/navigation";
import { JudulHalaman, TombolLink, kelasTabel, kelasTd, kelasTh } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { uuid } from "@/lib/admin/schema";

export const metadata = { title: "Detail kelas" };

export default async function DetailKelas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const { supabase } = await wajibIzin("data_induk.baca");
  const { data: k } = await supabase.from("kelas_ringkasan").select("*").eq("id", id).maybeSingle();
  if (!k) notFound();
  const { data: anggota } = await supabase
    .from("anggota_kelas")
    .select("siswa:siswa_id(id, nisn, nama, jenis_kelamin, status)")
    .eq("kelas_id", id)
    .range(0, 999);
  const siswa = (anggota ?? [])
    .map((a) => a.siswa as unknown as { id: string; nisn: string | null; nama: string; jenis_kelamin: string | null; status: string })
    .filter(Boolean)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  const L = siswa.filter((s) => s.jenis_kelamin === "L").length;
  const P = siswa.filter((s) => s.jenis_kelamin === "P").length;

  return (
    <>
      <JudulHalaman
        judul={`Kelas ${k.nama}`}
        deskripsi={`Tahun ajaran ${k.tahun_ajaran} · Wali kelas: ${k.wali_kelas ?? "belum ditentukan"} · ${siswa.length} siswa (L ${L}, P ${P})`}
        aksi={<TombolLink href={`/admin/kelas?ta=${k.tahun_ajaran_id}`} sekunder>← Semua kelas</TombolLink>}
      />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className={kelasTabel}>
          <thead>
            <tr>
              <th className={kelasTh}>No</th>
              <th className={kelasTh}>NISN</th>
              <th className={kelasTh}>Nama</th>
              <th className={kelasTh}>L/P</th>
              <th className={kelasTh}>Status</th>
            </tr>
          </thead>
          <tbody>
            {siswa.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-black/50">
                  Belum ada siswa di kelas ini.
                </td>
              </tr>
            )}
            {siswa.map((s, i) => (
              <tr key={s.id}>
                <td className={`${kelasTd} tabular-nums text-black/50`}>{i + 1}</td>
                <td className={`${kelasTd} tabular-nums`}>{s.nisn ?? "—"}</td>
                <td className={kelasTd}>
                  <Link href={`/admin/siswa/${s.id}`} className="font-medium hover:underline">
                    {s.nama}
                  </Link>
                </td>
                <td className={kelasTd}>{s.jenis_kelamin ?? "—"}</td>
                <td className={kelasTd}>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
