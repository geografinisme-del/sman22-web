import { Impor } from "@/components/admin/Impor";
import { JudulHalaman, TombolLink } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";

export const metadata = { title: "Impor siswa" };

export default async function ImporSiswa() {
  const { supabase } = await wajibIzin("data_induk.kelola");
  const { data: ta } = await supabase.from("tahun_ajaran").select("nama").eq("aktif", true).maybeSingle();
  return (
    <>
      <JudulHalaman
        judul="Impor data siswa"
        deskripsi={ta ? `Siswa akan ditempatkan di kelas tahun ajaran ${ta.nama}.` : "Belum ada tahun ajaran aktif — kolom kelas tidak bisa diimpor sampai tahun ajaran diaktifkan."}
        aksi={<TombolLink href="/admin/siswa" sekunder>← Data siswa</TombolLink>}
      />
      <Impor jenis="siswa" kembali="/admin/siswa" templateHref="/admin/siswa/template" />
    </>
  );
}
