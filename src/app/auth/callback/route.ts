import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Tujuan tautan dari email Supabase (atur ulang sandi).
 * Mendukung dua bentuk:
 *  - ?token_hash=…&type=recovery  (templat email yang disarankan; bisa dibuka di HP/peramban mana pun)
 *  - ?code=…                       (alur PKCE bawaan; harus dibuka di peramban yang sama saat meminta)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const lanjutMentah = url.searchParams.get("lanjut") ?? url.searchParams.get("next") ?? "/admin/sandi-baru";
  const lanjut = /^\/admin(\/[\w-]*)*$/.test(lanjutMentah) ? lanjutMentah : "/admin";
  const gagal = NextResponse.redirect(new URL("/admin/lupa-sandi?kedaluwarsa=1", url));
  if (!supabaseAktif) return gagal;

  const supabase = await supabaseServer();
  const tokenHash = url.searchParams.get("token_hash");
  const jenis = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  if (tokenHash && jenis) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: jenis });
    if (error) {
      console.error("[callback] verifyOtp:", error.message);
      return gagal;
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[callback] exchange:", error.message);
      return gagal;
    }
  } else return gagal;
  return NextResponse.redirect(new URL(jenis === "recovery" || !tokenHash ? lanjut : "/admin", url));
}
