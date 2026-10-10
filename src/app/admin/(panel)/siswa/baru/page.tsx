import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { FormSiswa } from "../FormSiswa";

export const metadata = { title: "Tambah siswa" };

export default async function SiswaBaru() {
  const { supabase } = await wajibIzin("data_induk.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama").eq("aktif", true).maybeSingle();
  const { data: kelas } = ta
    ? await supabase.from("kelas").select("id, nama").eq("tahun_ajaran_id", ta.id).is("deleted_at", null).order("nama")
    : { data: [] };
  return (
    <>
      <JudulHalaman judul="Tambah siswa" aksi={<TombolLink href="/admin/siswa" sekunder>← Kembali</TombolLink>} />
      <FormSiswa
        bisaUbah
        namaTa={ta?.nama ?? null}
        kelas={kelas ?? []}
        data={{ nama: "", nisn: "", nis: "", jenis_kelamin: "", agama: "", tempat_lahir: "", tanggal_lahir: "", kelas_id: "", tahun_masuk: String(new Date().getFullYear()), status: "aktif", keterangan_status: "", telepon: "", email: "", alamat: "" }}
      />
    </>
  );
}
