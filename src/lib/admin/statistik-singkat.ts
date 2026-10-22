import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { fetchTahan } from "@/lib/supabase/fetch-tahan";
import type { Akses } from "./auth";

/** Lama angka statistik Ringkasan boleh disimpan (detik). Tindakan yang menunggu TIDAK di-cache. */
export const DETIK_STATISTIK = 60;

/**
 * Cache singkat angka statistik (jumlah siswa, kelengkapan konten, dsb.) PER AKUN: kunci = id pengguna + peran & izin,
 * jadi hasil satu akun tidak pernah terlihat akun lain. Query tetap berjalan dengan sesi pengguna (RLS berlaku).
 * Di dalam cache cookie tidak boleh dibaca, sehingga dipakai klien berisi token sesi yang diambil di luar cache.
 * Hasil `hitung` harus bisa diserialisasi JSON (angka/teks/boolean).
 */
export async function statistikSingkat<T>(supabase: SupabaseClient, akses: Akses, nama: string, hitung: (db: SupabaseClient) => Promise<T>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return hitung(supabase);
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchTahan, headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const kunciIzin = createHash("sha256")
    .update([...akses.peran].sort().join(",") + "|" + [...akses.izin].sort().join(","))
    .digest("hex")
    .slice(0, 16);
  return unstable_cache(() => hitung(db), ["ringkasan-statistik", nama, akses.userId, kunciIzin], { revalidate: DETIK_STATISTIK })();
}
