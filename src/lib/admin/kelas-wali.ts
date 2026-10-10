import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Kelas perwalian milik pengguna yang login pada tahun ajaran aktif. */
export async function kelasWaliSaya(supabase: SupabaseClient) {
  const { data: pid } = await supabase.rpc("pegawai_saya");
  if (!pid) return [] as { id: string; nama: string }[];
  const { data } = await supabase
    .from("kelas_ringkasan")
    .select("id, nama")
    .eq("wali_kelas_id", pid)
    .eq("tahun_aktif", true)
    .is("deleted_at", null);
  return (data ?? []) as { id: string; nama: string }[];
}
