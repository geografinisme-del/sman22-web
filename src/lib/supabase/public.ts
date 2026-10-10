import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Klien baca-saja untuk halaman publik (tanpa cookie, sehingga halaman bisa di-cache).
 * Hasil di-cache 60 detik dan langsung diperbarui saat admin menyimpan perubahan.
 */
export function supabasePublik() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } }),
    },
  });
}

/**
 * Klien anonim TANPA cache — wajib untuk aksi tulis (pengaduan, survei, penilaian)
 * dan data yang harus selalu terbaru (cek status), agar tidak terkena cache data Next.
 */
export function supabaseAnonSegar() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
