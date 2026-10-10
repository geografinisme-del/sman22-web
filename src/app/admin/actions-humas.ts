"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { KATEGORI_ADUAN, uraiPertanyaan } from "@/lib/humas";
import { kirimSegera } from "@/lib/notif/kirim";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabaseAnonSegar } from "@/lib/supabase/public";
import { supabaseServer } from "@/lib/supabase/server";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
function pesanDb(e: { code?: string; message: string }) {
  console.error("[humas]", e.code, e.message);
  if (["22023"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return "Akses ditolak.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi.";
}

/* ============================ Pengaduan publik ============================ */

export type HasilAduan = HasilAksi & { tiket?: string; kode?: string };

/** Formulir publik /pengaduan. Identitas boleh dirahasiakan. IP hanya disimpan sebagai hash (anti-spam). */
export async function kirimPengaduan(_p: HasilAduan, form: FormData): Promise<HasilAduan> {
  if (!supabaseAktif) return { ok: false, pesan: "Layanan belum aktif." };
  if (String(form.get("situs_web") ?? "") !== "") return { ok: true, pesan: "Terima kasih." }; // jebakan bot
  const p = z
    .object({
      kategori: z.enum(Object.keys(KATEGORI_ADUAN) as [keyof typeof KATEGORI_ADUAN]),
      judul: z.string().trim().min(5, "Judul minimal 5 karakter").max(150),
      isi: z.string().trim().min(20, "Uraikan minimal 20 karakter").max(5000),
      anonim: z.boolean(),
      nama: z.string().trim().max(120),
      kontak: z.string().trim().max(120),
      setuju: z.literal(true, { message: "Centang pernyataan ini" }),
    })
    .refine((d) => d.anonim || d.nama.length >= 2, { path: ["nama"], message: "Isi nama, atau pilih rahasiakan identitas" })
    .safeParse({ ...ambil(form, "kategori", "judul", "isi", "nama", "kontak"), anonim: form.get("anonim") === "on", setuju: form.get("setuju") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian yang ditandai.", errors: pesanError(p.error) };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const ipHash = ip ? createHash("sha256").update(`${ip}|${process.env.CRON_SECRET ?? "sman22"}`).digest("hex").slice(0, 32) : "";
  // pengguna yang login (siswa/ortu/guru) ikut tercatat sebagai pelapor agar mendapat pemberitahuan
  const { data: u } = await (await supabaseServer()).auth.getUser();
  const klien = u.user ? await supabaseServer() : supabaseAnonSegar();
  const d = p.data;
  const { data, error } = await klien.rpc("kirim_pengaduan", {
    p_kategori: d.kategori, p_judul: d.judul, p_isi: d.isi, p_nama: d.nama, p_kontak: d.kontak, p_anonim: d.anonim, p_ip_hash: ipHash,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  const r = (data as { tiket: string; kode: string }[])[0];
  return { ok: true, pesan: "Pengaduan terkirim.", tiket: r.tiket, kode: r.kode };
}

/* ============================ Penanganan (petugas) ============================ */

export async function prosesPengaduan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const p = z
    .object({
      status: z.enum(["baru", "diproses", "selesai", "ditolak"]),
      kategori: z.enum(Object.keys(KATEGORI_ADUAN) as [keyof typeof KATEGORI_ADUAN]),
      pic_id: z.union([z.literal(""), uuid]),
      tenggat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      tanggapan_publik: z.string().trim().max(3000),
      catatan_internal: z.string().trim().max(3000),
    })
    .safeParse(ambil(form, "status", "kategori", "pic_id", "tenggat", "tanggapan_publik", "catatan_internal"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error, count } = await supabase.from("pengaduan").update({ ...p.data, pic_id: p.data.pic_id || null }, { count: "exact" }).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return TANPA_AKSES;
  kirimSegera();
  revalidatePath("/admin/pengaduan", "layout");
  return { ok: true, pesan: "Pengaduan diperbarui. PIC & pelapor (bila login) diberi tahu." };
}

/* ============================ Kemitraan ============================ */

export async function simpanKemitraan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("humas.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const tglOps = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
  const p = z
    .object({
      mitra: z.string().trim().min(2, "Nama mitra wajib").max(150),
      jenis: z.enum(["pendidikan", "industri", "pemerintah", "komunitas", "alumni", "lainnya"]),
      ruang_lingkup: z.string().trim().max(1000),
      nomor_dokumen: z.string().trim().max(100),
      mulai: tglOps,
      berakhir: tglOps,
      pic_id: z.union([z.literal(""), uuid]),
      kontak_mitra: z.string().trim().max(150),
      tautan_dokumen: z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]),
      tampil_publik: z.boolean(),
      catatan: z.string().trim().max(1000),
      evaluasi: z.string().trim().max(2000),
    })
    .refine((d) => !d.mulai || !d.berakhir || d.berakhir >= d.mulai, { path: ["berakhir"], message: "Harus setelah tanggal mulai" })
    .safeParse({ ...ambil(form, "mitra", "jenis", "ruang_lingkup", "nomor_dokumen", "mulai", "berakhir", "pic_id", "kontak_mitra", "tautan_dokumen", "catatan", "evaluasi"), tampil_publik: form.get("tampil_publik") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, mulai: p.data.mulai || null, berakhir: p.data.berakhir || null, pic_id: p.data.pic_id || null, updated_at: new Date().toISOString() };
  const { error } = id && uuid.safeParse(id).success ? await ctx.supabase.from("kemitraan").update(baris).eq("id", id) : await ctx.supabase.from("kemitraan").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/kemitraan", "layout");
  revalidatePath("/profil");
  redirect(id ? `/admin/kemitraan/${id}?pesan=tersimpan` : "/admin/kemitraan?pesan=tersimpan");
}

export async function arsipKemitraan(form: FormData) {
  const ctx = await aksesAksi("humas.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("kemitraan").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/kemitraan");
  redirect("/admin/kemitraan?pesan=diarsipkan");
}

/* ============================ Buku tamu ============================ */

export async function catatTamu(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("tamu.catat");
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({
      nama: z.string().trim().min(2, "Nama tamu wajib").max(120),
      instansi: z.string().trim().max(150),
      telepon: z.string().trim().max(30),
      keperluan: z.string().trim().min(3, "Isi keperluan").max(300),
      bertemu_id: z.union([z.literal(""), uuid]),
      jumlah: z.coerce.number().int().min(1).max(100),
    })
    .safeParse({ ...ambil(form, "nama", "instansi", "telepon", "keperluan", "bertemu_id"), jumlah: String(form.get("jumlah") || "1") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await ctx.supabase.from("buku_tamu").insert({ ...p.data, bertemu_id: p.data.bertemu_id || null });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/buku-tamu");
  redirect("/admin/buku-tamu?pesan=tamu-tercatat");
}

export async function tamuKeluar(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await supabase.from("buku_tamu").update({ keluar: new Date().toISOString() }).eq("id", id.data).is("keluar", null);
  revalidatePath("/admin/buku-tamu");
  redirect("/admin/buku-tamu?pesan=tersimpan");
}

export type HasilCek = { ok: boolean; pesan: string; data?: { tiket: string; kategori: string; judul: string; status: string; tanggapan_publik: string; dibuat: string; diperbarui: string; rating: number | null } };

/** Cek status pengaduan dengan nomor tiket + kode akses (POST, tidak lewat URL) */
export async function cekPengaduan(_p: HasilCek, form: FormData): Promise<HasilCek> {
  if (!supabaseAktif) return { ok: false, pesan: "Layanan belum aktif." };
  const tiket = String(form.get("tiket") ?? "").trim().toUpperCase();
  const kode = String(form.get("kode") ?? "").trim().toUpperCase();
  if (!/^ADU-\d{4}-[0-9A-F]{5}$/.test(tiket) || !/^[A-Z0-9]{10}$/.test(kode)) return { ok: false, pesan: "Periksa nomor tiket (mis. ADU-2610-1A2B3) dan kode akses 10 karakter." };
  const { data, error } = await supabaseAnonSegar().rpc("cek_pengaduan", { p_tiket: tiket, p_kode: kode });
  if (error) return { ok: false, pesan: "Gagal memeriksa. Coba lagi." };
  const r = (data ?? [])[0];
  if (!r) return { ok: false, pesan: "Tiket atau kode akses tidak cocok." };
  return { ok: true, pesan: "", data: r };
}

/* ============================ Penilaian layanan ============================ */

export async function nilaiPengaduan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Layanan belum aktif." };
  const rating = Number(form.get("rating"));
  if (!(rating >= 1 && rating <= 5)) return { ok: false, pesan: "Pilih 1–5 bintang." };
  const komentar = String(form.get("komentar") ?? "").trim().slice(0, 500);
  const id = String(form.get("id") ?? "");
  let r;
  if (uuid.safeParse(id).success) {
    r = await (await supabaseServer()).rpc("nilai_pengaduan_saya", { p_id: id, p_rating: rating, p_komentar: komentar });
    revalidatePath("/portal/pengaduan");
  } else {
    r = await supabaseAnonSegar().rpc("nilai_pengaduan", {
      p_tiket: String(form.get("tiket") ?? "").trim().toUpperCase(), p_kode: String(form.get("kode") ?? "").trim().toUpperCase(), p_rating: rating, p_komentar: komentar,
    });
  }
  if (r.error) return { ok: false, pesan: "Gagal menyimpan penilaian." };
  if (!r.data) return { ok: false, pesan: "Penilaian hanya bisa diberikan sekali setelah pengaduan ditutup." };
  return { ok: true, pesan: "Terima kasih atas penilaian Anda." };
}

/* ============================ SLA ============================ */

export async function simpanSLA(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("humas.kelola");
  if (!ctx) return TANPA_AKSES;
  for (const k of Object.keys(KATEGORI_ADUAN)) {
    const n = Number(form.get(`sla_${k}`));
    if (!Number.isInteger(n) || n < 1 || n > 60) return { ok: false, pesan: "SLA 1–60 hari.", errors: { [`sla_${k}`]: "1–60" } };
    const { error } = await ctx.supabase.from("sla_pengaduan").update({ hari: n }).eq("kategori", k);
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  revalidatePath("/admin/humas");
  return { ok: true, pesan: "SLA tersimpan. Berlaku untuk pengaduan baru." };
}

/* ============================ Kegiatan kemitraan ============================ */

export async function catatKegiatanMitra(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const p = z
    .object({
      kemitraan_id: uuid,
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      kegiatan: z.string().trim().min(3, "Isi kegiatan").max(300),
      hasil: z.string().trim().max(2000),
      nilai: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]),
      tautan_dokumentasi: z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]),
    })
    .safeParse(ambil(form, "kemitraan_id", "tanggal", "kegiatan", "hasil", "nilai", "tautan_dokumentasi"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("kegiatan_mitra").insert({ ...p.data, nilai: p.data.nilai === "" ? null : p.data.nilai });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(`/admin/kemitraan/${p.data.kemitraan_id}`);
  return { ok: true, pesan: "Kegiatan kemitraan tercatat." };
}

/* ============================ Kontak media ============================ */

export async function simpanKontakMedia(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("humas.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      nama: z.string().trim().min(2, "Nama wajib").max(120),
      media: z.string().trim().max(120),
      jenis: z.enum(["cetak", "online", "televisi", "radio", "humas_pemerintah", "lainnya"]),
      telepon: z.string().trim().max(30),
      email: z.union([z.literal(""), z.string().trim().email("Email tidak valid").max(150)]),
      catatan: z.string().trim().max(500),
    })
    .safeParse(ambil(form, "nama", "media", "jenis", "telepon", "email", "catatan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const r = id && uuid.safeParse(id).success ? await ctx.supabase.from("kontak_media").update(p.data).eq("id", id) : await ctx.supabase.from("kontak_media").insert(p.data);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  revalidatePath("/admin/kontak-media");
  redirect("/admin/kontak-media?pesan=tersimpan");
}

export async function arsipKontakMedia(form: FormData) {
  const ctx = await aksesAksi("humas.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("kontak_media").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/kontak-media");
  redirect("/admin/kontak-media?pesan=diarsipkan");
}

/* ============================ Survei ============================ */

export async function simpanSurvei(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  // humas: semua survei; admin alumni: hanya tracer study (sasaran alumni) — dijaga juga oleh RLS
  const ctx = (await aksesAksi("humas.kelola")) ?? (String(form.get("sasaran")) === "alumni" ? await aksesAksi("alumni.kelola") : null);
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
  const p = z
    .object({
      judul: z.string().trim().min(3, "Judul wajib").max(150),
      deskripsi: z.string().trim().max(2000),
      sasaran: z.enum(["publik", "warga", "siswa", "ortu", "pegawai", "alumni"]),
      mulai: tgl, selesai: tgl,
      terbit: z.boolean(),
    })
    .refine((d) => d.selesai >= d.mulai, { path: ["selesai"], message: "Harus setelah tanggal mulai" })
    .safeParse({ ...ambil(form, "judul", "deskripsi", "sasaran", "mulai", "selesai"), terbit: form.get("terbit") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const q = form.has("pertanyaan") ? uraiPertanyaan(String(form.get("pertanyaan"))) : null;
  if (q && !q.ok) return { ok: false, pesan: q.pesan, errors: { pertanyaan: q.pesan } };
  const angkatan = [...new Set(String(form.get("angkatan") ?? "").split(/[\s,;]+/).filter(Boolean).map(Number))];
  if (angkatan.some((a) => !Number.isInteger(a) || a < 1980 || a > 2100)) return { ok: false, pesan: "Angkatan: tahun lulus, pisahkan dengan koma", errors: { angkatan: "mis. 2023, 2024" } };
  const baris = { ...p.data, angkatan: p.data.sasaran === "alumni" ? angkatan : [], ...(q?.ok ? { pertanyaan: q.data } : {}) };
  const r = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("survei").update(baris).eq("id", id).select("id").single()
    : await ctx.supabase.from("survei").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  revalidatePath("/admin/survei", "layout");
  revalidatePath("/survei", "layout");
  if (!id) redirect(`/admin/survei/${r.data.id}?pesan=tersimpan`);
  return { ok: true, pesan: "Survei tersimpan." };
}

export async function arsipSurvei(form: FormData) {
  const ctx = (await aksesAksi("humas.kelola")) ?? (await aksesAksi("alumni.kelola"));
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("survei").update({ deleted_at: new Date().toISOString(), terbit: false }).eq("id", id.data);
  revalidatePath("/admin/survei", "layout");
  revalidatePath("/survei", "layout");
  revalidatePath("/admin/alumni", "layout");
  redirect(String(form.get("kembali")) === "alumni" ? "/admin/alumni/tracer?pesan=diarsipkan" : "/admin/survei?pesan=diarsipkan");
}

/** Isi survei (publik/portal). Jawaban divalidasi ulang di database terhadap daftar pertanyaan. */
export async function isiSurvei(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  if (!supabaseAktif) return { ok: false, pesan: "Layanan belum aktif." };
  if (String(form.get("situs_web") ?? "") !== "") return { ok: true, pesan: "Terima kasih." };
  const id = uuid.safeParse(String(form.get("survei_id")));
  if (!id.success) return { ok: false, pesan: "Survei tidak valid." };
  const jawaban: Record<string, string | number> = {};
  for (const [k, v] of form.entries()) {
    const m = k.match(/^j_(q\d{1,2})$/);
    if (!m || typeof v !== "string" || v.trim() === "") continue;
    jawaban[m[1]] = form.get(`t_${m[1]}`) === "skala" ? Number(v) : v.slice(0, 1000);
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const ipHash = ip ? createHash("sha256").update(`${ip}|survei|${process.env.CRON_SECRET ?? "sman22"}`).digest("hex").slice(0, 32) : "";
  const { data: u } = await (await supabaseServer()).auth.getUser();
  const klien = u.user ? await supabaseServer() : supabaseAnonSegar();
  const { error } = await klien.rpc("isi_survei", { p_id: id.data, p_jawaban: jawaban, p_ip_hash: ipHash });
  if (error) return { ok: false, pesan: ["22023", "42501"].includes(error.code ?? "") ? error.message : "Gagal mengirim. Coba lagi." };
  return { ok: true, pesan: "Terima kasih, jawaban Anda terkirim." };
}
