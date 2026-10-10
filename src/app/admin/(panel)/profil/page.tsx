import { JudulHalaman } from "@/components/admin/ui";
import { wajibIzin } from "@/lib/admin/auth";
import { FormProfil, type DataProfil } from "./FormProfil";

export const metadata = { title: "Profil Sekolah" };

export default async function AdminProfil() {
  const { supabase } = await wajibIzin("konten.kelola");
  const { data } = await supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle();
  const bersih: DataProfil = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)]));

  return (
    <>
      <JudulHalaman judul="Profil Sekolah" deskripsi="Data ini tampil di beranda, halaman Profil, Kontak, dan bagian bawah website." />
      <FormProfil data={bersih} />
    </>
  );
}
