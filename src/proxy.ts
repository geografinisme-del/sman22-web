import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseAktif } from "@/lib/supabase/config";
import { urlMasuk } from "@/lib/masuk";
import { fetchTahan } from "@/lib/supabase/fetch-tahan";

/** Menjaga sesi login admin tetap segar dan menolak akses /admin tanpa login. */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  // halaman tanpa login: lupa sandi
  if (request.nextUrl.pathname === "/admin/lupa-sandi") return NextResponse.next();
  if (!supabaseAktif) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchTahan },
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

// Prefetch Link (menu yang belum diklik) TIDAK melewati proxy: Next 16 menghapus header prefetch dari request di dalam
// proxy, jadi pengecualiannya lewat matcher (cara resmi). Halaman tujuan tetap memeriksa sesi & peran di server
// (getAkses) saat benar-benar dibuka — tanpa ini setiap prefetch memanggil Auth Supabase satu kali.
export const config = {
  // ditulis literal (bukan .map) karena Next membaca config proxy secara statis saat build
  matcher: [
    { source: "/admin", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/admin/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/portal", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/portal/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/pratinjau/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/berkas/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/papan", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/papan/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/cetak/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/alumni/akun", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/alumni/akun/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
  ],
};
