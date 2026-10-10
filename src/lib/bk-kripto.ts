import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Enkripsi catatan BK di server aplikasi (AES-256-GCM).
 * Kunci: BK_KUNCI (min. 32 karakter acak) — hanya di env server. Database hanya menyimpan sandi acak (ciphertext),
 * sehingga isi konseling tidak terbaca dari dasbor Supabase, cadangan, atau log.
 * PENTING: bila BK_KUNCI hilang, catatan lama tidak dapat dibuka. Simpan salinannya di tempat aman.
 */
const KUNCI = process.env.BK_KUNCI ?? "";
export const bkSiap = KUNCI.length >= 32;
const kunci = () => createHash("sha256").update(KUNCI).digest();

export function enkripsi(teks: string): string {
  if (!teks) return "";
  if (!bkSiap) throw new Error("BK_KUNCI belum dipasang");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", kunci(), iv);
  const isi = Buffer.concat([c.update(teks, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), isi.toString("base64url")].join(".");
}

export function dekripsi(sandi: string | null | undefined): string {
  if (!sandi) return "";
  if (!bkSiap) return "🔒 (BK_KUNCI belum dipasang — isi tidak dapat dibuka)";
  try {
    const [v, iv, tag, isi] = sandi.split(".");
    if (v !== "v1") return "🔒 (format tidak dikenal)";
    const d = createDecipheriv("aes-256-gcm", kunci(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(isi, "base64url")), d.final()]).toString("utf8");
  } catch {
    return "🔒 (tidak dapat dibuka — kunci berbeda?)";
  }
}

/** Sidik jari teks (untuk mendeteksi perubahan tanpa mengenkripsi ulang) */
export const sidik = (t: string) => createHash("sha256").update(t.trim()).digest("hex").slice(0, 16);
