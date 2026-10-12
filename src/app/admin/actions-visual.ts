"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const BUCKET_VIDEO = "video";
const MAKS_VIDEO = 20 * 1024 * 1024;
const TIPE_VIDEO = { "video/mp4": "mp4", "video/webm": "webm" } as const;

const segarkan = () => {
  revalidatePath("/admin/login");
  revalidatePath("/");
  revalidatePath("/", "layout");
};

/**
 * Langkah 1 unggah video: buat URL unggah sekali pakai. Berkas dikirim langsung dari
 * peramban ke Supabase Storage (tidak lewat server Vercel yang dibatasi ±4,5 MB).
 */
export async function siapkanUnggahVideo(tipe: string, ukuran: number): Promise<{ ok: true; jalur: string; token: string } | { ok: false; pesan: string }> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return { ok: false, pesan: TANPA_AKSES.pesan };
  const ext = TIPE_VIDEO[tipe as keyof typeof TIPE_VIDEO];
  if (!ext) return { ok: false, pesan: "Video harus berformat MP4 atau WEBM." };
  if (!(ukuran > 0) || ukuran > MAKS_VIDEO) return { ok: false, pesan: "Ukuran video maksimal 20 MB (disarankan di bawah 5 MB agar halaman cepat)." };
  const jalur = `akun/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await ctx.supabase.storage.from(BUCKET_VIDEO).createSignedUploadUrl(jalur);
  if (error || !data) {
    console.error("[visual] gagal menyiapkan unggah:", error?.message);
    return { ok: false, pesan: "Gagal menyiapkan unggah video. Pastikan migrasi 20261115000000_hero_video.sql sudah dijalankan." };
  }
  return { ok: true, jalur, token: data.token };
}

const tautan = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^\/(?!\/)[\w\-./?=&#%]*$/.test(v) || /^https:\/\/[^\s<>"]+$/.test(v), "Tautan harus diawali / (halaman situs) atau https://");

/** Langkah 2: simpan data visual (gambar diunggah lewat server; video sudah terunggah di langkah 1). */
export async function simpanVisual(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const baru = !(id && uuid.safeParse(id).success);
  const p = z
    .object({
      jenis: z.enum(["gambar", "video"], { message: "Pilih gambar atau video" }),
      lokasi: z.enum(["akun", "beranda"], { message: "Pilih tempat tampil" }),
      keterangan: z.string().trim().max(120, "Maksimal 120 karakter"),
      judul_tautan: z.string().trim().max(60, "Maksimal 60 karakter"),
      tautan,
      urutan: z.coerce.number().int().min(0).max(999),
      aktif: z.boolean(),
    })
    .safeParse({
      ...Object.fromEntries(["jenis", "lokasi", "keterangan", "judul_tautan", "tautan", "urutan"].map((k) => [k, String(form.get(k) ?? "")])),
      aktif: form.get("aktif") === "on",
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian visual.", errors: pesanError(p.error) };

  const baris: Record<string, unknown> = { ...p.data };
  if (p.data.tautan && !p.data.judul_tautan) baris.judul_tautan = "Selengkapnya";

  const gambar = form.get("gambar") as File | null;
  const poster = form.get("poster") as File | null;
  const jalurVideo = String(form.get("video_jalur") ?? "");
  for (const [f, k] of [[gambar, "gambar"], [poster, "poster"]] as const) {
    const salah = cekGambar(f);
    if (salah) return { ok: false, pesan: salah, errors: { [k]: salah } };
  }

  try {
    if (p.data.jenis === "gambar" && gambar && gambar.size > 0) {
      baris.berkas_url = await unggahGambar(ctx.supabase, gambar, "akun");
      baris.berkas_jalur = "";
    }
    if (p.data.jenis === "video" && jalurVideo) {
      if (!/^akun\/\d{4}\/[0-9a-f-]{36}\.(mp4|webm)$/.test(jalurVideo)) return { ok: false, pesan: "Berkas video tidak valid. Unggah ulang." };
      // pastikan video benar-benar sudah terunggah
      const [folder, nama] = [jalurVideo.slice(0, jalurVideo.lastIndexOf("/")), jalurVideo.slice(jalurVideo.lastIndexOf("/") + 1)];
      const { data: ada } = await ctx.supabase.storage.from(BUCKET_VIDEO).list(folder, { search: nama, limit: 1 });
      if (!ada?.length) return { ok: false, pesan: "Video belum selesai terunggah. Tunggu hingga tertulis \"Video siap\", lalu simpan.", errors: { video: "Belum terunggah" } };
      baris.berkas_url = ctx.supabase.storage.from(BUCKET_VIDEO).getPublicUrl(jalurVideo).data.publicUrl;
      baris.berkas_jalur = jalurVideo;
    }
    if (poster && poster.size > 0) baris.poster_url = await unggahGambar(ctx.supabase, poster, "akun");
    else if (form.get("hapus_poster") === "on") baris.poster_url = "";
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }

  if (baru && !baris.berkas_url) {
    const k = p.data.jenis === "video" ? "video" : "gambar";
    return { ok: false, pesan: p.data.jenis === "video" ? "Pilih video terlebih dahulu." : "Pilih gambar terlebih dahulu.", errors: { [k]: "Wajib" } };
  }
  if (!baru && p.data.jenis !== String(form.get("jenis_lama") ?? p.data.jenis) && !baris.berkas_url) {
    return { ok: false, pesan: "Jenis diganti — pilih berkas baru.", errors: { [p.data.jenis]: "Wajib" } };
  }

  const { error } = baru ? await ctx.supabase.from("visual_akun").insert(baris) : await ctx.supabase.from("visual_akun").update(baris).eq("id", id);
  if (error) {
    console.error("[visual]", error.code, error.message);
    if (error.code === "42P01") return { ok: false, pesan: "Tabel visual belum ada. Jalankan migrasi 20261120000000_visual_akun.sql di Supabase." };
    if (error.code === "42703" || error.code === "PGRST204") return { ok: false, pesan: "Jalankan migrasi 20261122000000_visual_beranda.sql di Supabase (kolom lokasi belum ada)." };
    return { ok: false, pesan: error.code === "23514" ? "Isian tidak valid (periksa tautan)." : "Gagal menyimpan. Coba lagi." };
  }
  segarkan();
  if (baru) redirect("/admin/situs?pesan=tersimpan#visual-masuk");
  return { ok: true, pesan: "Visual halaman masuk tersimpan." };
}

export async function arsipVisual(form: FormData) {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("visual_akun").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  segarkan();
  redirect("/admin/situs?pesan=diarsipkan#visual-masuk");
}
