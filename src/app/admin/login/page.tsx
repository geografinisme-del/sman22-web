import { permanentRedirect } from "next/navigation";
import { DARI_SEBAGAI, lanjutAman, urlMasuk } from "@/lib/masuk";

/**
 * /admin/login tetap ada sebagai PENGALIH (308) ke halaman masuk per peran — pengalihan utama ada di next.config.ts;
 * halaman ini cadangan bila konfigurasi pengalihan tidak berjalan. Semua parameter (termasuk ?lanjut=) dibawa.
 */
export default async function LoginLama({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const sebagai = typeof sp.sebagai === "string" ? sp.sebagai : "";
  const tujuan = new URL(urlMasuk(typeof sp.lanjut === "string" ? lanjutAman(sp.lanjut) : null, DARI_SEBAGAI[sebagai] ?? "gtk"), "http://x");
  for (const [k, v] of Object.entries(sp)) if (k !== "lanjut" && k !== "sebagai" && typeof v === "string") tujuan.searchParams.set(k, v);
  permanentRedirect(tujuan.pathname + tujuan.search);
}
