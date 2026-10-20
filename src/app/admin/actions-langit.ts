"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS tema "Langit cerah": kartu putar beranda (tabel kartu_beranda, migrasi 20261220).
 * Diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS. Tidak ada hapus permanen (pakai nonaktif).
 */
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261220000000_kartu_beranda.sql.";
const wajibAdmin = () => aksesAksi("konten.kelola");
const segarkan = () => revalidatePath("/", "layout");

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (["42P01", "PGRST205", "PGRST204", "42703"].includes(error.code ?? "")) return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

const kartuSchema = z.object({
  label: z.string().trim().min(2, "Label minimal 2 karakter").max(40),
  judul: z.string().trim().min(2, "Judul minimal 2 karakter").max(60),
  deskripsi: z.string().trim().max(140, "Deskripsi maksimal 140 karakter"),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^(https:\/\/|\/[^/])/.test(v), "Diawali / (halaman situs) atau https://"),
});

export async function simpanKartu(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const idMentah = String(form.get("id") ?? "");
  const id = idMentah ? uuid.safeParse(idMentah) : null;
  if (id && !id.success) return { ok: false, pesan: "ID tidak valid." };
  const parsed = kartuSchema.safeParse(Object.fromEntries(["label", "judul", "deskripsi", "url"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const baris: Record<string, unknown> = { ...parsed.data, aktif: form.get("aktif") === "on", updated_at: new Date().toISOString() };
  const foto = form.get("foto") as File | null;
  const salah = cekGambar(foto);
  if (salah) return { ok: false, pesan: salah, errors: { foto: salah } };
  if (foto && foto.size > 0) {
    try {
      // unggahan admin = foto asli
      Object.assign(baris, { foto_url: await unggahGambar(ctx.supabase, foto, "kartu-beranda"), is_placeholder: false });
    } catch (e) {
      return { ok: false, pesan: (e as Error).message, errors: { foto: (e as Error).message } };
    }
  } else if (form.get("hapus_foto") === "on") Object.assign(baris, { foto_url: "", is_placeholder: false });

  if (!id) {
    const { data: akhir } = await ctx.supabase.from("kartu_beranda").select("urutan").order("urutan", { ascending: false }).limit(1).maybeSingle();
    baris.urutan = (akhir?.urutan ?? 0) + 1;
  }
  const { error } = id ? await ctx.supabase.from("kartu_beranda").update(baris).eq("id", id.data) : await ctx.supabase.from("kartu_beranda").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect("/admin/kartu-beranda?pesan=tersimpan");
}

/** Naikkan/turunkan urutan satu kartu (tukar dengan tetangganya). */
export async function geserKartu(form: FormData) {
  const ctx = await wajibAdmin();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id") ?? ""));
  const arah = form.get("arah") === "naik" ? -1 : 1;
  if (!id.success) redirect("/admin/kartu-beranda?pesan=gagal");
  const { data } = await ctx.supabase.from("kartu_beranda").select("id, urutan").order("urutan").order("created_at");
  const daftar = data ?? [];
  const i = daftar.findIndex((k) => k.id === id.data);
  const j = i + arah;
  if (i < 0 || j < 0 || j >= daftar.length) redirect("/admin/kartu-beranda");
  // tulis ulang urutan 1..n agar rapat, lalu tukar dua posisi
  const urut = daftar.map((k) => k.id);
  [urut[i], urut[j]] = [urut[j], urut[i]];
  for (const [n, kid] of urut.entries()) {
    const { error } = await ctx.supabase.from("kartu_beranda").update({ urutan: n + 1 }).eq("id", kid);
    if (error) {
      console.error("[admin] gagal mengurutkan kartu:", error.code, error.message);
      redirect("/admin/kartu-beranda?pesan=gagal");
    }
  }
  segarkan();
  redirect("/admin/kartu-beranda?pesan=tersimpan");
}
