import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { punya, type Akses } from "./auth";

/** Boleh langsung menerbitkan? (penyetuju, atau sekolah mematikan kewajiban persetujuan) */
export async function bolehTerbit(supabase: SupabaseClient, akses: Akses | null) {
  if (punya(akses, "konten.terbitkan")) return true;
  const { data } = await supabase.from("pengaturan_situs").select("persetujuan_wajib").eq("id", 1).maybeSingle();
  return data ? !data.persetujuan_wajib : true;
}
