import { NextResponse, type NextRequest } from "next/server";
import { aksesAsli, NAMA_PERAN } from "@/lib/admin/auth";
import { bacaPratinjau, bungkusPratinjau, fiturPratinjauAktif, opsiCookieLabel, opsiCookiePratinjau } from "@/lib/pratinjau";
import { COOKIE_LABEL_PRATINJAU, COOKIE_PRATINJAU, JALUR_KENDALI_PRATINJAU, TANPA_PERAN } from "@/lib/pratinjau-umum";

/**
 * Mulai / ganti "Lihat sebagai…". Route handler (bukan Server Action) agar tetap jalan selama pratinjau.
 * Syarat: fitur aktif, permintaan dari situs sendiri, super admin AAL2 (dibaca TANPA header pratinjau), peran dikenal.
 */
export async function POST(req: NextRequest) {
  const tolak = () => NextResponse.redirect(new URL(`${JALUR_KENDALI_PRATINJAU}?pesan=ditolak`, req.url), 303);
  const asal = req.headers.get("origin");
  if (asal && asal !== new URL(req.url).origin) return new NextResponse("Asal permintaan tidak sah", { status: 403 });
  if (!fiturPratinjauAktif()) return tolak();
  const { supabase, user, superAdmin } = await aksesAsli();
  if (!supabase || !user || !superAdmin) return tolak();

  const peran = String((await req.formData()).get("peran") ?? "");
  if (peran !== TANPA_PERAN) {
    const { data } = await supabase.from("peran").select("kode").eq("kode", peran).neq("kode", "super_admin").maybeSingle();
    if (!data) return tolak();
  }
  // berganti peran: tutup catatan pratinjau sebelumnya
  const lama = await bacaPratinjau();
  if (lama) await supabase.rpc("catat_pratinjau", { p_aksi: "selesai", p_peran: lama.peran, p_alasan: "ganti peran" });
  const { error } = await supabase.rpc("catat_pratinjau", { p_aksi: "mulai", p_peran: peran, p_alasan: null });
  if (error) {
    console.error("[pratinjau] gagal mencatat mulai:", error.message);
    return tolak();
  }

  const tujuan = peran === "siswa" || peran === "orang_tua" ? "/portal" : peran === "alumni" ? "/alumni/akun" : "/admin";
  const res = NextResponse.redirect(new URL(tujuan, req.url), 303);
  res.cookies.set(COOKIE_PRATINJAU, bungkusPratinjau({ peran, uid: user.id, mulai: Date.now() }), opsiCookiePratinjau());
  res.cookies.set(COOKIE_LABEL_PRATINJAU, encodeURIComponent(NAMA_PERAN[peran] ?? peran), opsiCookieLabel());
  return res;
}
