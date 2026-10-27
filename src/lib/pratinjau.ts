import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_LABEL_PRATINJAU, COOKIE_PRATINJAU, DURASI_PRATINJAU_DETIK } from "./pratinjau-umum";

/**
 * "Lihat sebagai…" (pratinjau peran) — sisi server.
 * Cookie httpOnly, sameSite=strict, bertanda tangan HMAC-SHA256 dengan PRATINJAU_RAHASIA (tidak pernah dicatat/ditampilkan).
 * Isi: peran yang dilihat, ID pemilik (super admin), waktu mulai. Berlaku 30 menit.
 * Cookie hanya MENYEMPITKAN hak: database mengabaikan header pratinjau kecuali pemanggilnya super admin AAL2
 * (migrasi 20261228), dan server menolak semua penulisan selama cookie ada (proxy.ts, aksesAksi).
 * Saklar darurat: PRATINJAU_AKTIF="false" → fitur & header diabaikan (tanpa rollback database).
 */
export type Pratinjau = { peran: string; uid: string; mulai: number };

const rahasia = () => process.env.PRATINJAU_RAHASIA ?? "";

/** fitur hidup bila saklar tidak dimatikan dan kunci tanda tangan tersedia */
export const fiturPratinjauAktif = () => process.env.PRATINJAU_AKTIF !== "false" && rahasia().length >= 32;

const tanda = (isi: string) => createHmac("sha256", rahasia()).update(isi).digest("base64url");

export function bungkusPratinjau(p: Pratinjau): string {
  const isi = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${isi}.${tanda(isi)}`;
}

/** isi cookie bila tanda tangan sah dan belum kedaluwarsa; null selain itu (termasuk saat fitur dimatikan) */
export function bukaPratinjau(nilai: string | undefined, kini = Date.now()): Pratinjau | null {
  if (!nilai || !fiturPratinjauAktif()) return null;
  const [isi, ttd] = nilai.split(".");
  if (!isi || !ttd) return null;
  const harus = Buffer.from(tanda(isi));
  const ada = Buffer.from(ttd);
  if (harus.length !== ada.length || !timingSafeEqual(harus, ada)) return null;
  try {
    const p = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as Pratinjau;
    if (typeof p.peran !== "string" || typeof p.uid !== "string" || typeof p.mulai !== "number") return null;
    if (kini - p.mulai > DURASI_PRATINJAU_DETIK * 1000 || p.mulai > kini + 60_000) return null;
    return p;
  } catch {
    return null;
  }
}

/** pratinjau sah dari cookie permintaan ini (belum dicocokkan dengan pengguna login — lihat getAkses) */
export async function bacaPratinjau(): Promise<Pratinjau | null> {
  const toko = await cookies();
  return bukaPratinjau(toko.get(COOKIE_PRATINJAU)?.value);
}

/** apakah permintaan ini membawa cookie pratinjau (sah atau tidak) — untuk menolak penulisan */
export async function adaCookiePratinjau(): Promise<boolean> {
  const toko = await cookies();
  return Boolean(toko.get(COOKIE_PRATINJAU)?.value || toko.get(COOKIE_LABEL_PRATINJAU)?.value);
}

export const opsiCookiePratinjau = (umur = DURASI_PRATINJAU_DETIK) =>
  ({ httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: umur });
export const opsiCookieLabel = (umur = DURASI_PRATINJAU_DETIK) =>
  ({ httpOnly: false, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: umur });
