import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseAktif } from "@/lib/supabase/config";
import { urlMasuk } from "@/lib/masuk";
import { fetchTahan } from "@/lib/supabase/fetch-tahan";
import { COOKIE_LABEL_PRATINJAU, COOKIE_PRATINJAU, JALUR_KENDALI_PRATINJAU, PESAN_PRATINJAU } from "@/lib/pratinjau-umum";

/** jalur yang wajib login (selain itu proxy hanya dilewati untuk menjaga pratinjau, lihat matcher "next-action") */
const DILINDUNGI = ["/admin", "/portal", "/pratinjau", "/berkas", "/papan", "/cetak", "/alumni/akun", JALUR_KENDALI_PRATINJAU];
const dilindungi = (p: string) => DILINDUNGI.some((d) => p === d || p.startsWith(d + "/"));
/** unduhan data pribadi yang ditolak selama pratinjau (templat kosong tetap boleh) */
const UNDUH_PRIBADI = /^\/admin\/.*\/(ekspor|nilai)(\/|$)|^\/berkas\//;

/**
 * "Lihat sebagai…": selama cookie pratinjau ada (sah atau tidak), SEMUA penulisan ditolak di server — Server Action
 * (header next-action, di halaman mana pun), metode selain GET/HEAD, dan unduhan data pribadi. Pengecualian hanya
 * pengendali pratinjau sendiri (mulai/ganti/selesai). Saklar PRATINJAU_AKTIF="false" → cookie pratinjau dihapus.
 */
function jagaPratinjau(request: NextRequest): NextResponse | null {
  const ada = request.cookies.has(COOKIE_PRATINJAU) || request.cookies.has(COOKIE_LABEL_PRATINJAU);
  if (!ada) return null;
  if (process.env.PRATINJAU_AKTIF === "false") {
    const lanjut = NextResponse.next();
    lanjut.cookies.delete(COOKIE_PRATINJAU);
    lanjut.cookies.delete(COOKIE_LABEL_PRATINJAU);
    return lanjut;
  }
  const { pathname } = request.nextUrl;
  if (pathname === JALUR_KENDALI_PRATINJAU || pathname.startsWith(JALUR_KENDALI_PRATINJAU + "/")) return null;
  const tulis = request.method !== "GET" && request.method !== "HEAD";
  if (tulis || request.headers.has("next-action") || UNDUH_PRIBADI.test(pathname)) {
    return new NextResponse(PESAN_PRATINJAU, { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "x-pratinjau": "ditolak" } });
  }
  return null;
}

/** Menjaga sesi login admin tetap segar dan menolak akses /admin tanpa login. */
export async function proxy(request: NextRequest) {
  const jaga = jagaPratinjau(request);
  if (jaga && jaga.status === 403) return jaga;
  // halaman publik hanya masuk proxy lewat matcher Server Action — tidak perlu login
  if (!dilindungi(request.nextUrl.pathname)) return jaga ?? NextResponse.next();
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
  // saklar pratinjau dimatikan: buang cookie pratinjau yang tersisa
  if (jaga) jaga.cookies.getAll().forEach((c) => response.cookies.set(c));
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
    { source: "/lihat-sebagai", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    { source: "/lihat-sebagai/:path*", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
    // "Lihat sebagai…": Server Action & API di halaman mana pun melewati proxy agar bisa ditolak selama pratinjau
    { source: "/:path*", has: [{ type: "header", key: "next-action" }] },
    { source: "/api/:path*" },
  ],
};
