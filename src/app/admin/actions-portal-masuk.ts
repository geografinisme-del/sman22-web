"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS halaman masuk Portal Digital 22 (migrasi 20261224): foto per peran (bucket "portal") + tautan aplikasi guru lama.
 * Diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS. Halaman masuk dirender dinamis → tanpa deploy ulang.
 */
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261224000000_portal_masuk.sql.";

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (["42P01", "PGRST205", "PGRST204", "42703"].includes(error.code ?? "")) return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat (foto wajib punya teks alternatif minimal 3 karakter).";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

const segarkan = () => {
  revalidatePath("/portal-digital", "layout");
  revalidatePath("/admin/portal-masuk");
};

const fotoSchema = z.object({
  peran: z.enum(["gtk", "siswa", "orang_tua"]),
  caption: z.string().trim().max(80, "Maksimal 80 karakter"),
  alt_text: z.string().trim().max(160, "Maksimal 160 karakter"),
  bantuan_sandi: z.string().trim().max(200, "Maksimal 200 karakter"),
  fokus_x: z.coerce.number().int().min(0).max(100),
  fokus_y: z.coerce.number().int().min(0).max(100),
});

/** Simpan foto/caption/alt/titik fokus/teks bantuan lupa kata sandi satu peran. "Pakai foto bawaan" mengosongkan foto (tanpa menghapus berkas). */
export async function simpanFotoPortal(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return GAGAL_AKSES;
  const parsed = fotoSchema.safeParse(Object.fromEntries(["peran", "caption", "alt_text", "bantuan_sandi", "fokus_x", "fokus_y"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const baris: Record<string, unknown> = { ...parsed.data, is_placeholder: form.get("is_placeholder") === "on", updated_at: new Date().toISOString() };

  const foto = form.get("foto") as File | null;
  const salah = cekGambar(foto);
  if (salah) return { ok: false, pesan: salah, errors: { foto: salah } };
  if (form.get("bawaan") === "on") {
    Object.assign(baris, { foto_url: "", is_placeholder: false });
  } else if (foto && foto.size > 0) {
    try {
      baris.foto_url = await unggahGambar(ctx.supabase, foto, parsed.data.peran, "portal");
    } catch (e) {
      return { ok: false, pesan: (e as Error).message, errors: { foto: (e as Error).message } };
    }
  }
  // foto (lama atau baru) wajib punya teks alternatif
  const adaFoto = typeof baris.foto_url === "string" ? baris.foto_url !== "" : await punyaFoto(ctx.supabase, parsed.data.peran);
  if (adaFoto && parsed.data.alt_text.length < 3) return { ok: false, pesan: "Isi teks alternatif foto.", errors: { alt_text: "Wajib diisi bila ada foto (minimal 3 karakter)" } };

  const { error } = await ctx.supabase.from("portal_login").upsert({ ...baris }, { onConflict: "peran" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect(`/admin/portal-masuk?pesan=tersimpan#foto-${parsed.data.peran}`);
}

async function punyaFoto(supabase: NonNullable<Awaited<ReturnType<typeof aksesAksi>>>["supabase"], peran: string) {
  const { data } = await supabase.from("portal_login").select("foto_url").eq("peran", peran).maybeSingle();
  return Boolean(data?.foto_url);
}

const guruLamaSchema = z
  .object({
    guru_lama_judul: z.string().trim().max(60, "Maksimal 60 karakter"),
    guru_lama_url: z
      .string()
      .trim()
      .max(300, "Maksimal 300 karakter")
      .refine((v) => v === "" || /^https:\/\/[^\s/]+\.[^\s]+$/.test(v), "Alamat harus diawali https://"),
  })
  .refine((v) => (v.guru_lama_judul === "") === (v.guru_lama_url === ""), { message: "Isi judul dan alamat sekaligus, atau kosongkan keduanya", path: ["guru_lama_url"] });

/** Tautan opsional "aplikasi guru lama" di dasbor guru. Kosongkan keduanya untuk menyembunyikan. */
export async function simpanTautanGuruLama(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return GAGAL_AKSES;
  const parsed = guruLamaSchema.safeParse({ guru_lama_judul: String(form.get("guru_lama_judul") ?? ""), guru_lama_url: String(form.get("guru_lama_url") ?? "") });
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { error } = await ctx.supabase.from("portal_pengaturan").upsert({ id: 1, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin", "layout");
  redirect("/admin/portal-masuk?pesan=tersimpan#guru-lama");
}
