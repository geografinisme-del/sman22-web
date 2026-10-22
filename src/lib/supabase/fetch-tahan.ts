/**
 * fetch yang tahan sambungan basi. Di Vercel, fungsi serverless "tidur" di antara permintaan; sambungan keep-alive ke
 * Supabase yang ditinggal bisa sudah ditutup sisi lain, sehingga request pertama setelah bangun gagal dengan
 * `TypeError: fetch failed` (UND_ERR_SOCKET "other side closed", ECONNRESET, ETIMEDOUT). Terlihat di log produksi
 * 21–22 Okt 2026 pada halaman admin & publik.
 *
 * Aturan coba ulang (sekali, jeda 120 ms):
 * - GET/HEAD (baca, aman diulang): untuk semua galat sambungan di atas.
 * - Metode lain (POST/PATCH/DELETE): HANYA bila request pasti belum terkirim (gagal sebelum TLS/koneksi terbentuk),
 *   agar tulis data tidak pernah tereksekusi dua kali.
 */
const KODE_SAMBUNGAN = new Set(["UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT", "EPIPE", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "ENETUNREACH", "EAI_AGAIN"]);
const KODE_BELUM_TERKIRIM = new Set(["ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "ENETUNREACH", "EAI_AGAIN"]);

type Sebab = { code?: string; message?: string; socket?: { bytesWritten?: number } };

export function bolehUlang(galat: unknown, metode: string): boolean {
  if (!(galat instanceof TypeError)) return false;
  const sebab = (galat as TypeError & { cause?: Sebab }).cause;
  const kode = sebab?.code ?? "";
  if (!KODE_SAMBUNGAN.has(kode)) return false;
  const m = metode.toUpperCase();
  if (m === "GET" || m === "HEAD") return true;
  // tulis: hanya bila pasti belum ada byte request yang sampai
  if (KODE_BELUM_TERKIRIM.has(kode)) return true;
  if (kode === "ECONNRESET" && /before secure TLS connection/i.test(sebab?.message ?? "")) return true;
  return false;
}

export const fetchTahan: typeof fetch = async (input, init) => {
  const metode = init?.method ?? (input instanceof Request ? input.method : "GET");
  try {
    return await fetch(input, init);
  } catch (galat) {
    if (!bolehUlang(galat, metode) || init?.signal?.aborted) throw galat;
    const kode = ((galat as TypeError & { cause?: Sebab }).cause?.code) ?? "?";
    console.warn(`[supabase] sambungan terputus (${kode}) — mencoba ulang ${metode} sekali`);
    await new Promise((r) => setTimeout(r, 120));
    return fetch(input, init);
  }
};
