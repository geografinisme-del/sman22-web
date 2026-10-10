import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Penugasan = { id: string; kelas_id: string; mapel_id: string; kelas: string; tingkat: string; mapel: string };

/** Penugasan mengajar guru yang login (tahun ajaran aktif) */
export async function penugasanSaya(supabase: SupabaseClient): Promise<{ saya: string | null; list: Penugasan[] }> {
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya) return { saya: null, list: [] };
  const { data } = await supabase
    .from("penugasan_mengajar")
    .select("id, kelas_id, mapel_id, kelas(nama, tingkat, tahun_ajaran(aktif)), mapel(nama)")
    .eq("pegawai_id", saya)
    .is("deleted_at", null);
  type R = { id: string; kelas_id: string; mapel_id: string; kelas: { nama: string; tingkat: string; tahun_ajaran: { aktif: boolean } | null } | null; mapel: { nama: string } | null };
  const list = ((data ?? []) as unknown as R[])
    .filter((r) => r.kelas?.tahun_ajaran?.aktif)
    .map((r) => ({ id: r.id, kelas_id: r.kelas_id, mapel_id: r.mapel_id, kelas: r.kelas?.nama ?? "", tingkat: r.kelas?.tingkat ?? "", mapel: r.mapel?.nama ?? "" }))
    .sort((a, b) => a.mapel.localeCompare(b.mapel) || a.kelas.localeCompare(b.kelas));
  return { saya: saya as string, list };
}
