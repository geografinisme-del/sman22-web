import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseAktif } from "@/lib/supabase/config";
import { urlMasuk } from "@/lib/masuk";

/** Menjaga sesi login admin tetap segar dan menolak akses /admin tanpa login. */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  // halaman tanpa login: lupa sandi
  if (request.nextUrl.pathname === "/admin/lupa-sandi") return NextResponse.next();
  if (!supabaseAktif) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    const { pathname, search } = request.nextUrl;
    // /alumni/akun: sementara lewat halaman masuk Guru & Tendik (email); ?lanjut=/alumni/… memunculkan catatan alumni.
    // Jalur masuk alumni terpisah menyusul (lihat HANDOFF.md).
    if (pathname.startsWith("/alumni/akun")) return NextResponse.redirect(new URL(urlMasuk(pathname + search, "gtk"), request.url));
    // peta terpusat (lib/masuk.ts): /admin, /papan, /cetak, /pratinjau → GTK; /portal milik siswa/orang tua → halaman
    // perannya; /portal lain → pilih pintu. Tujuan dibawa sebagai ?lanjut= (divalidasi: hanya jalur internal).
    return NextResponse.redirect(new URL(urlMasuk(pathname + search), request.url));
  }
  // pengguna yang sudah masuk diarahkan oleh /admin (portal → /portal)
  if (user && isLogin) return NextResponse.redirect(new URL("/admin", request.url));
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/portal", "/portal/:path*", "/pratinjau/:path*", "/berkas/:path*", "/papan", "/papan/:path*", "/cetak/:path*", "/alumni/akun", "/alumni/akun/:path*"] };
