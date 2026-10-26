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

/**
 * Sambungan segar setelah jeda. Fungsi Vercel dibekukan di antara permintaan: timer keep-alive undici ikut berhenti,
 * sehingga soket yang sudah ditutup Supabase/Cloudflare masih dianggap hidup dan dipakai lagi → "other side closed".
 * Pembaruan cache data Next DI LATAR (stale-while-revalidate) memanggil fetch asli tanpa lewat coba-ulang di bawah;
 * karena itu yang diperbaiki adalah sumbernya: bila sudah lebih dari JEDA_BASI ms (jam dinding — tetap berjalan saat
 * beku) tanpa aktivitas, dispatcher global fetch diganti Agent baru (soket lama tidak dipakai lagi) sebelum permintaan
 * berikutnya. Keep-alive juga diperpendek. Memakai simbol interop resmi undici (`undici.globalDispatcher.1`) dan
 * konstruktor Agent bawaan Node, tanpa paket tambahan; bila tidak tersedia, tidak melakukan apa-apa.
 */
const SIMBOL_DISPATCHER = Symbol.for("undici.globalDispatcher.1");
export const JEDA_BASI = 4_000;
const OPSI_AGENT = { keepAliveTimeout: 2_000, keepAliveMaxTimeout: 10_000 };
type AgentLike = { constructor: new (o: typeof OPSI_AGENT) => AgentLike; close?: () => Promise<void> };
const status = { terakhir: 0, dipasang: false };

/** Ganti dispatcher global bila belum pernah dipasang atau sudah basi; mengembalikan true bila diganti. */
export function segarkanSambungan(kini = Date.now(), wadah: Record<symbol, unknown> = globalThis as unknown as Record<symbol, unknown>): boolean {
  const basi = status.dipasang && status.terakhir > 0 && kini - status.terakhir > JEDA_BASI;
  if (status.dipasang && !basi) return false;
  const lama = wadah[SIMBOL_DISPATCHER] as AgentLike | undefined;
  if (!lama || typeof lama.constructor !== "function" || lama.constructor.name !== "Agent") return false;
  try {
    wadah[SIMBOL_DISPATCHER] = new lama.constructor(OPSI_AGENT);
    status.dipasang = true;
    // permintaan paralel lain dalam lonjakan yang sama tidak mengganti lagi
    status.terakhir = kini;
    // Agent lama ditutup halus: permintaan yang masih berjalan dibiarkan selesai, soket diam ditutup
    void lama.close?.().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** hanya untuk uji */
export function aturUlangStatusSambungan() {
  status.terakhir = 0;
  status.dipasang = false;
}

export const fetchTahan: typeof fetch = async (input, init) => {
  const metode = init?.method ?? (input instanceof Request ? input.method : "GET");
  segarkanSambungan();
  try {
    return await fetch(input, init);
  } catch (galat) {
    if (!bolehUlang(galat, metode) || init?.signal?.aborted) throw galat;
    const kode = ((galat as TypeError & { cause?: Sebab }).cause?.code) ?? "?";
    console.warn(`[supabase] sambungan terputus (${kode}) — mencoba ulang ${metode} sekali`);
    await new Promise((r) => setTimeout(r, 120));
    return await fetch(input, init);
  } finally {
    status.terakhir = Date.now();
  }
};
