import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { berperan, getAkses } from "@/lib/admin/auth";

export type Anak = { id: string; nama: string; nisn: string | null; kelas: string | null; kelas_id: string | null; jenis_kelamin: string | null };

/** Pengguna portal + daftar anak (orang tua) atau dirinya (siswa). Dibatasi RLS. */
export const konteksPortal = cache(async () => {
  const { supabase, user, akses } = await getAkses();
  if (!supabase || !user) redirect("/admin/login?sebagai=orang_tua");
  const portal = berperan(akses, "siswa") || berperan(akses, "orang_tua");
  if (!akses || !portal) redirect("/admin");
  const { data } = await supabase
    .from("siswa_kelas_aktif")
    .select("id, nama, nisn, kelas, kelas_id, jenis_kelamin")
    .is("deleted_at", null)
    .order("nama");
  return { supabase, akses, anak: (data ?? []) as Anak[], ortu: berperan(akses, "orang_tua") };
});
