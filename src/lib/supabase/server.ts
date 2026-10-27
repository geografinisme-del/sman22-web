import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { fetchTahan } from "./fetch-tahan";
import { bacaPratinjau } from "@/lib/pratinjau";
import { HEADER_PRATINJAU } from "@/lib/pratinjau-umum";

/**
 * Klien dengan sesi login admin (dibaca dari cookie). Semua akses tetap dibatasi RLS.
 * Selama "Lihat sebagai…" sah, permintaan membawa header pratinjau: database menghitung izin dari peran yang dilihat
 * dan menjadikan transaksi hanya-baca (migrasi 20261228). `asli: true` = tanpa header (pemilih peran & pencatatan).
 */
export async function supabaseServer(opsi: { asli?: boolean } = {}) {
  const cookieStore = await cookies();
  const pratinjau = opsi.asli ? null : await bacaPratinjau();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchTahan, headers: pratinjau ? { [HEADER_PRATINJAU]: pratinjau.peran } : {} },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // dipanggil dari Server Component: cookie diperbarui oleh proxy.ts
        }
      },
    },
  });
}
