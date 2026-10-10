"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { cekPerangkat, unggahPerangkat } from "@/lib/admin/berkas";
import { pesanError, uuid } from "@/lib/admin/schema";
import { SUMBER_MODUL } from "@/lib/mutu";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const periode = z.string().regex(/^\d{4}(\/\d{4})?$/, "Periode mis. 2026/2027");
const tglOps = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const https = z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]);
function pesanDb(e: { code?: string; message: string }) {
  console.error("[mutu]", e.code, e.message);
  if (["22023"].includes(e.code ?? "")) return e.message;
  if (e.code === "23505") return "Kode sudah dipakai.";
  if (e.code === "42501") return "Akses ditolak.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = () => revalidatePath("/admin/mutu", "layout");
async function sesi() { const a = await getAkses(); return a.supabase && a.user ? { supabase: a.supabase, user: a.user } : null; }

/* ============================ Kerangka, standar, indikator ============================ */

export async function simpanKerangka(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("mutu.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kode: z.string().trim().min(2, "Isi kode").max(40), nama: z.string().trim().min(3, "Isi nama").max(200), versi: z.string().trim().min(1).max(20),
      sumber_regulasi: z.string().trim().max(300), periode_mulai: tglOps, periode_selesai: tglOps,
      status: z.enum(["draf", "aktif", "arsip"]), periode_aktif: z.union([z.literal(""), periode]),
    })
    .safeParse(ambil(form, "kode", "nama", "versi", "sumber_regulasi", "periode_mulai", "periode_selesai", "status", "periode_aktif"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, periode_mulai: p.data.periode_mulai || null, periode_selesai: p.data.periode_selesai || null, updated_at: new Date().toISOString() };
  const r = uuid.safeParse(id).success ? await ctx.supabase.from("kerangka_mutu").update(baris).eq("id", id).select("id").single() : await ctx.supabase.from("kerangka_mutu").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  if (!id) redirect(`/admin/mutu/kerangka/${r.data.id}?pesan=tersimpan`);
  return { ok: true, pesan: "Kerangka tersimpan." };
}

export async function salinKerangka(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("mutu.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  const versi = z.string().trim().min(1, "Isi versi baru").max(20).safeParse(form.get("versi"));
  if (!id.success || !versi.success) return { ok: false, pesan: "Isi versi baru.", errors: { versi: "Wajib" } };
  const { data, error } = await ctx.supabase.rpc("salin_kerangka_mutu", { p_id: id.data, p_versi: versi.data });
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect(`/admin/mutu/kerangka/${data}?pesan=tersimpan`);
}

export async function simpanStandar(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("mutu.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({ kerangka_id: uuid, kode: z.string().trim().min(1, "Isi kode").max(20), nama: z.string().trim().min(3, "Isi nama").max(200),
      deskripsi: z.string().trim().max(2000), koordinator_id: z.union([z.literal(""), uuid]), urutan: z.coerce.number().int().min(0).max(999) })
    .safeParse({ ...ambil(form, "kerangka_id", "kode", "nama", "deskripsi", "koordinator_id"), urutan: String(form.get("urutan") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, koordinator_id: p.data.koordinator_id || null };
  const r = uuid.safeParse(id).success ? await ctx.supabase.from("standar_mutu").update(baris).eq("id", id) : await ctx.supabase.from("standar_mutu").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: "Standar tersimpan." };
}

export async function simpanIndikator(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("mutu.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      standar_id: uuid, kode: z.string().trim().min(1, "Isi kode").max(30), nama: z.string().trim().min(3, "Isi nama").max(500), deskripsi: z.string().trim().max(3000),
      jenis: z.enum(["kualitatif", "kuantitatif"]), satuan: z.string().trim().max(30), cara_ukur: z.string().trim().max(1000), sumber_data: z.string().trim().max(200),
      bobot: z.coerce.number().min(0).max(1000), pemilik_id: z.union([z.literal(""), uuid]), urutan: z.coerce.number().int().min(0).max(999),
    })
    .safeParse({ ...ambil(form, "standar_id", "kode", "nama", "deskripsi", "jenis", "satuan", "cara_ukur", "sumber_data", "pemilik_id"), bobot: String(form.get("bobot") || "1"), urutan: String(form.get("urutan") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, pemilik_id: p.data.pemilik_id || null };
  const r = uuid.safeParse(id).success ? await ctx.supabase.from("indikator_mutu").update(baris).eq("id", id) : await ctx.supabase.from("indikator_mutu").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: "Indikator tersimpan." };
}

/* ============================ Evaluasi ============================ */

export async function simpanEvaluasi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const s = await sesi();
  if (!s) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const num = z.union([z.literal(""), z.coerce.number()]);
  const p = z
    .object({
      indikator_id: uuid, periode,
      target: z.string().trim().max(300), capaian: z.string().trim().max(300), nilai_target: num, nilai_capaian: num,
      skor: z.union([z.literal(""), z.coerce.number().int().min(1).max(4)]),
      status: z.enum(["belum", "proses", "tercapai", "tidak_tercapai"]),
      evaluasi_diri: z.string().trim().max(5000), catatan: z.string().trim().max(1000),
    })
    .safeParse(ambil(form, "indikator_id", "periode", "target", "capaian", "nilai_target", "nilai_capaian", "skor", "status", "evaluasi_diri", "catatan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const d = p.data;
  const baris = { ...d, nilai_target: d.nilai_target === "" ? null : d.nilai_target, nilai_capaian: d.nilai_capaian === "" ? null : d.nilai_capaian, skor: d.skor === "" ? null : d.skor };
  const r = uuid.safeParse(id).success ? await s.supabase.from("evaluasi_indikator").update(baris).eq("id", id) : await s.supabase.from("evaluasi_indikator").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: "Evaluasi tersimpan (draf). Ajukan untuk ditinjau bila sudah lengkap." };
}

export async function reviuEvaluasi(form: FormData) {
  const s = await sesi();
  if (!s) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const kembali = String(form.get("kembali") ?? "/admin/mutu");
  const keputusan = z.enum(["diajukan", "disetujui", "revisi"]).safeParse(String(form.get("keputusan")));
  const r = id.success && keputusan.success ? await s.supabase.rpc("reviu_evaluasi", { p_id: id.data, p_keputusan: keputusan.data, p_catatan: String(form.get("catatan") ?? "").slice(0, 1000) }) : { error: { message: "Data tidak valid", code: "22023" } };
  segarkan();
  const tujuan = /^\/admin\/mutu\/indikator\/[0-9a-f-]{36}\?periode=\d{4}(\/\d{4})?$/.test(kembali) ? kembali : "/admin/mutu";
  redirect(`${tujuan}${tujuan.includes("?") ? "&" : "?"}${r.error ? `galat=${encodeURIComponent(pesanDb(r.error))}` : "pesan=tersimpan"}`);
}

/* ============================ Bukti ============================ */

export async function tambahBukti(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const s = await sesi();
  if (!s) return TANPA_AKSES;
  const p = z
    .object({
      judul: z.string().trim().min(3, "Isi judul bukti").max(200), deskripsi: z.string().trim().max(1000),
      jenis: z.enum(["berkas", "tautan", "modul"]), tautan: https, sumber_modul: z.string().max(40), sumber_ref: z.string().trim().max(100),
      tanggal_dokumen: tglOps, indikator_id: z.union([z.literal(""), uuid]), periode: z.union([z.literal(""), periode]), versi_dari: z.union([z.literal(""), uuid]),
    })
    .safeParse(ambil(form, "judul", "deskripsi", "jenis", "tautan", "sumber_modul", "sumber_ref", "tanggal_dokumen", "indikator_id", "periode", "versi_dari"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const d = p.data;
  const baris: Record<string, unknown> = { judul: d.judul, deskripsi: d.deskripsi, jenis: d.jenis, tanggal_dokumen: d.tanggal_dokumen || null, versi_dari: d.versi_dari || null };
  if (d.jenis === "tautan") {
    if (!d.tautan) return { ok: false, pesan: "Isi tautan.", errors: { tautan: "Wajib" } };
    baris.tautan = d.tautan;
  } else if (d.jenis === "modul") {
    if (!SUMBER_MODUL[d.sumber_modul]) return { ok: false, pesan: "Pilih modul sumber.", errors: { sumber_modul: "Wajib" } };
    baris.sumber_modul = d.sumber_modul; baris.sumber_ref = d.sumber_ref || "umum";
  } else {
    const f = form.get("berkas") as File | null;
    const galat = cekPerangkat(f);
    if (!f || f.size === 0) return { ok: false, pesan: "Pilih berkas.", errors: { berkas: "Wajib" } };
    if (galat) return { ok: false, pesan: galat, errors: { berkas: galat } };
    const isi = Buffer.from(await f.arrayBuffer());
    baris.hash_sha256 = createHash("sha256").update(isi).digest("hex");
    baris.ukuran = isi.length; baris.nama_berkas = f.name.slice(0, 200);
    try { baris.berkas_path = await unggahPerangkat(s.supabase, s.user.id, f, "mutu"); }
    catch (e) { return { ok: false, pesan: (e as Error).message }; }
  }
  const { data: b, error } = await s.supabase.from("bukti_mutu").insert(baris).select("id").single();
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (d.indikator_id && d.periode) {
    const { error: e2 } = await s.supabase.from("tautan_bukti_mutu").insert({ bukti_id: b.id, indikator_id: d.indikator_id, periode: d.periode });
    if (e2) return { ok: false, pesan: pesanDb(e2) };
  }
  segarkan();
  return { ok: true, pesan: d.versi_dari ? "Versi baru bukti tersimpan; versi lama tetap diarsipkan." : "Bukti tersimpan." };
}

export async function tautkanBukti(form: FormData) {
  const s = await sesi();
  if (!s) redirect("/admin/login");
  const b = uuid.safeParse(String(form.get("bukti_id"))), i = uuid.safeParse(String(form.get("indikator_id"))), pr = periode.safeParse(String(form.get("periode")));
  let galat = "";
  if (b.success && i.success && pr.success) {
    const { error } = form.get("aksi") === "lepas"
      ? await s.supabase.from("tautan_bukti_mutu").delete().eq("bukti_id", b.data).eq("indikator_id", i.data).eq("periode", pr.data)
      : await s.supabase.from("tautan_bukti_mutu").insert({ bukti_id: b.data, indikator_id: i.data, periode: pr.data });
    if (error) galat = pesanDb(error);
  }
  segarkan();
  redirect(`/admin/mutu/indikator/${i.success ? i.data : ""}?periode=${pr.success ? pr.data : ""}&${galat ? `galat=${encodeURIComponent(galat)}` : "pesan=tersimpan"}`);
}

/* ============================ Temuan & rencana ============================ */

export async function simpanTemuan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const s = await sesi();
  if (!s) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kerangka_id: uuid, indikator_id: z.union([z.literal(""), uuid]), periode,
      jenis: z.enum(["mayor", "minor", "observasi", "peluang_perbaikan"]), sumber: z.enum(["audit_internal", "evaluasi_diri", "visitasi", "lainnya"]),
      uraian: z.string().trim().min(5, "Uraikan temuan").max(2000), pj_id: z.union([z.literal(""), uuid]), tenggat: tglOps,
      status: z.enum(["terbuka", "tindak_lanjut", "verifikasi", "ditutup"]),
    })
    .safeParse(ambil(form, "kerangka_id", "indikator_id", "periode", "jenis", "sumber", "uraian", "pj_id", "tenggat", "status"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, indikator_id: p.data.indikator_id || null, pj_id: p.data.pj_id || null, tenggat: p.data.tenggat || null, updated_at: new Date().toISOString() };
  const r = uuid.safeParse(id).success ? await s.supabase.from("temuan_mutu").update(baris).eq("id", id) : await s.supabase.from("temuan_mutu").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: "Temuan tersimpan." };
}

export async function simpanRencana(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const s = await sesi();
  if (!s) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      temuan_id: z.union([z.literal(""), uuid]), indikator_id: z.union([z.literal(""), uuid]),
      kegiatan: z.string().trim().min(5, "Uraikan kegiatan").max(500), pj_id: z.union([z.literal(""), uuid]), tenggat: tglOps,
      status: z.enum(["rencana", "berjalan", "selesai", "batal"]), hasil: z.string().trim().max(2000),
    })
    .refine((d) => d.temuan_id || d.indikator_id, { path: ["kegiatan"], message: "Rencana harus terkait temuan atau indikator" })
    .safeParse(ambil(form, "temuan_id", "indikator_id", "kegiatan", "pj_id", "tenggat", "status", "hasil"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const d = p.data;
  const baris = { ...d, temuan_id: d.temuan_id || null, indikator_id: d.indikator_id || null, pj_id: d.pj_id || null, tenggat: d.tenggat || null, updated_at: new Date().toISOString() };
  const r = uuid.safeParse(id).success ? await s.supabase.from("rencana_perbaikan").update(baris).eq("id", id) : await s.supabase.from("rencana_perbaikan").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  return { ok: true, pesan: "Rencana perbaikan tersimpan." };
}
