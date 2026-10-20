"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import { BIDANG } from "@/lib/bidang";
import type { HasilAksi } from "./actions";

/**
 * Aksi CMS tema "Buku Tahunan": prestasi, info SPMB, penanggung jawab bidang Portal Digital 22,
 * angka alumni PTN, dan "Ganti dengan foto asli" (is_placeholder → false).
 * Semua diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS database.
 */
const GAGAL_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak memiliki akses admin. Silakan masuk ulang." };
const BELUM_MIGRASI = "Fitur ini memerlukan migrasi 20261210000000_buku_tahunan.sql.";
const TINGKAT = ["Sekolah", "Kota", "Provinsi", "Nasional", "Internasional"] as const;

const wajibAdmin = () => aksesAksi("konten.kelola");
const segarkan = () => revalidatePath("/", "layout");
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const tautan = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^(https:\/\/|\/[^/])/.test(v), "Diawali / atau https://");

function pesanDb(error: { code?: string; message: string }) {
  console.error("[admin] kesalahan database:", error.code, error.message);
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204" || error.code === "42703") return BELUM_MIGRASI;
  if (error.code === "42501") return "Akses ditolak oleh aturan keamanan database.";
  if (error.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
}

async function fotoBaru(supabase: Parameters<typeof unggahGambar>[0], form: FormData, folder: string) {
  const foto = form.get("foto") as File | null;
  const salah = cekGambar(foto);
  if (salah) return { salah };
  if (!foto || foto.size === 0) return { url: undefined };
  try {
    return { url: await unggahGambar(supabase, foto, folder) };
  } catch (e) {
    return { salah: (e as Error).message };
  }
}

/* ---------------- Prestasi ---------------- */

const prestasiSchema = z.object({
  peringkat: z.string().trim().min(1, "Peringkat wajib diisi").max(40),
  nama_lomba: z.string().trim().min(3, "Nama lomba minimal 3 karakter").max(200),
  nama_siswa: z.string().trim().max(200),
  tingkat: z.enum(TINGKAT, { message: "Pilih tingkat" }),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
});

export async function simpanPrestasi(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const idMentah = String(form.get("id") ?? "");
  const id = idMentah ? uuid.safeParse(idMentah) : null;
  if (id && !id.success) return { ok: false, pesan: "ID tidak valid." };
  const parsed = prestasiSchema.safeParse(ambil(form, "peringkat", "nama_lomba", "nama_siswa", "tingkat", "tanggal"));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const f = await fotoBaru(ctx.supabase, form, "prestasi");
  if (f.salah) return { ok: false, pesan: f.salah, errors: { foto: f.salah } };
  const baris: Record<string, unknown> = { ...parsed.data, terbit: form.get("terbit") === "on", updated_at: new Date().toISOString() };
  // unggahan admin = foto asli
  if (f.url) Object.assign(baris, { foto_url: f.url, is_placeholder: false });
  else if (form.get("hapus_foto") === "on") Object.assign(baris, { foto_url: "", is_placeholder: false });

  const { error } = id ? await ctx.supabase.from("prestasi").update(baris).eq("id", id.data) : await ctx.supabase.from("prestasi").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect("/admin/prestasi?pesan=tersimpan");
}

/* ---------------- Angka alumni PTN (profil_sekolah) ---------------- */

const alumniSchema = z.object({
  alumni_ptn: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[\d.]+\+?$/.test(v), "Tulis angka, mis. 180 atau 180+"),
  alumni_ptn_tahun: z.string().trim().max(20),
  alumni_ptn_keterangan: z.string().trim().max(300),
});

export async function simpanAlumniPtn(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const parsed = alumniSchema.safeParse(ambil(form, "alumni_ptn", "alumni_ptn_tahun", "alumni_ptn_keterangan"));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };
  const { error, count } = await ctx.supabase
    .from("profil_sekolah")
    .update({ ...parsed.data, updated_by: ctx.akses.userId }, { count: "exact" })
    .eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return GAGAL_AKSES;
  segarkan();
  return { ok: true, pesan: "Angka alumni disimpan." };
}

/* ---------------- SPMB ---------------- */

const spmbSchema = z.object({
  tahun: z.string().trim().max(20),
  judul: z.string().trim().max(160),
  ringkasan: z.string().trim().max(400),
  tautan_jalur: tautan,
  tautan_tanya: tautan,
});

export async function simpanSpmbInfo(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const parsed = spmbSchema.safeParse(ambil(form, "tahun", "judul", "ringkasan", "tautan_jalur", "tautan_tanya"));
  if (!parsed.success) return { ok: false, pesan: "Periksa kembali isian yang ditandai.", errors: pesanError(parsed.error) };

  const jadwal: { langkah: string; tanggal: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const langkah = String(form.get(`langkah_${i}`) ?? "").trim().slice(0, 80);
    const tanggal = String(form.get(`tanggal_${i}`) ?? "").trim();
    if (!langkah) continue;
    if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { ok: false, pesan: `Tanggal langkah ${i + 1} tidak valid.`, errors: { [`tanggal_${i}`]: "Tanggal tidak valid" } };
    jadwal.push({ langkah, tanggal });
  }
  const aktif = form.get("aktif") === "on";
  if (aktif && !parsed.data.judul) return { ok: false, pesan: "Isi judul sebelum menampilkan blok SPMB.", errors: { judul: "Wajib diisi bila blok ditampilkan" } };

  const { error, count } = await ctx.supabase
    .from("spmb_info")
    .update({ ...parsed.data, aktif, jadwal, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return { ok: false, pesan: BELUM_MIGRASI };
  segarkan();
  return { ok: true, pesan: aktif ? "Info SPMB disimpan dan tampil di beranda." : "Info SPMB disimpan (blok beranda disembunyikan)." };
}

/* ---------------- Penanggung jawab bidang Portal Digital 22 ---------------- */

export async function simpanPortalBidang(_prev: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await wajibAdmin();
  if (!ctx) return GAGAL_AKSES;
  const kunci = String(form.get("kunci") ?? "");
  if (!(kunci in BIDANG)) return { ok: false, pesan: "Bidang tidak dikenal." };
  const nama = String(form.get("penanggung_jawab") ?? "").trim();
  if (nama.length > 120) return { ok: false, pesan: "Nama maksimal 120 karakter.", errors: { penanggung_jawab: "Maksimal 120 karakter" } };

  const f = await fotoBaru(ctx.supabase, form, "portal");
  if (f.salah) return { ok: false, pesan: f.salah, errors: { foto: f.salah } };
  const baris: Record<string, unknown> = { kunci, penanggung_jawab: nama, updated_at: new Date().toISOString() };
  if (f.url) Object.assign(baris, { foto_url: f.url, is_placeholder: false });
  else if (form.get("hapus_foto") === "on") Object.assign(baris, { foto_url: "", is_placeholder: false });

  const { error } = await ctx.supabase.from("portal_bidang").upsert(baris, { onConflict: "kunci" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `Penanggung jawab ${BIDANG[kunci as keyof typeof BIDANG].label} disimpan.` };
}

/* ---------------- "Ganti dengan foto asli" ---------------- */

const TABEL_MEDIA = ["berita", "galeri", "hero_slide", "prestasi", "kartu_beranda"] as const;

/**
 * Menandai media sebagai foto asli (is_placeholder = false). Dipakai setelah admin mengganti
 * ilustrasi sementara dengan foto sekolah, atau mengonfirmasi foto yang ada memang asli.
 */
export async function tandaiFotoAsli(form: FormData) {
  const ctx = await wajibAdmin();
  if (!ctx) redirect("/admin/login");
  const minta = String(form.get("kembali") ?? "");
  const kembali = /^\/admin(\/[a-z-]*)?$/.test(minta) ? minta : "/admin";
  const tabel = String(form.get("tabel") ?? "");
  const id = uuid.safeParse(String(form.get("id") ?? ""));
  if (!(TABEL_MEDIA as readonly string[]).includes(tabel) || !id.success) redirect(`${kembali}?pesan=gagal`);
  const { error } = await ctx.supabase.from(tabel).update({ is_placeholder: false }).eq("id", id.data);
  if (error) {
    console.error("[admin] gagal tandai foto asli:", error.code, error.message);
    redirect(`${kembali}?pesan=gagal`);
  }
  segarkan();
  redirect(`${kembali}?pesan=tersimpan`);
}
