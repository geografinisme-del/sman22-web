"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { cekPerangkat, unggahPerangkat } from "@/lib/admin/berkas";
import { pesanError, uuid } from "@/lib/admin/schema";
import { DIMENSI, INSTRUMEN_SUPERVISI, JENIS_PERANGKAT, KELOMPOK, slidesSchema, TINGKAT, type Dimensi, type JenisPerangkat } from "@/lib/kurikulum";
import { kirimSegera } from "@/lib/notif/kirim";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const tingkat = z.enum(TINGKAT);
const semester = z.coerce.number().int().min(1).max(2);
const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));

function pesanDb(e: { code?: string; message: string }) {
  console.error("[kurikulum]", e.code, e.message);
  if (e.code === "23505") return "Data yang sama sudah ada.";
  if (["22023", "42501"].includes(e.code ?? "") && !/row-level security/.test(e.message)) return e.message;
  if (e.code === "42501") return "Akses ditolak (mungkin ATP sudah final atau bukan milik Anda).";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  return "Gagal menyimpan. Coba lagi.";
}

async function taAktif(supabase: NonNullable<Awaited<ReturnType<typeof getAkses>>["supabase"]>) {
  const { data } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  return data?.id as string | undefined;
}

/* ============================ Struktur kurikulum ============================ */

export async function simpanStruktur(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) return TANPA_AKSES;
  const ta = await taAktif(ctx.supabase);
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const p = z
    .object({
      tingkat,
      mapel_id: uuid,
      kelompok: z.enum(Object.keys(KELOMPOK) as [keyof typeof KELOMPOK]),
      jp_minggu: z.coerce.number().int().min(0, "0–12").max(12, "0–12"),
      keterangan: z.string().trim().max(200),
    })
    .safeParse(ambil(form, "tingkat", "mapel_id", "kelompok", "jp_minggu", "keterangan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await ctx.supabase
    .from("struktur_kurikulum")
    .upsert({ tahun_ajaran_id: ta, ...p.data, updated_at: new Date().toISOString() }, { onConflict: "tahun_ajaran_id,tingkat,mapel_id" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/kurikulum");
  return { ok: true, pesan: "Tersimpan." };
}

export async function hapusStruktur(form: FormData) {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const t = tingkat.safeParse(String(form.get("tingkat")));
  if (id.success) await ctx.supabase.from("struktur_kurikulum").delete().eq("id", id.data);
  revalidatePath("/admin/kurikulum");
  redirect(`/admin/kurikulum?tingkat=${t.success ? t.data : "X"}&pesan=tersimpan`);
}

export async function salinStruktur(form: FormData) {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const dari = uuid.safeParse(String(form.get("dari")));
  const ta = await taAktif(ctx.supabase);
  if (!dari.success || !ta) redirect("/admin/kurikulum?pesan=gagal");
  const { error } = await ctx.supabase.rpc("salin_struktur", { p_dari: dari.data, p_ke: ta });
  if (error) console.error("[kurikulum] salin:", error.message);
  revalidatePath("/admin/kurikulum");
  redirect(`/admin/kurikulum?pesan=${error ? "gagal" : "tersimpan"}`);
}

/* ============================ CP & TP / ATP ============================ */

const tpSchema = z.object({
  mapel_id: uuid,
  tingkat,
  semester,
  kode: z.string().trim().max(20),
  elemen: z.string().trim().max(120),
  deskripsi: z.string().trim().min(10, "Tujuan minimal 10 karakter").max(500),
  kktp: z.string().trim().max(1000),
  alokasi_jp: z.coerce.number().int().min(0).max(99),
  urutan: z.coerce.number().int().min(0).max(999).default(0),
});

export async function simpanTp(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = tpSchema.safeParse(ambil(form, "mapel_id", "tingkat", "semester", "kode", "elemen", "deskripsi", "kktp", "alokasi_jp", "urutan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, fase: p.data.tingkat === "X" ? "E" : "F" };
  const { error, count } =
    id && uuid.safeParse(id).success
      ? await supabase.from("tujuan_pembelajaran").update(baris, { count: "exact" }).eq("id", id)
      : await supabase.from("tujuan_pembelajaran").insert(baris, { count: "exact" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return { ok: false, pesan: "Tidak tersimpan: ATP sudah final atau Anda tidak mengampu mapel ini." };
  revalidatePath("/admin/kurikulum/atp");
  if (!id) redirect(`/admin/kurikulum/atp?mapel=${baris.mapel_id}&fase=${baris.fase}&pesan=tersimpan#tp`);
  return { ok: true, pesan: "Tujuan pembelajaran tersimpan." };
}

/** Simpan beberapa TP sekaligus (hasil draf Asisten AI yang sudah dipilih guru) */
export async function simpanBanyakTp(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return TANPA_AKSES;
  let data: unknown;
  try {
    data = JSON.parse(String(form.get("data") ?? "[]"));
  } catch {
    return { ok: false, pesan: "Data tidak valid." };
  }
  const p = z.array(tpSchema).min(1, "Pilih minimal satu tujuan").max(40).safeParse(data);
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message };
  const { error } = await supabase.from("tujuan_pembelajaran").insert(p.data.map((t) => ({ ...t, fase: t.tingkat === "X" ? "E" : "F" })));
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/kurikulum/atp");
  const f = p.data[0];
  redirect(`/admin/kurikulum/atp?mapel=${f.mapel_id}&fase=${f.tingkat === "X" ? "E" : "F"}&pesan=tersimpan#tp`);
}

export async function arsipTp(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const kembali = String(form.get("kembali") ?? "");
  if (id.success) await supabase.from("tujuan_pembelajaran").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/kurikulum/atp");
  redirect(kembali.startsWith("/admin/kurikulum/atp") ? kembali : "/admin/kurikulum/atp");
}

export async function simpanCp(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      mapel_id: uuid,
      fase: z.enum(["E", "F"]),
      elemen: z.string().trim().min(2, "Isi nama elemen").max(120),
      deskripsi: z.string().trim().min(10, "Isi capaian (minimal 10 karakter)").max(3000),
      urutan: z.coerce.number().int().min(0).max(99).default(0),
    })
    .safeParse(ambil(form, "mapel_id", "fase", "elemen", "deskripsi", "urutan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error, count } =
    id && uuid.safeParse(id).success
      ? await supabase.from("capaian_pembelajaran").update(p.data, { count: "exact" }).eq("id", id)
      : await supabase.from("capaian_pembelajaran").insert(p.data, { count: "exact" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return { ok: false, pesan: "Tidak tersimpan: ATP sudah final atau Anda tidak mengampu mapel ini." };
  revalidatePath("/admin/kurikulum/atp");
  if (!id) redirect(`/admin/kurikulum/atp?mapel=${p.data.mapel_id}&fase=${p.data.fase}&pesan=tersimpan#cp`);
  return { ok: true, pesan: "Capaian pembelajaran tersimpan." };
}

export async function arsipCp(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const kembali = String(form.get("kembali") ?? "");
  if (id.success) await supabase.from("capaian_pembelajaran").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/kurikulum/atp");
  redirect(kembali.startsWith("/admin/kurikulum/atp") ? kembali : "/admin/kurikulum/atp");
}

export async function aturStatusAtp(form: FormData) {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const mapel = uuid.safeParse(String(form.get("mapel_id")));
  const fase = z.enum(["E", "F"]).safeParse(String(form.get("fase")));
  const status = String(form.get("status")) === "final" ? "final" : "draf";
  if (!mapel.success || !fase.success) redirect("/admin/kurikulum/atp?pesan=gagal");
  const { error } = await ctx.supabase.from("atp_status").upsert({
    mapel_id: mapel.data,
    fase: fase.data,
    status,
    catatan: String(form.get("catatan") ?? "").slice(0, 500),
    diubah_oleh: ctx.akses.userId,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("[atp] status:", error.message);
  revalidatePath("/admin/kurikulum/atp");
  redirect(`/admin/kurikulum/atp?mapel=${mapel.data}&fase=${fase.data}&pesan=${error ? "gagal" : "tersimpan"}`);
}

/* ============================ Perangkat ajar ============================ */

export async function unggahPerangkatAjar(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, user } = await getAkses();
  if (!supabase || !user) return TANPA_AKSES;
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya) return { ok: false, pesan: "Akun Anda belum ditautkan ke data guru." };
  const ta = await taAktif(supabase);
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const p = z
    .object({
      mapel_id: uuid,
      tingkat,
      semester,
      jenis: z.enum(Object.keys(JENIS_PERANGKAT) as [JenisPerangkat]),
      judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
      tautan: z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Tautan harus diawali https://").max(500)]),
      ajukan: z.boolean(),
    })
    .safeParse({ ...ambil(form, "mapel_id", "tingkat", "semester", "jenis", "judul", "tautan"), ajukan: form.get("ajukan") === "1" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const f = form.get("berkas") as File | null;
  const salah = cekPerangkat(f);
  if (salah) return { ok: false, pesan: salah, errors: { berkas: salah } };
  if ((!f || f.size === 0) && !p.data.tautan) return { ok: false, pesan: "Unggah berkas atau isi tautan (mis. Google Drive).", errors: { berkas: "Wajib salah satu" } };
  let berkas_path = "";
  try {
    if (f && f.size > 0) berkas_path = await unggahPerangkat(supabase, user.id, f);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const { ajukan, ...d } = p.data;
  const { error } = await supabase.from("perangkat_ajar").insert({
    ...d,
    tahun_ajaran_id: ta,
    pegawai_id: saya,
    berkas_path,
    berkas_nama: f && f.size > 0 ? f.name.slice(0, 150) : "",
    status: ajukan ? "diajukan" : "draf",
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/perangkat-ajar");
  redirect(`/admin/perangkat-ajar?pesan=${ajukan ? "perangkat-diajukan" : "tersimpan"}`);
}

export async function ubahStatusPerangkat(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const aksi = String(form.get("aksi"));
  if (!id.success) redirect("/admin/perangkat-ajar?pesan=gagal");
  const ubah =
    aksi === "ajukan" ? { status: "diajukan" } : aksi === "tarik" ? { status: "draf" } : aksi === "arsip" ? { deleted_at: new Date().toISOString() } : null;
  if (!ubah) redirect("/admin/perangkat-ajar?pesan=gagal");
  const { error } = await supabase.from("perangkat_ajar").update(ubah).eq("id", id.data);
  if (error) console.error("[perangkat] status:", error.message);
  kirimSegera();
  revalidatePath("/admin/perangkat-ajar");
  redirect(`/admin/perangkat-ajar?pesan=${error ? "gagal" : aksi === "ajukan" ? "perangkat-diajukan" : aksi === "arsip" ? "diarsipkan" : "tersimpan"}`);
}

export async function reviewPerangkat(form: FormData) {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const setuju = form.get("keputusan") === "setuju";
  const catatan = String(form.get("catatan") ?? "").slice(0, 1000);
  if (!id.success) redirect("/admin/perangkat-ajar/review?pesan=gagal");
  if (!setuju && catatan.trim().length < 3) redirect("/admin/perangkat-ajar/review?pesan=perlu-catatan-revisi");
  const { error } = await ctx.supabase.rpc("review_perangkat", { p_id: id.data, p_setuju: setuju, p_catatan: catatan });
  if (error) console.error("[perangkat] review:", error.message);
  kirimSegera();
  revalidatePath("/admin/perangkat-ajar/review");
  redirect(`/admin/perangkat-ajar/review?pesan=${error ? "gagal" : setuju ? "perangkat-disetujui" : "perangkat-revisi"}`);
}

/* ============================ Projek kokurikuler ============================ */

export async function simpanProjek(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("kurikulum.kelola");
  if (!ctx) return TANPA_AKSES;
  const ta = await taAktif(ctx.supabase);
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
      tema: z.string().trim().min(3, "Pilih tema").max(120),
      dimensi: z.array(z.enum(Object.keys(DIMENSI) as [Dimensi])).min(1, "Pilih minimal satu dimensi").max(8),
      deskripsi: z.string().trim().max(3000),
      tingkat,
      semester,
      koordinator_id: z.union([z.literal(""), uuid]),
      mulai: tgl,
      selesai: tgl,
      alokasi_jp: z.coerce.number().int().min(0).max(500),
      kelas: z.array(uuid),
    })
    .refine((d) => d.selesai >= d.mulai, { path: ["selesai"], message: "Harus setelah tanggal mulai" })
    .safeParse({
      ...ambil(form, "judul", "tema", "deskripsi", "tingkat", "semester", "koordinator_id", "mulai", "selesai", "alokasi_jp"),
      dimensi: form.getAll("dimensi").map(String),
      kelas: form.getAll("kelas").map(String),
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { kelas, ...d } = p.data;
  const baris = { ...d, koordinator_id: d.koordinator_id || null, tahun_ajaran_id: ta };
  const r =
    id && uuid.safeParse(id).success
      ? await ctx.supabase.from("projek_kokurikuler").update(baris).eq("id", id).select("id").single()
      : await ctx.supabase.from("projek_kokurikuler").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  const pid = r.data.id as string;
  const { data: lama } = await ctx.supabase.from("projek_kelas").select("kelas_id").eq("projek_id", pid);
  const hapus = (lama ?? []).map((x) => x.kelas_id as string).filter((k) => !kelas.includes(k));
  if (hapus.length) await ctx.supabase.from("projek_kelas").delete().eq("projek_id", pid).in("kelas_id", hapus);
  for (const k of kelas) {
    const fas = String(form.get(`fasilitator_${k}`) ?? "");
    await ctx.supabase.from("projek_kelas").upsert({ projek_id: pid, kelas_id: k, fasilitator_id: uuid.safeParse(fas).success ? fas : null });
  }
  revalidatePath("/admin/kokurikuler");
  redirect(`/admin/kokurikuler?pesan=tersimpan`);
}

export async function statusProjek(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const status = z.enum(["rencana", "berjalan", "selesai"]).safeParse(String(form.get("status")));
  const arsip = form.get("arsip") === "1";
  if (!id.success) redirect("/admin/kokurikuler?pesan=gagal");
  const { error } = await supabase
    .from("projek_kokurikuler")
    .update(arsip ? { deleted_at: new Date().toISOString() } : { status: status.success ? status.data : "rencana" })
    .eq("id", id.data);
  if (error) console.error("[projek]", error.message);
  revalidatePath("/admin/kokurikuler");
  redirect(`/admin/kokurikuler?pesan=${error ? "gagal" : arsip ? "diarsipkan" : "tersimpan"}`);
}

/* ============================ Supervisi akademik ============================ */

export async function jadwalkanSupervisi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("supervisi.kelola");
  if (!ctx) return TANPA_AKSES;
  const ta = await taAktif(ctx.supabase);
  if (!ta) return { ok: false, pesan: "Belum ada tahun ajaran aktif." };
  const p = z
    .object({ pegawai_id: uuid, supervisor_id: uuid, tanggal: tgl, semester })
    .refine((d) => d.pegawai_id !== d.supervisor_id, { path: ["supervisor_id"], message: "Supervisor harus orang lain" })
    .safeParse(ambil(form, "pegawai_id", "supervisor_id", "tanggal", "semester"));
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const { error } = await ctx.supabase.from("supervisi_akademik").insert({ ...p.data, tahun_ajaran_id: ta });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/supervisi");
  redirect("/admin/supervisi?pesan=supervisi-dijadwalkan");
}

export async function isiSupervisi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const skor: Record<string, string> = {};
  for (const b of INSTRUMEN_SUPERVISI.flatMap((x) => x.butir)) {
    const v = String(form.get(`skor_${b.kode}`) ?? "");
    if (/^[1-4]$/.test(v)) skor[b.kode] = v;
  }
  const final = form.get("final") === "1";
  const jumlahButir = INSTRUMEN_SUPERVISI.flatMap((x) => x.butir).length;
  if (final && Object.keys(skor).length < jumlahButir) return { ok: false, pesan: `Isi semua ${jumlahButir} butir skor sebelum menyelesaikan.` };
  const t = ambil(form, "kekuatan", "perbaikan", "rekomendasi");
  const { error, count } = await supabase
    .from("supervisi_akademik")
    .update({ skor, kekuatan: t.kekuatan.slice(0, 2000), perbaikan: t.perbaikan.slice(0, 2000), rekomendasi: t.rekomendasi.slice(0, 2000), ...(final ? { status: "selesai" } : {}) }, { count: "exact" })
    .eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return TANPA_AKSES;
  kirimSegera();
  revalidatePath("/admin/supervisi");
  if (final) redirect(`/admin/supervisi/${id.data}?pesan=supervisi-selesai`);
  return { ok: true, pesan: "Draf penilaian tersimpan." };
}

export async function batalSupervisi(form: FormData) {
  const ctx = await aksesAksi("supervisi.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("supervisi_akademik").update({ status: "batal" }).eq("id", id.data);
  revalidatePath("/admin/supervisi");
  redirect("/admin/supervisi?pesan=dibatalkan");
}

export async function tanggapiSupervisi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  const teks = String(form.get("tanggapan") ?? "").trim();
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  if (teks.length < 3) return { ok: false, pesan: "Tulis tanggapan Anda.", errors: { tanggapan: "Wajib diisi" } };
  const { error } = await supabase.rpc("tanggapi_supervisi", { p_id: id.data, p_teks: teks });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath(`/admin/supervisi/${id.data}`);
  return { ok: true, pesan: "Tanggapan tersimpan." };
}

/* ============================ Materi digital ============================ */

export async function buatMateri(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const { data: saya } = await supabase.rpc("pegawai_saya");
  if (!saya) return { ok: false, pesan: "Akun Anda belum ditautkan ke data guru." };
  const p = z
    .object({ mapel_id: uuid, judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150) })
    .safeParse(ambil(form, "mapel_id", "judul"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { data, error } = await supabase
    .from("materi_kelas")
    .insert({ ...p.data, pegawai_id: saya, slide: [{ jenis: "isi", judul: p.data.judul, isi: "" }] })
    .select("id")
    .single();
  if (error) return { ok: false, pesan: pesanDb(error) };
  redirect(`/admin/materi/${data.id}`);
}

export async function simpanMateri(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  let slideMentah: unknown;
  try {
    slideMentah = JSON.parse(String(form.get("slide") ?? "[]"));
  } catch {
    return { ok: false, pesan: "Slide tidak valid." };
  }
  const slide = slidesSchema.safeParse(slideMentah);
  if (!slide.success) {
    const i = slide.error.issues[0];
    return { ok: false, pesan: `Slide ${Number(i.path[0]) + 1}: ${i.message}` };
  }
  const p = z
    .object({ judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150), ringkasan: z.string().trim().max(500), terbit: z.boolean(), kelas: z.array(uuid) })
    .safeParse({ ...ambil(form, "judul", "ringkasan"), terbit: form.get("terbit") === "on", kelas: form.getAll("kelas").map(String) });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  if (p.data.terbit && !p.data.kelas.length) return { ok: false, pesan: "Pilih minimal satu kelas sebelum menerbitkan." };
  const { data: lama } = await supabase.from("materi_kelas").select("terbit").eq("id", id.data).maybeSingle();
  const { error, count } = await supabase
    .from("materi_kelas")
    .update({ judul: p.data.judul, ringkasan: p.data.ringkasan, terbit: p.data.terbit, slide: slide.data }, { count: "exact" })
    .eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  if (!count) return TANPA_AKSES;
  const { data: t } = await supabase.from("materi_kelas_target").select("kelas_id").eq("materi_id", id.data);
  const ada = (t ?? []).map((x) => x.kelas_id as string);
  const hapus = ada.filter((k) => !p.data.kelas.includes(k));
  const tambah = p.data.kelas.filter((k) => !ada.includes(k));
  if (hapus.length) await supabase.from("materi_kelas_target").delete().eq("materi_id", id.data).in("kelas_id", hapus);
  if (tambah.length) {
    const r = await supabase.from("materi_kelas_target").insert(tambah.map((k) => ({ materi_id: id.data, kelas_id: k })));
    if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  }
  let catatan = "";
  if (p.data.terbit && !lama?.terbit) {
    const { data: n } = await supabase.rpc("umumkan_materi", { p_id: id.data });
    catatan = ` Diterbitkan & ${n ?? 0} siswa diberi tahu.`;
  }
  revalidatePath(`/admin/materi/${id.data}`);
  revalidatePath("/portal/materi");
  return { ok: true, pesan: `Materi tersimpan.${catatan}` };
}

export async function arsipMateri(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await supabase.from("materi_kelas").update({ deleted_at: new Date().toISOString(), terbit: false }).eq("id", id.data);
  revalidatePath("/admin/materi");
  redirect("/admin/materi?pesan=diarsipkan");
}
