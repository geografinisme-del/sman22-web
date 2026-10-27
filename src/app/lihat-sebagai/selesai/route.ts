import { NextResponse, type NextRequest } from "next/server";
import { aksesAsli } from "@/lib/admin/auth";
import { bacaPratinjau } from "@/lib/pratinjau";
import { COOKIE_LABEL_PRATINJAU, COOKIE_PRATINJAU, JALUR_KENDALI_PRATINJAU } from "@/lib/pratinjau-umum";
import { urlMasuk } from "@/lib/masuk";

/**
 * Akhiri "Lihat sebagai…" (tombol pita / keluar akun). Selalu menghapus cookie pratinjau; mencatat "selesai" bila
 * pratinjau masih sah. `?keluar=1` = sekaligus keluar akun (sesi perangkat ini saja, seperti tombol Keluar biasa).
 */
export async function POST(req: NextRequest) {
  const asal = req.headers.get("origin");
  if (asal && asal !== new URL(req.url).origin) return new NextResponse("Asal permintaan tidak sah", { status: 403 });
  const keluarAkun = req.nextUrl.searchParams.get("keluar") === "1";
  const p = await bacaPratinjau();
  const { supabase, user, superAdmin } = await aksesAsli();
  if (p && supabase && user && superAdmin && p.uid === user.id) {
    await supabase.rpc("catat_pratinjau", { p_aksi: "selesai", p_peran: p.peran, p_alasan: keluarAkun ? "keluar akun" : "keluar pratinjau" });
  }
  if (keluarAkun && supabase) await supabase.auth.signOut({ scope: "local" });
  const tujuan = keluarAkun ? urlMasuk(null, "gtk") : user ? JALUR_KENDALI_PRATINJAU : "/";
  const res = NextResponse.redirect(new URL(tujuan, req.url), 303);
  res.cookies.delete(COOKIE_PRATINJAU);
  res.cookies.delete(COOKIE_LABEL_PRATINJAU);
  return res;
}
