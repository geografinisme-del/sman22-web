import "server-only";
import { createClient } from "@supabase/supabase-js";
import { fetchTahan } from "./fetch-tahan";
import { SUPABASE_URL } from "./config";

/**
 * Klien dengan kunci RAHASIA (service role / secret key).
 * HANYA dipakai di server untuk membuat akun login & mengatur kata sandi,
 * setelah aplikasi memastikan pengguna berhak (izin pengguna.kelola).
 * Data sekolah tetap ditulis lewat klien biasa agar tunduk pada RLS.
 */
const KUNCI = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const kunciAdminTersedia = Boolean(SUPABASE_URL && KUNCI);

export function supabaseAdminAuth() {
  if (!kunciAdminTersedia) throw new Error("Kunci rahasia Supabase belum diatur di server");
  return createClient(SUPABASE_URL, KUNCI, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchTahan } }).auth.admin;
}

/** Storage dengan kunci rahasia — hanya untuk membuat tautan sementara berkas privat SETELAH hak akses diperiksa */
export function supabaseAdminStorage() {
  if (!kunciAdminTersedia) throw new Error("Kunci rahasia Supabase belum diatur di server");
  return createClient(SUPABASE_URL, KUNCI, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchTahan } }).storage;
}

/** Klien penuh dengan kunci rahasia — HANYA untuk pekerja pengirim notifikasi (tanpa masukan pengguna) */
export function supabaseLayanan() {
  if (!kunciAdminTersedia) throw new Error("Kunci rahasia Supabase belum diatur di server");
  return createClient(SUPABASE_URL, KUNCI, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchTahan } });
}
