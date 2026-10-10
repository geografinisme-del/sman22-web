"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAkses } from "@/lib/admin/auth";
import { cekPerangkat, unggahPerangkat } from "@/lib/admin/berkas";
import { pesanError, uuid } from "@/lib/admin/schema";
import { GalatAI, tanyaAI } from "@/lib/ai";
import { dariLokalWIB } from "@/lib/lms";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const waktu = z.string().refine((v) => dariLokalWIB(v) !== null, "Tanggal & jam tidak valid").transform((v) => dariLokalWIB(v)!);
const tautan = z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Tautan harus diawali https://").max(500)]);

function pesanDb(e: { code?: string; message: string }) {
  console.error("[lms]", e.code, e.message);
  if (["22023", "23P01"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return /row-level/.test(e.message) ? "Akses ditolak." : e.message;
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi.";
}

async function sesi() {
  const { supabase, akses, user } = await getAkses();
  if (!supabase || !akses || !user) return null;
  return { supabase, akses, user };
}

async function aturKelas(supabase: NonNullable<Awaited<ReturnType<typeof sesi>>>["supabase"], tabel: "tugas_kelas" | "kuis_kelas", kolom: "tugas_id" | "kuis_id", id: string, kelas: string[]) {
  const { data } = await supabase.from(tabel).select("kelas_id").eq(kolom, id);
  const ada = (data ?? []).map((x) => x.kelas_id as string);
  const hapus = ada.filter((k) => !kelas.includes(k));
  const tambah = kelas.filter((k) => !ada.includes(k));
  if (hapus.length) await supabase.from(tabel).delete().eq(kolom, id).in("kelas_id", hapus);
  if (tambah.length) {
    const r = await supabase.from(tabel).insert(tambah.map((k) => ({ [kolom]: id, kelas_id: k })));
    if (r.error) return pesanDb(r.error);
  }
  return null;
}

/* ============================ Tugas ============================ */

export async function simpanTugas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const { data: saya } = await ctx.supabase.rpc("pegawai_saya");
  if (!saya) return { ok: false, pesan: "Akun Anda belum ditautkan ke data guru." };
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      mapel_id: uuid,
      judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
      instruksi: z.string().trim().max(5000),
      tautan,
      tenggat: waktu,
      nilai_maks: z.coerce.number().int().min(1).max(1000),
      terima_terlambat: z.boolean(),
      terbit: z.boolean(),
      kelas: z.array(uuid).min(1, "Pilih minimal satu kelas"),
    })
    .safeParse({ ...ambil(form, "mapel_id", "judul", "instruksi", "tautan", "tenggat", "nilai_maks"), terima_terlambat: form.get("terima_terlambat") === "on", terbit: form.get("terbit") === "on", kelas: form.getAll("kelas").map(String) });
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const { kelas, ...d } = p.data;
  const lama = id && uuid.safeParse(id).success ? (await ctx.supabase.from("tugas").select("terbit").eq("id", id).maybeSingle()).data : null;
  const r = lama
    ? await ctx.supabase.from("tugas").update(d).eq("id", id).select("id").single()
    : await ctx.supabase.from("tugas").insert({ ...d, pegawai_id: saya }).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  const tid = r.data.id as string;
  const salah = await aturKelas(ctx.supabase, "tugas_kelas", "tugas_id", tid, kelas);
  if (salah) return { ok: false, pesan: salah };
  if (d.terbit && !lama?.terbit) await ctx.supabase.rpc("umumkan_lms", { p_jenis: "tugas", p_id: tid });
  revalidatePath("/admin/lms", "layout");
  revalidatePath("/portal/kelas");
  if (!lama) redirect(`/admin/lms/tugas/${tid}?pesan=tersimpan`);
  return { ok: true, pesan: d.terbit && !lama.terbit ? "Tersimpan & diterbitkan; siswa diberi tahu." : "Tersimpan." };
}

export async function arsipLms(form: FormData) {
  const ctx = await sesi();
  if (!ctx) redirect("/admin/login");
  const jenis = String(form.get("jenis")) === "kuis" ? "kuis" : "tugas";
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from(jenis).update({ deleted_at: new Date().toISOString(), terbit: false }).eq("id", id.data);
  revalidatePath("/admin/lms", "layout");
  redirect("/admin/lms?pesan=diarsipkan");
}

export async function nilaiTugas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const kembalikan = form.get("aksi") === "kembalikan";
  const nilai = Number(String(form.get("nilai") ?? "").replace(",", "."));
  const komentar = String(form.get("komentar") ?? "").slice(0, 2000);
  if (!kembalikan && (String(form.get("nilai") ?? "").trim() === "" || Number.isNaN(nilai))) return { ok: false, pesan: "Isi nilai.", errors: { nilai: "Wajib" } };
  if (kembalikan && komentar.trim().length < 3) return { ok: false, pesan: "Tulis apa yang perlu diperbaiki.", errors: { komentar: "Wajib" } };
  const { error } = await ctx.supabase.rpc("nilai_tugas", { p_id: id.data, p_nilai: kembalikan ? null : nilai, p_komentar: komentar, p_kembalikan: kembalikan });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/lms", "layout");
  return { ok: true, pesan: kembalikan ? "Dikembalikan ke siswa untuk diperbaiki." : "Nilai tersimpan; siswa diberi tahu." };
}

/** Siswa mengumpulkan tugas */
export async function kumpulTugas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("tugas_id")));
  const t = tautan.safeParse(String(form.get("tautan") ?? ""));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  if (!t.success) return { ok: false, pesan: t.error.issues[0].message, errors: { tautan: t.error.issues[0].message } };
  const f = form.get("berkas") as File | null;
  const salah = cekPerangkat(f);
  if (salah) return { ok: false, pesan: salah, errors: { berkas: salah } };
  let berkas = "";
  try {
    if (f && f.size > 0) berkas = await unggahPerangkat(ctx.supabase, ctx.user.id, f, "tugas");
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const { error } = await ctx.supabase.rpc("kumpul_tugas", {
    p_tugas: id.data,
    p_jawaban: String(form.get("jawaban") ?? "").slice(0, 5000),
    p_tautan: t.data,
    p_berkas: berkas,
    p_berkas_nama: f && f.size > 0 ? f.name : "",
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(`/portal/tugas/${id.data}`);
  revalidatePath("/portal/kelas");
  return { ok: true, pesan: "Tugas terkumpul. Anda masih bisa mengubahnya sebelum dinilai." };
}

/* ============================ Kuis ============================ */

export async function simpanKuis(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const { data: saya } = await ctx.supabase.rpc("pegawai_saya");
  if (!saya) return { ok: false, pesan: "Akun Anda belum ditautkan ke data guru." };
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      mapel_id: uuid,
      judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
      petunjuk: z.string().trim().max(2000),
      mulai: waktu,
      selesai: waktu,
      durasi_menit: z.coerce.number().int().min(1, "1–300 menit").max(300, "1–300 menit"),
      acak: z.boolean(),
      tampil_hasil: z.enum(["langsung", "setelah_tutup"]),
      terbit: z.boolean(),
      kelas: z.array(uuid).min(1, "Pilih minimal satu kelas"),
    })
    .refine((d) => d.selesai > d.mulai, { path: ["selesai"], message: "Harus setelah waktu dibuka" })
    .safeParse({
      ...ambil(form, "mapel_id", "judul", "petunjuk", "mulai", "selesai", "durasi_menit", "tampil_hasil"),
      acak: form.get("acak") === "on",
      terbit: form.get("terbit") === "on",
      kelas: form.getAll("kelas").map(String),
    });
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const { kelas, ...d } = p.data;
  const lama = id && uuid.safeParse(id).success ? (await ctx.supabase.from("kuis").select("terbit").eq("id", id).maybeSingle()).data : null;
  if (d.terbit && lama) {
    const { count } = await ctx.supabase.from("kuis_soal").select("id", { count: "exact", head: true }).eq("kuis_id", id);
    if (!count) return { ok: false, pesan: "Tambahkan soal sebelum menerbitkan kuis." };
  }
  if (d.terbit && !lama) return { ok: false, pesan: "Simpan kuis lalu tambahkan soal dulu sebelum menerbitkan." };
  const r = lama
    ? await ctx.supabase.from("kuis").update(d).eq("id", id).select("id").single()
    : await ctx.supabase.from("kuis").insert({ ...d, pegawai_id: saya }).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  const kid = r.data.id as string;
  const salah = await aturKelas(ctx.supabase, "kuis_kelas", "kuis_id", kid, kelas);
  if (salah) return { ok: false, pesan: salah };
  if (d.terbit && !lama?.terbit) await ctx.supabase.rpc("umumkan_lms", { p_jenis: "kuis", p_id: kid });
  revalidatePath("/admin/lms", "layout");
  if (!lama) redirect(`/admin/lms/kuis/${kid}?pesan=tersimpan`);
  return { ok: true, pesan: d.terbit && !lama.terbit ? "Kuis diterbitkan; siswa diberi tahu." : "Tersimpan." };
}

const soalSchema = z.object({
  pertanyaan: z.string().trim().min(3, "Pertanyaan minimal 3 karakter").max(2000),
  pilihan: z.array(z.string().trim().min(1, "Pilihan tidak boleh kosong").max(300)).min(2).max(5),
  kunci: z.coerce.number().int().min(0).max(4),
  pembahasan: z.string().trim().max(1000).default(""),
  bobot: z.coerce.number().int().min(1).max(10).default(1),
});

export async function simpanSoal(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const kuis = uuid.safeParse(String(form.get("kuis_id")));
  const id = String(form.get("id") ?? "");
  if (!kuis.success) return { ok: false, pesan: "Data tidak valid." };
  const pilihan = [0, 1, 2, 3, 4].map((i) => String(form.get(`pilihan_${i}`) ?? "").trim()).filter(Boolean);
  const p = soalSchema.refine((d) => d.kunci < d.pilihan.length, { path: ["kunci"], message: "Kunci menunjuk pilihan kosong" }).safeParse({ ...ambil(form, "pertanyaan", "kunci", "pembahasan", "bobot"), pilihan });
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const urutan = Number(form.get("urutan") ?? 0) || 0;
  const { error } = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("kuis_soal").update(p.data).eq("id", id)
    : await ctx.supabase.from("kuis_soal").insert({ ...p.data, kuis_id: kuis.data, urutan });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(`/admin/lms/kuis/${kuis.data}`);
  redirect(`/admin/lms/kuis/${kuis.data}?pesan=tersimpan#soal`);
}

export async function hapusSoal(form: FormData) {
  const ctx = await sesi();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const kuis = uuid.safeParse(String(form.get("kuis_id")));
  if (!id.success || !kuis.success) redirect("/admin/lms");
  const { error } = await ctx.supabase.from("kuis_soal").delete().eq("id", id.data);
  revalidatePath(`/admin/lms/kuis/${kuis.data}`);
  redirect(`/admin/lms/kuis/${kuis.data}?pesan=${error ? "soal-terkunci" : "tersimpan"}#soal`);
}

export type DrafSoal = { pertanyaan: string; pilihan: string[]; kunci: number; pembahasan: string };

/** Asisten AI: draf soal pilihan ganda dari topik (tanpa data siswa) */
export async function aiSoalKuis(input: { kuis_id: string; topik: string; jumlah: number; tingkat: string }): Promise<{ ok: true; data: DrafSoal[]; sisa: number } | { ok: false; pesan: string }> {
  try {
    const d = z.object({ kuis_id: uuid, topik: z.string().trim().min(5, "Tulis topik/TP (min. 5 huruf)").max(1000), jumlah: z.number().int().min(1).max(20), tingkat: z.enum(["mudah", "sedang", "HOTS"]) }).parse(input);
    const ctx = await sesi();
    if (!ctx) throw new GalatAI("Sesi berakhir.");
    const { data: sisa, error } = await ctx.supabase.rpc("ambil_kuota_ai", { p_fitur: "soal" });
    if (error) throw new GalatAI(error.message);
    const { data: k } = await ctx.supabase.from("kuis").select("judul, mapel(nama)").eq("id", d.kuis_id).maybeSingle();
    if (!k) throw new GalatAI("Kuis tidak ditemukan.");
    const mapel = (k.mapel as unknown as { nama: string } | null)?.nama ?? "";
    const hasil = await tanyaAI<{ soal: DrafSoal[] }>(
      `Buat ${d.jumlah} soal pilihan ganda tingkat ${d.tingkat} untuk kuis "${k.judul}" mapel ${mapel} SMA.\nTopik/TP: ${d.topik}\n` +
        `Tiap soal 4 pilihan (A–D) dengan satu jawaban benar, pengecoh masuk akal, dan pembahasan singkat. Hindari "semua benar". ` +
        `Format JSON: {"soal":[{"pertanyaan":"...","pilihan":["...","...","...","..."],"kunci":0,"pembahasan":"..."}]}`,
      5000,
    );
    const data = (hasil.soal ?? []).map((s) => soalSchema.safeParse({ ...s, bobot: 1 })).filter((r) => r.success && r.data.kunci < r.data.pilihan.length).map((r) => r.data!).slice(0, 20)
      .map(({ pertanyaan, pilihan, kunci, pembahasan }) => ({ pertanyaan, pilihan, kunci, pembahasan }));
    if (!data.length) throw new GalatAI("AI tidak menghasilkan soal yang valid. Coba lagi.");
    return { ok: true, data, sisa: Number(sisa ?? 0) };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, pesan: e.issues[0].message };
    return { ok: false, pesan: e instanceof GalatAI ? e.message : "Asisten AI gagal." };
  }
}

export async function simpanSoalBanyak(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await sesi();
  if (!ctx) return TANPA_AKSES;
  const kuis = uuid.safeParse(String(form.get("kuis_id")));
  if (!kuis.success) return { ok: false, pesan: "Data tidak valid." };
  let data: unknown;
  try { data = JSON.parse(String(form.get("data") ?? "[]")); } catch { return { ok: false, pesan: "Data tidak valid." }; }
  const p = z.array(soalSchema).min(1, "Pilih minimal satu soal").max(40).safeParse(data);
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message };
  const { count } = await ctx.supabase.from("kuis_soal").select("id", { count: "exact", head: true }).eq("kuis_id", kuis.data);
  const { error } = await ctx.supabase.from("kuis_soal").insert(p.data.map((s, i) => ({ ...s, kuis_id: kuis.data, urutan: (count ?? 0) + i + 1 })));
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(`/admin/lms/kuis/${kuis.data}`);
  redirect(`/admin/lms/kuis/${kuis.data}?pesan=tersimpan#soal`);
}

/* --------- siswa mengerjakan kuis (dipanggil dari komponen klien) --------- */

export async function mulaiKuis(kuisId: string) {
  const ctx = await sesi();
  if (!ctx || !uuid.safeParse(kuisId).success) return { ok: false as const, pesan: "Sesi berakhir." };
  const { data, error } = await ctx.supabase.rpc("mulai_kuis", { p_kuis: kuisId });
  if (error) return { ok: false as const, pesan: pesanDb(error) };
  const r = (data as { batas_pada: string; selesai: boolean }[])[0];
  if (r.selesai) return { ok: true as const, selesai: true, batas: r.batas_pada, soal: [] };
  const { data: soal } = await ctx.supabase.rpc("soal_kuis_saya", { p_kuis: kuisId });
  return { ok: true as const, selesai: false, batas: r.batas_pada, soal: (soal ?? []) as { id: string; pertanyaan: string; pilihan: string[]; jawaban: number | null }[] };
}

export async function jawabKuis(kuisId: string, jawaban: Record<string, number>, selesai: boolean) {
  const ctx = await sesi();
  if (!ctx || !uuid.safeParse(kuisId).success) return { ok: false as const, pesan: "Sesi berakhir." };
  const bersih = Object.fromEntries(Object.entries(jawaban).filter(([k, v]) => uuid.safeParse(k).success && Number.isInteger(v) && v >= 0 && v <= 4));
  const { data, error } = await ctx.supabase.rpc("jawab_kuis", { p_kuis: kuisId, p_jawaban: bersih, p_selesai: selesai });
  if (error) return { ok: false as const, pesan: pesanDb(error) };
  if (selesai) revalidatePath(`/portal/kuis/${kuisId}`);
  return { ok: true as const, skor: data as number | null };
}
