import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jenisGambarDariIsi } from "@/lib/admin/schema";
import { BUCKET_MEDIA } from "@/lib/supabase/config";

/** Unggah gambar publik ke bucket media (atau bucket lain, mis. "portal") (isi file diperiksa, bukan hanya ekstensinya). */
export async function unggahGambar(supabase: SupabaseClient, file: File, folder: string, bucket: string = BUCKET_MEDIA): Promise<string> {
  const isi = new Uint8Array(await file.arrayBuffer());
  const jenis = jenisGambarDariIsi(isi);
  if (!jenis) throw new Error("File yang dipilih bukan gambar JPG, PNG, atau WEBP yang valid.");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[jenis];
  const tahun = new Date().getFullYear();
  const jalur = `${folder}/${tahun}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(jalur, isi, {
    contentType: jenis,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[admin] gagal unggah:", error.message);
    throw new Error("Foto gagal diunggah. Pastikan ukuran ≤ 4 MB dan format JPG/PNG/WEBP.");
  }
  return supabase.storage.from(bucket).getPublicUrl(jalur).data.publicUrl;
}
