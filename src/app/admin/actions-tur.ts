"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { durasiMp4 } from "@/lib/tur";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS tur sekolah (tabel tur_sekolah + bucket tur-sekolah, migrasi 20261221).
 * Unggahan: browser → Storage langsung lewat URL bertanda tangan (melewati batas 4,5 MB permintaan Vercel)
 * ke folder masuk/. Saat disimpan, server memproses: foto → WebP maks 2400px (sharp); video → MP4 ≤ 15 detik
 * & ≤ 8 MB (diperiksa dari isi berkas, bukan klaim browser), lalu berkas asli dihapus.
 * Semua aksi memeriksa izin konten.kelola di server; RLS membatasi lagi di database & Storage.
 */
const BUCKET = "tur-sekolah";
const MAKS_FOTO = 20 * 1024 * 1024;
const MAKS_VIDEO = 8 * 1024 * 1024;
const MAKS_DETIK = 15;
const MIN_AKTIF = 3;
const MAKS_AKTIF = 8;
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261221000000_tur_sekolah.sql.";
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const wajibAdmin = () => aksesAksi("konten.kelola");
const segarkan = () => revalidatePath("/", "layout");
const JALUR_MASUK = /^masuk\/[0-9a-f-]{36}\.(jpg|png|webp|mp4)$/;

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database tur:", error.code, error.message);
  if (["42P01", "PGRST205", "PGRST204", "42703"].includes(error.code ?? "")) return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return /Maksimal 8/.test(error.message) ? "Maksimal 8 titik tur aktif. Nonaktifkan titik lain dulu." : "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

/** Langkah 1 unggahan: minta URL bertanda tangan untuk satu berkas (foto/poster ≤ 20 MB, video MP4 ≤ 8 MB). */
export async function mintaUnggahanTur(jenis: "foto" | "video" | "poster", tipe: string, ukuran: number): Promise<{ ok: true; jalur: string; url: string } | { ok: false; pesan: string }> {
  const ctx = await wajibAdmin();
  if (!ctx) return { ok: false, pesan: GAGAL_AKSES.pesan };
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4" }[tipe];
  if (!ext || (jenis === "video") !== (tipe === "video/mp4")) return { ok: false, pesan: jenis === "video" ? "Video harus berformat MP4." : "Foto harus JPG, PNG, atau WEBP." };
  if (!Number.isFinite(ukuran) || ukuran <= 0) return { ok: false, pesan: "Berkas kosong." };
  if (jenis === "video" && ukuran > MAKS_VIDEO) return { ok: false, pesan: "Video maksimal 8 MB." };
  if (jenis !== "video" && ukuran > MAKS_FOTO) return { ok: false, pesan: "Foto maksimal 20 MB." };
  const jalur = `masuk/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await ctx.supabase.storage.from(BUCKET).createSignedUploadUrl(jalur);
  if (error || !data) {
    console.error("[admin] gagal membuat URL unggah tur:", error?.message);
    return { ok: false, pesan: /not found|bucket/i.test(error?.message ?? "") ? BELUM_MIGRASI : "Unggahan belum bisa dimulai. Coba lagi." };
  }
  return { ok: true, jalur, url: data.signedUrl };
}

type Supa = NonNullable<Awaited<ReturnType<typeof wajibAdmin>>>["supabase"];

async function unduh(supabase: Supa, jalur: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(jalur);
  if (error || !data) throw new Error("Berkas unggahan tidak ditemukan. Unggah ulang.");
  return new Uint8Array(await data.arrayBuffer());
}
const urlPublik = (supabase: Supa, jalur: string) => supabase.storage.from(BUCKET).getPublicUrl(jalur).data.publicUrl;

/** Foto/poster → WebP (sisi terpanjang ≤ lebarMaks), simpan di foto/, hapus berkas asli. */
async function prosesFoto(supabase: Supa, jalur: string, lebarMaks: number) {
  const isi = await unduh(supabase, jalur);
  let webp: Buffer;
  try {
    webp = await sharp(isi).rotate().resize({ width: lebarMaks, height: lebarMaks, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    await supabase.storage.from(BUCKET).remove([jalur]);
    throw new Error("Berkas bukan foto yang valid.");
  }
  const tujuan = `foto/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(tujuan, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Foto gagal disimpan.");
  await supabase.storage.from(BUCKET).remove([jalur]);
  return urlPublik(supabase, tujuan);
}

/** Video: MP4 asli (ftyp + mvhd), ≤ 8 MB, ≤ 15 detik; dipindah ke video/. Ditolak → berkas dihapus. */
async function prosesVideo(supabase: Supa, jalur: string) {
  const isi = await unduh(supabase, jalur);
  const detik = durasiMp4(isi);
  const tolak = async (pesan: string) => {
    await supabase.storage.from(BUCKET).remove([jalur]);
    throw new Error(pesan);
  };
  if (isi.byteLength > MAKS_VIDEO) await tolak("Video maksimal 8 MB.");
  if (detik === null) await tolak("Berkas bukan video MP4 yang valid.");
  if ((detik ?? 0) > MAKS_DETIK + 0.05) await tolak(`Video maksimal ${MAKS_DETIK} detik (berkas ini ${(detik ?? 0).toFixed(1)} detik).`);
  const tujuan = `video/${crypto.randomUUID()}.mp4`;
  const { error } = await supabase.storage.from(BUCKET).move(jalur, tujuan);
  if (error) throw new Error("Video gagal disimpan.");
  return urlPublik(supabase, tujuan);
}

/** Hapus berkas lama milik bucket tur (bukan foto bawaan /images/*) setelah diganti. */
async function hapusLama(supabase: Supa, url: string) {
  const m = url.match(/\/storage\/v1\/object\/public\/tur-sekolah\/((?:foto|video)\/[0-9a-f-]{36}\.(?:webp|mp4))$/);
  if (m) await supabase.storage.from(BUCKET).remove([m[1]]);
}

const titikSchema = z.object({
  label: z.string().trim().min(2, "Label minimal 2 karakter").max(40),
  judul: z.string().trim().min(2, "Judul minimal 2 karakter").max(80),
  deskripsi: z.string().trim().max(160, "Deskripsi maksimal 160 karakter"),
  tombol_teks: z.string().trim().max(40),
  tombol_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^(https:\/\/|\/[^/])/.test(v), "Diawali / atau https://"),
  alt_text: z.string().trim().max(200),
  media_tipe: z.enum(["foto", "video"]),
  fokus_x: z.coerce.number().int().min(0).max(100),
  fokus_y: z.coerce.number().int().min(0).max(100),
});

export async function simpanTitikTur(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const { supabase } = ctx;
  const idMentah = String(form.get("id") ?? "");
  const id = idMentah ? uuid.safeParse(idMentah) : null;
  if (id && !id.success) return { ok: false, pesan: "ID tidak valid." };
  const parsed = titikSchema.safeParse(Object.fromEntries(["label", "judul", "deskripsi", "tombol_teks", "tombol_url", "alt_text", "media_tipe", "fokus_x", "fokus_y"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const d = parsed.data;

  const lama = id ? (await supabase.from("tur_sekolah").select("*").eq("id", id.data).maybeSingle()).data : null;
  if (id && !lama) return { ok: false, pesan: "Titik tur tidak ditemukan." };
  const unggahMedia = String(form.get("unggahan_media") ?? "");
  const unggahPoster = String(form.get("unggahan_poster") ?? "");
  for (const j of [unggahMedia, unggahPoster]) if (j && !JALUR_MASUK.test(j)) return { ok: false, pesan: "Jalur unggahan tidak valid." };

  let mediaUrl: string = lama?.media_url ?? "";
  let posterUrl: string = lama?.poster_url ?? "";
  let tipe: "foto" | "video" = d.media_tipe;
  const dihapus: string[] = [];
  try {
    if (form.get("hapus_media") === "on" && !unggahMedia) {
      dihapus.push(mediaUrl, posterUrl);
      mediaUrl = "";
      posterUrl = "";
    }
    if (unggahMedia) {
      dihapus.push(mediaUrl);
      if (tipe === "video") mediaUrl = await prosesVideo(supabase, unggahMedia);
      else {
        mediaUrl = await prosesFoto(supabase, unggahMedia, 2400);
        dihapus.push(posterUrl);
        posterUrl = "";
      }
    } else if (lama && lama.media_tipe !== tipe && mediaUrl) {
      return { ok: false, pesan: tipe === "video" ? "Unggah berkas video untuk mengganti foto menjadi video." : "Unggah foto untuk mengganti video menjadi foto.", errors: { media: "Unggah berkas baru" } };
    }
    if (unggahPoster) {
      dihapus.push(posterUrl);
      posterUrl = await prosesFoto(supabase, unggahPoster, 1920);
    }
  } catch (e) {
    return { ok: false, pesan: (e as Error).message, errors: { media: (e as Error).message } };
  }
  if (!mediaUrl) tipe = "foto";
  if (tipe === "video" && !posterUrl) return { ok: false, pesan: "Video wajib punya poster (gambar sampul).", errors: { poster: "Unggah poster" } };
  if (tipe === "foto" && mediaUrl && d.alt_text.length < 5) return { ok: false, pesan: "Foto wajib punya teks alternatif.", errors: { alt_text: "Jelaskan isi foto (minimal 5 karakter)" } };

  const baris: Record<string, unknown> = {
    ...d,
    media_tipe: tipe,
    media_url: mediaUrl,
    poster_url: tipe === "video" ? posterUrl : "",
    updated_at: new Date().toISOString(),
  };
  // unggahan admin = media asli; konten contoh tetap ditandai sampai media diganti / ditandai asli
  if (unggahMedia) baris.is_placeholder = false;
  if (!id) {
    const { data: akhir } = await supabase.from("tur_sekolah").select("urutan").order("urutan", { ascending: false }).limit(1).maybeSingle();
    baris.urutan = (akhir?.urutan ?? 0) + 1;
    const { count } = await supabase.from("tur_sekolah").select("id", { count: "exact", head: true }).eq("aktif", true);
    baris.aktif = (count ?? 0) < MAKS_AKTIF; // titik baru langsung aktif bila masih ada tempat
  }
  const { error } = id ? await supabase.from("tur_sekolah").update(baris).eq("id", id.data) : await supabase.from("tur_sekolah").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  for (const u of dihapus.filter((u) => u && u !== mediaUrl && u !== posterUrl)) await hapusLama(supabase, u);
  segarkan();
  redirect("/admin/tur-sekolah?pesan=tersimpan");
}

/** Aktif/nonaktif dengan batas 3–8 titik aktif. */
export async function aturAktifTitikTur(form: FormData) {
  const ctx = await wajibAdmin();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id") ?? ""));
  const aktif = form.get("aktif") === "1";
  if (!id.success) redirect("/admin/tur-sekolah?pesan=gagal");
  const { count } = await ctx.supabase.from("tur_sekolah").select("id", { count: "exact", head: true }).eq("aktif", true);
  const n = count ?? 0;
  if (!aktif && n <= MIN_AKTIF) redirect("/admin/tur-sekolah?pesan=tur-minimal");
  if (aktif && n >= MAKS_AKTIF) redirect("/admin/tur-sekolah?pesan=tur-maksimal");
  const { error } = await ctx.supabase.from("tur_sekolah").update({ aktif, updated_at: new Date().toISOString() }).eq("id", id.data);
  if (error) {
    console.error("[admin] gagal mengubah status titik tur:", error.code, error.message);
    redirect("/admin/tur-sekolah?pesan=gagal");
  }
  segarkan();
  redirect("/admin/tur-sekolah?pesan=tersimpan");
}

/** Simpan urutan hasil seret-lepas (daftar id lengkap, urutan 1..n). */
export async function urutkanTitikTur(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  let ids: unknown;
  try {
    ids = JSON.parse(String(form.get("urutan") ?? "[]"));
  } catch {
    ids = null;
  }
  const daftar = z.array(uuid).min(1).max(50).safeParse(ids);
  if (!daftar.success || new Set(daftar.data).size !== daftar.data.length) return { ok: false, pesan: "Urutan tidak valid." };
  for (const [i, tid] of daftar.data.entries()) {
    const { error } = await ctx.supabase.from("tur_sekolah").update({ urutan: i + 1 }).eq("id", tid);
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  segarkan();
  return { ok: true, pesan: "Urutan titik tur disimpan." };
}
