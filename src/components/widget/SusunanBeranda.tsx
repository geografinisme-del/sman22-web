import "server-only";
import { SusunanLangit } from "@/components/langit/SusunanLangit";
import type { Konfigurasi } from "@/lib/tampilan/konfigurasi";

/**
 * Beranda yang disusun dari konfigurasi tampilan (terbit untuk publik, draf untuk pratinjau).
 * Tema lama diarsipkan; semua konfigurasi dirender dengan desain "Langit cerah".
 */
export async function SusunanBeranda({ konfig }: { konfig: Konfigurasi }) {
  return <SusunanLangit konfig={konfig} />;
}
