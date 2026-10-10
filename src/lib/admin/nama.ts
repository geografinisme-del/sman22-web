import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Nama guru/pegawai lewat fungsi aman nama_pegawai (tanpa membuka data pribadi) */
export async function petaNamaPegawai(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const unik = [...new Set(ids.filter(Boolean))] as string[];
  const isi = await Promise.all(unik.map(async (id) => [id, ((await supabase.rpc("nama_pegawai", { pid: id })).data as string | null) ?? "—"] as const));
  return new Map(isi);
}

/** Daftar guru aktif yang punya akun (untuk pilihan formulir) */
export async function daftarGuru(supabase: SupabaseClient) {
  const { data } = await supabase.from("pegawai").select("id, nama").is("deleted_at", null).order("nama").range(0, 999);
  return (data ?? []) as { id: string; nama: string }[];
}

/** Nama guru/staf (tanpa data pribadi) untuk pilihan PIC/penanggung jawab — tidak butuh izin data induk */
export async function daftarStaf(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("daftar_staf");
  return (data ?? []) as { id: string; nama: string }[];
}
