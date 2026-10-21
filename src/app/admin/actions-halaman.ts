"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS halaman publik Tahap C (migrasi 20261222): guru & staf, fasilitas, halaman teks (kurikulum).
 * Diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS. Tidak ada hapus permanen (pakai nonaktif).
 */
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261222000000_halaman_publik.sql.";
const wajibAdmin = () => aksesAksi("konten.kelola");

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (["42P01", "PGRST205", "PGRST204", "42703"].includes(error.code ?? "")) return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23505") return "Alamat (slug) sudah dipakai halaman lain.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

/* ---------------- staf_publik & fasilitas (pola sama: foto, urutan, aktif) ---------------- */

const TABEL = {
  staf_publik: {
    halaman: "/admin/staf-publik",
    publik: "/profil/guru-staf",
    folder: "staf-publik",
    kolom: ["nama", "jabatan", "bidang"],
    schema: z.object({
      nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
      jabatan: z.string().trim().max(120, "Maksimal 120 karakter"),
      bidang: z.string().trim().max(60, "Maksimal 60 karakter"),
    }),
  },
  fasilitas: {
    halaman: "/admin/fasilitas",
    publik: "/profil/fasilitas",
    folder: "fasilitas",
    kolom: ["nama", "deskripsi"],
    schema: z.object({
      nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
      deskripsi: z.string().trim().max(280, "Maksimal 280 karakter"),
    }),
  },
} as const;
type NamaTabel = keyof typeof TABEL;
const namaTabel = z.enum(["staf_publik", "fasilitas"]);

export async function simpanBarisHalaman(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const t = namaTabel.safeParse(String(form.get("tabel") ?? ""));
  if (!t.success) return { ok: false, pesan: "Permintaan tidak valid." };
  const def = TABEL[t.data as NamaTabel];
  const idMentah = String(form.get("id") ?? "");
  const id = idMentah ? uuid.safeParse(idMentah) : null;
  if (id && !id.success) return { ok: false, pesan: "ID tidak valid." };
  const parsed = def.schema.safeParse(Object.fromEntries(def.kolom.map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const baris: Record<string, unknown> = { ...parsed.data, aktif: form.get("aktif") === "on", updated_at: new Date().toISOString() };
  const foto = form.get("foto") as File | null;
  const salah = cekGambar(foto);
  if (salah) return { ok: false, pesan: salah, errors: { foto: salah } };
  if (foto && foto.size > 0) {
    try {
      // unggahan admin = foto asli
      Object.assign(baris, { foto_url: await unggahGambar(ctx.supabase, foto, def.folder), is_placeholder: false });
    } catch (e) {
      return { ok: false, pesan: (e as Error).message, errors: { foto: (e as Error).message } };
    }
  } else if (form.get("hapus_foto") === "on") Object.assign(baris, { foto_url: "", is_placeholder: false });

  if (!id) {
    const { data: akhir } = await ctx.supabase.from(t.data).select("urutan").order("urutan", { ascending: false }).limit(1).maybeSingle();
    baris.urutan = (akhir?.urutan ?? 0) + 1;
  }
  const { error } = id ? await ctx.supabase.from(t.data).update(baris).eq("id", id.data) : await ctx.supabase.from(t.data).insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(def.publik);
  redirect(`${def.halaman}?pesan=tersimpan`);
}

/** Naikkan/turunkan urutan satu baris (tukar dengan tetangganya). */
export async function geserBarisHalaman(form: FormData) {
  const ctx = await wajibAdmin();
  if (!ctx) redirect("/admin/login");
  const t = namaTabel.safeParse(String(form.get("tabel") ?? ""));
  if (!t.success) redirect("/admin");
  const def = TABEL[t.data as NamaTabel];
  const id = uuid.safeParse(String(form.get("id") ?? ""));
  const arah = form.get("arah") === "naik" ? -1 : 1;
  if (!id.success) redirect(`${def.halaman}?pesan=gagal`);
  const { data } = await ctx.supabase.from(t.data).select("id, urutan").order("urutan").order("created_at");
  const urut = (data ?? []).map((b) => b.id as string);
  const i = urut.indexOf(id.data);
  const j = i + arah;
  if (i < 0 || j < 0 || j >= urut.length) redirect(def.halaman);
  [urut[i], urut[j]] = [urut[j], urut[i]];
  for (const [n, bid] of urut.entries()) {
    const { error } = await ctx.supabase.from(t.data).update({ urutan: n + 1 }).eq("id", bid);
    if (error) {
      console.error("[admin] gagal mengurutkan:", error.code, error.message);
      redirect(`${def.halaman}?pesan=gagal`);
    }
  }
  revalidatePath(def.publik);
  redirect(`${def.halaman}?pesan=tersimpan`);
}

/* ---------------- halaman_cms ---------------- */

/** Halaman teks yang dikenal situs (slug → alamat publik). */
const HALAMAN_CMS = { kurikulum: "/pembelajaran/kurikulum", "tata-tertib": "/profil/tata-tertib" } as const;

const halamanSchema = z.object({
  slug: z.enum(["kurikulum", "tata-tertib"]),
  judul: z.string().trim().min(2, "Judul minimal 2 karakter").max(120),
  ringkasan: z.string().trim().max(240, "Maksimal 240 karakter"),
  isi: z.string().trim().max(40000, "Isi terlalu panjang"),
});

export async function simpanHalamanCms(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const parsed = halamanSchema.safeParse(Object.fromEntries(["slug", "judul", "ringkasan", "isi"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const baris = { ...parsed.data, terbit: form.get("terbit") === "on", updated_at: new Date().toISOString() };
  const { error } = await ctx.supabase.from("halaman_cms").upsert(baris, { onConflict: "slug" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(HALAMAN_CMS[parsed.data.slug]);
  redirect(`/admin/halaman?pesan=tersimpan`);
}
