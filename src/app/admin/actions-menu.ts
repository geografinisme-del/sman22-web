"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GRUP_LANGIT } from "@/content/menu-langit";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS navigasi (migrasi 20261223): teks pengantar & tombol ajakan per menu, keterangan tautan, kartu sorotan.
 * Label & tujuan tautan tetap di kode. Diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS.
 * Setelah simpan, cache navigasi (5 menit) disegarkan lewat tag "menu-navigasi".
 */
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261223000000_menu_navigasi.sql.";
const wajibAdmin = () => aksesAksi("konten.kelola");
const kunciGrup = z.enum(["profil", "pembelajaran", "kehidupan", "kabar", "layanan"]);
const segarkan = () => {
  updateTag("menu-navigasi");
  revalidatePath("/", "layout");
};

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (["42P01", "PGRST205", "PGRST204", "42703"].includes(error.code ?? "")) return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

/** Simpan pengantar, teks tombol ajakan HP, dan keterangan setiap tautan satu menu. */
export async function simpanMenuGrup(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const kunci = kunciGrup.safeParse(String(form.get("kunci") ?? ""));
  if (!kunci.success) return { ok: false, pesan: "Menu tidak dikenal." };
  const grup = GRUP_LANGIT.find((g) => g.kunci === kunci.data)!;
  const parsed = z
    .object({
      pengantar: z.string().trim().max(200, "Maksimal 200 karakter"),
      ajakan: z.string().trim().max(60, "Maksimal 60 karakter"),
    })
    .safeParse({ pengantar: String(form.get("pengantar") ?? ""), ajakan: String(form.get("ajakan") ?? "") });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  // keterangan hanya untuk tautan yang memang ada di menu ini (href dari kode, bukan masukan bebas)
  const keterangan = grup.anak.map((a, i) => ({ grup: kunci.data, href: a.href, keterangan: String(form.get(`ket_${i}`) ?? "").trim().slice(0, 120), updated_at: new Date().toISOString() }));

  const { error } = await ctx.supabase.from("menu_grup").upsert({ kunci: kunci.data, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "kunci" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  const { error: e2 } = await ctx.supabase.from("menu_keterangan").upsert(keterangan, { onConflict: "grup,href" });
  if (e2) return { ok: false, pesan: pesanDb(e2) };
  segarkan();
  redirect(`/admin/menu?pesan=tersimpan#menu-${kunci.data}`);
}

const sorotanSchema = z.object({
  grup: z.enum(["profil", "pembelajaran", "kehidupan"]),
  judul: z.string().trim().min(2, "Judul minimal 2 karakter").max(60),
  keterangan: z.string().trim().max(120, "Maksimal 120 karakter"),
  tautan: z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^(https:\/\/|\/[^/])/.test(v), "Diawali / (halaman situs) atau https://"),
  fokus_x: z.coerce.number().int().min(0).max(100),
  fokus_y: z.coerce.number().int().min(0).max(100),
  urutan: z.coerce.number().int().min(0).max(99),
});

/** Tambah/ubah kartu sorotan (foto 4:3, titik fokus 0–100). Nonaktif = disembunyikan (tanpa hapus permanen). */
export async function simpanSorotan(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const idMentah = String(form.get("id") ?? "");
  const id = idMentah ? uuid.safeParse(idMentah) : null;
  if (id && !id.success) return { ok: false, pesan: "ID tidak valid." };
  const parsed = sorotanSchema.safeParse(Object.fromEntries(["grup", "judul", "keterangan", "tautan", "fokus_x", "fokus_y", "urutan"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const baris: Record<string, unknown> = { ...parsed.data, aktif: form.get("aktif") === "on", updated_at: new Date().toISOString() };
  const foto = form.get("foto") as File | null;
  const salah = cekGambar(foto);
  if (salah) return { ok: false, pesan: salah, errors: { foto: salah } };
  if (foto && foto.size > 0) {
    try {
      // unggahan admin = foto asli
      Object.assign(baris, { foto_url: await unggahGambar(ctx.supabase, foto, "menu-sorotan"), is_placeholder: false });
    } catch (e) {
      return { ok: false, pesan: (e as Error).message, errors: { foto: (e as Error).message } };
    }
  }
  const { error } = id ? await ctx.supabase.from("menu_sorotan").update(baris).eq("id", id.data) : await ctx.supabase.from("menu_sorotan").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect(`/admin/menu?pesan=tersimpan#menu-${parsed.data.grup}`);
}
