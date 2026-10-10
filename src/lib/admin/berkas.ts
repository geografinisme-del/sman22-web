import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jenisGambarDariIsi } from "@/lib/admin/schema";

export const MAKS_BUKTI = 4 * 1024 * 1024;

/** Periksa berkas bukti (foto atau PDF) sebelum diunggah. null = tidak ada berkas */
export function cekBukti(f: File | null): string | null {
  if (!f || f.size === 0) return null;
  if (f.size > MAKS_BUKTI) return "Ukuran bukti maksimal 4 MB";
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) return "Bukti harus foto (JPG/PNG/WEBP) atau PDF";
  return null;
}

/**
 * Unggah ke bucket privat dengan nama <user_id>/<folder>/<acak>.<ext>.
 * Isi berkas diperiksa (bukan hanya ekstensi). Mengembalikan path.
 */
export async function unggahPrivat(supabase: SupabaseClient, userId: string, bucket: "bukti" | "presensi" | "sarpras", folder: string, f: File) {
  const isi = new Uint8Array(await f.arrayBuffer());
  const pdf = isi.length > 4 && isi[0] === 0x25 && isi[1] === 0x50 && isi[2] === 0x44 && isi[3] === 0x46; // %PDF
  const jenis = pdf && bucket === "bukti" ? "application/pdf" : jenisGambarDariIsi(isi);
  if (!jenis) throw new Error(bucket === "bukti" ? "Berkas bukan foto atau PDF yang valid." : "Berkas bukan foto yang valid.");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[jenis];
  const jalur = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(jalur, isi, { contentType: jenis, upsert: false });
  if (error) {
    console.error("[berkas] gagal unggah:", error.message);
    throw new Error("Berkas gagal diunggah. Coba lagi.");
  }
  return jalur;
}

export const MAKS_PERANGKAT = 4 * 1024 * 1024; // batas unggah lewat server Vercel ±4,5 MB
const OFFICE: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Perangkat ajar: PDF, Word/PowerPoint/Excel (format baru), atau foto; maksimal 4 MB */
export function cekPerangkat(f: File | null): string | null {
  if (!f || f.size === 0) return null;
  if (f.size > MAKS_PERANGKAT) return "Ukuran berkas maksimal 4 MB. Berkas lebih besar: simpan di Google Drive lalu tempel tautannya.";
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "pptx", "xlsx", "jpg", "jpeg", "png", "webp"].includes(ext)) return "Berkas harus PDF, DOCX, PPTX, XLSX, atau foto";
  return null;
}

export async function unggahPerangkat(supabase: SupabaseClient, userId: string, f: File, bucket: "perangkat" | "tugas" | "mutu" = "perangkat") {
  const isi = new Uint8Array(await f.arrayBuffer());
  const ext0 = f.name.split(".").pop()?.toLowerCase() ?? "";
  let jenis: string | null = null;
  let ext = ext0;
  if (isi[0] === 0x25 && isi[1] === 0x50 && isi[2] === 0x44 && isi[3] === 0x46) { jenis = "application/pdf"; ext = "pdf"; }
  else if (isi[0] === 0x50 && isi[1] === 0x4b && OFFICE[ext0]) jenis = OFFICE[ext0]; // berkas Office = arsip ZIP
  else {
    jenis = jenisGambarDariIsi(isi);
    if (jenis) ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[jenis] ?? "jpg";
  }
  if (!jenis) throw new Error("Isi berkas tidak sesuai jenisnya (harus PDF, DOCX, PPTX, XLSX, atau foto).");
  const jalur = `${userId}/${bucket}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(jalur, isi, { contentType: jenis, upsert: false });
  if (error) {
    console.error("[berkas] perangkat:", error.message);
    throw new Error("Berkas gagal diunggah. Coba lagi.");
  }
  return jalur;
}
