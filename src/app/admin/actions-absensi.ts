"use server";

import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { KODE_ABSEN, jamSchema, jamSekarangWIB, tanggalSchema } from "@/lib/admin/absensi";
import { pesanError } from "@/lib/admin/schema";
import { cekBukti, unggahPrivat } from "@/lib/admin/berkas";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const uuid = z.string().uuid();

function pesanDb(e: { code?: string; message: string }) {
  console.error("[absensi]", e.code, e.message);
  if (e.code === "42501") return "Akses ditolak: Anda hanya bisa mencatat untuk kelas perwalian pada minggu berjalan. Gunakan pengajuan koreksi.";
  if (e.code === "23505") return "Data sudah tercatat sebelumnya.";
  if (e.code === "22023" || e.code === "P0002" || e.code === "23514") return e.message;
  return "Gagal menyimpan. Coba lagi.";
}

/* ---------------------- Input absensi per kelas ---------------------- */

export async function simpanAbsensiKelas(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const kelasId = uuid.safeParse(String(form.get("kelas_id")));
  const tgl = tanggalSchema.safeParse(String(form.get("tanggal")));
  if (!kelasId.success) return { ok: false, pesan: "Kelas tidak valid." };
  if (!tgl.success) return { ok: false, pesan: tgl.error.issues[0].message };

  const siswaIds = form.getAll("siswa_id").map(String).filter((s) => uuid.safeParse(s).success);
  if (siswaIds.length === 0) return { ok: false, pesan: "Tidak ada siswa di kelas ini." };

  const { data: lama, error: e0 } = await ctx.supabase
    .from("absensi_siswa")
    .select("siswa_id, status, keterangan, jam")
    .eq("tanggal", tgl.data)
    .in("siswa_id", siswaIds);
  if (e0) return { ok: false, pesan: pesanDb(e0) };
  const peta = new Map((lama ?? []).map((l) => [l.siswa_id, l]));

  const upsert: Record<string, unknown>[] = [];
  const hapus: string[] = [];
  for (const sid of siswaIds) {
    const status = String(form.get(`status_${sid}`) ?? "H");
    const ket = String(form.get(`ket_${sid}`) ?? "").trim().slice(0, 300);
    if (!(KODE_ABSEN as string[]).includes(status)) return { ok: false, pesan: "Status tidak valid." };
    const l = peta.get(sid);
    if (status === "H") {
      if (l) hapus.push(sid);
    } else if (!l || l.status !== status || (l.keterangan ?? "") !== ket) {
      upsert.push({ siswa_id: sid, tanggal: tgl.data, status, keterangan: ket, jam: l?.jam ?? null, sumber: "wali_kelas" });
    }
  }

  if (upsert.length) {
    const sumber = ctx.akses.izin.includes("absensi.kelola") ? "piket" : "wali_kelas";
    const { error } = await ctx.supabase
      .from("absensi_siswa")
      .upsert(upsert.map((u) => ({ ...u, sumber })), { onConflict: "siswa_id,tanggal" });
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  if (hapus.length) {
    const { error } = await ctx.supabase.from("absensi_siswa").delete().eq("tanggal", tgl.data).in("siswa_id", hapus);
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  const { error: e2 } = await ctx.supabase
    .from("absensi_kelas_harian")
    .upsert({ kelas_id: kelasId.data, tanggal: tgl.data, dicek_pada: new Date().toISOString() }, { onConflict: "kelas_id,tanggal" });
  if (e2) return { ok: false, pesan: pesanDb(e2) };

  kirimSegera();
  revalidatePath("/admin/absensi", "layout");
  return { ok: true, pesan: `Absensi tersimpan (${upsert.length} diubah, ${hapus.length} dikembalikan ke hadir).` };
}

/* ------------------------- Catat terlambat (piket) ------------------------- */

export async function catatTerlambat(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      siswa_id: z.string().uuid("Pilih siswa dari daftar"),
      jam: z.union([z.literal(""), jamSchema]),
      keterangan: z.string().trim().max(300),
    })
    .safeParse({ siswa_id: String(form.get("siswa_id") ?? ""), jam: String(form.get("jam") ?? ""), keterangan: String(form.get("keterangan") ?? "") });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(parsed.error) };
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const { data: ada } = await ctx.supabase
    .from("absensi_siswa")
    .select("status")
    .eq("siswa_id", parsed.data.siswa_id)
    .eq("tanggal", hariIni)
    .maybeSingle();
  if (ada && ada.status !== "T") {
    return { ok: false, pesan: `Siswa ini sudah tercatat "${ada.status}" hari ini. Ubah lewat halaman absensi kelas bila perlu.` };
  }
  const { error } = await ctx.supabase.from("absensi_siswa").upsert(
    {
      siswa_id: parsed.data.siswa_id,
      tanggal: hariIni,
      status: "T",
      jam: parsed.data.jam || jamSekarangWIB(),
      keterangan: parsed.data.keterangan,
      sumber: "piket",
    },
    { onConflict: "siswa_id,tanggal" },
  );
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/absensi", "layout");
  return { ok: true, pesan: "Keterlambatan tercatat." };
}

/* ---------------------------- Pengajuan koreksi ---------------------------- */

export async function ajukanKoreksi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      siswa_id: z.string().uuid(),
      tanggal: tanggalSchema,
      status_baru: z.enum(KODE_ABSEN as [string, ...string[]]),
      alasan: z.string().trim().min(5, "Tulis alasan minimal 5 karakter").max(500),
    })
    .safeParse({
      siswa_id: String(form.get("siswa_id") ?? ""),
      tanggal: String(form.get("tanggal") ?? ""),
      status_baru: String(form.get("status_baru") ?? ""),
      alasan: String(form.get("alasan") ?? ""),
    });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian pengajuan.", errors: pesanError(parsed.error) };
  const { count } = await ctx.supabase
    .from("pengajuan_koreksi")
    .select("id", { count: "exact", head: true })
    .eq("siswa_id", parsed.data.siswa_id)
    .eq("tanggal", parsed.data.tanggal)
    .eq("status", "menunggu");
  if (count) return { ok: false, pesan: "Sudah ada pengajuan yang menunggu untuk siswa & tanggal ini." };
  const bukti = form.get("bukti") as File | null;
  const salahBukti = cekBukti(bukti);
  if (salahBukti) return { ok: false, pesan: salahBukti, errors: { bukti: salahBukti } };
  let bukti_path = "";
  try {
    if (bukti && bukti.size > 0) bukti_path = await unggahPrivat(ctx.supabase, ctx.akses.userId, "bukti", "koreksi", bukti);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const { error } = await ctx.supabase.from("pengajuan_koreksi").insert({ ...parsed.data, bukti_path });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/absensi", "layout");
  return { ok: true, pesan: "Pengajuan terkirim. Piket/admin akan meninjau." };
}

export async function putuskanPengajuan(form: FormData) {
  const ctx = await aksesAksi("absensi.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const setuju = String(form.get("keputusan")) === "setuju";
  const catatan = String(form.get("catatan") ?? "").slice(0, 300);
  if (!id.success) redirect("/admin/absensi/pengajuan?pesan=gagal");
  const { error } = await ctx.supabase.rpc("putuskan_pengajuan", { pid: id.data, setuju, catatan_putusan: catatan });
  if (error) {
    console.error("[absensi] putuskan:", error.message);
    redirect("/admin/absensi/pengajuan?pesan=gagal");
  }
  kirimSegera();
  revalidatePath("/admin/absensi", "layout");
  redirect("/admin/absensi/pengajuan?pesan=tersimpan");
}

/* ------------------------------- Disiplin ------------------------------- */

export async function konfirmasiDisiplin(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("disiplin.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      siswa_id: z.string().uuid(),
      jenis: z.enum(["alpa", "terlambat"]),
      ambang: z.coerce.number().int().positive(),
      catatan: z.string().trim().min(3, "Tuliskan tindakan yang sudah dilakukan").max(1000),
    })
    .safeParse(Object.fromEntries(["siswa_id", "jenis", "ambang", "catatan"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(parsed.error) };
  const d = parsed.data;
  // ambil ulang dari server: label & jumlah tidak dipercaya dari browser
  const { data: status } = await ctx.supabase.rpc("status_disiplin");
  const baris = (status as { siswa_id: string; jenis: string; ambang: number; label: string; jumlah: number; dikonfirmasi: boolean }[] | null)?.find(
    (s) => s.siswa_id === d.siswa_id && s.jenis === d.jenis && s.ambang === d.ambang,
  );
  if (!baris) return { ok: false, pesan: "Data tidak ditemukan atau ambang belum tercapai." };
  if (baris.dikonfirmasi) return { ok: false, pesan: "Tindakan ini sudah dikonfirmasi." };
  const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).single();
  const { error } = await ctx.supabase.from("tindak_lanjut_disiplin").insert({
    siswa_id: d.siswa_id,
    tahun_ajaran_id: ta?.id,
    jenis: d.jenis,
    ambang: d.ambang,
    label: baris.label,
    jumlah_saat_itu: baris.jumlah,
    catatan: d.catatan,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/absensi", "layout");
  return { ok: true, pesan: `${baris.label} dikonfirmasi.` };
}

/* ---------------------------- Presensi guru ---------------------------- */

export async function presensi(form: FormData) {
  const ctx = await aksesAksi();
  if (!ctx) redirect("/admin/login");
  const jenis = String(form.get("jenis"));
  if (jenis !== "masuk" && jenis !== "pulang") redirect("/admin/presensi?pesan=gagal");
  const { error } = await ctx.supabase.rpc("presensi_saya", { jenis });
  if (error) redirect(`/admin/presensi?galat=${encodeURIComponent(error.message.slice(0, 120))}`);
  revalidatePath("/admin/presensi");
  redirect(`/admin/presensi?pesan=tersimpan`);
}

export async function simpanAbsensiPegawai(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi_pegawai.kelola");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      pegawai_id: z.string().uuid("Pilih guru/pegawai"),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      status: z.enum(["H", "T", "S", "I", "DL", "C"]),
      keterangan: z.string().trim().max(300),
    })
    .safeParse(Object.fromEntries(["pegawai_id", "tanggal", "status", "keterangan"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(parsed.error) };
  const { error } = await ctx.supabase.from("absensi_pegawai").upsert(parsed.data, { onConflict: "pegawai_id,tanggal" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/absensi/guru");
  return { ok: true, pesan: "Kehadiran guru/pegawai tersimpan." };
}

/* ------------------------------ Pengaturan ------------------------------ */

export async function simpanPengaturanAbsensi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi.atur");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      jam_masuk_batas: jamSchema,
      jam_pulang_mulai: jamSchema,
      jam_pulang_selesai: jamSchema,
      hari_sekolah: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Pilih minimal satu hari sekolah"),
      mulai_hitung: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    })
    .refine((d) => d.jam_pulang_selesai > d.jam_pulang_mulai, { message: "Jam selesai harus setelah jam mulai", path: ["jam_pulang_selesai"] })
    .safeParse({
      jam_masuk_batas: String(form.get("jam_masuk_batas") ?? ""),
      jam_pulang_mulai: String(form.get("jam_pulang_mulai") ?? ""),
      jam_pulang_selesai: String(form.get("jam_pulang_selesai") ?? ""),
      hari_sekolah: form.getAll("hari_sekolah").map(String),
      mulai_hitung: String(form.get("mulai_hitung") ?? ""),
    });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(parsed.error) };
  const { mulai_hitung, ...atur } = parsed.data;
  const { error } = await ctx.supabase.from("pengaturan_absensi").update(atur).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  const { data: ta } = await ctx.supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle();
  if (ta) {
    const r = await ctx.supabase.rpc("atur_mulai_hitung", { ta_id: ta.id, tgl: mulai_hitung || null });
    if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  }
  revalidatePath("/admin/absensi", "layout");
  return { ok: true, pesan: "Pengaturan absensi tersimpan." };
}

export async function tambahHariLibur(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi.atur");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      sampai: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      keterangan: z.string().trim().min(2, "Isi keterangan").max(120),
    })
    .safeParse(Object.fromEntries(["dari", "sampai", "keterangan"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(parsed.error) };
  const { dari, keterangan } = parsed.data;
  const sampai = parsed.data.sampai || dari;
  if (sampai < dari) return { ok: false, pesan: "Tanggal akhir sebelum tanggal awal.", errors: { sampai: "Tidak valid" } };
  const baris: { tanggal: string; keterangan: string }[] = [];
  for (let t = new Date(dari + "T00:00:00Z"); t.toISOString().slice(0, 10) <= sampai && baris.length < 60; t.setUTCDate(t.getUTCDate() + 1)) {
    baris.push({ tanggal: t.toISOString().slice(0, 10), keterangan });
  }
  const { error } = await ctx.supabase.from("hari_libur").upsert(baris, { onConflict: "tanggal" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/absensi", "layout");
  redirect("/admin/absensi/pengaturan?pesan=tersimpan");
}

export async function hapusHariLibur(form: FormData) {
  const ctx = await aksesAksi("absensi.atur");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const tgl = String(form.get("tanggal") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(tgl)) await ctx.supabase.from("hari_libur").delete().eq("tanggal", tgl);
  revalidatePath("/admin/absensi", "layout");
  redirect("/admin/absensi/pengaturan?pesan=tersimpan");
}
