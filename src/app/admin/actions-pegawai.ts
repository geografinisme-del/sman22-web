"use server";

import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { geserTanggal, hariIniWIB, jamSchema, tanggalValid } from "@/lib/admin/absensi";
import { cekBukti, unggahPrivat } from "@/lib/admin/berkas";
import { pesanError } from "@/lib/admin/schema";
import { kunciAdminTersedia, supabaseAdminStorage } from "@/lib/supabase/admin";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const uuid = z.string().uuid();
const pesanDb = (e: { code?: string; message: string }) => {
  console.error("[pegawai]", e.code, e.message);
  return ["42501", "22023", "23514", "23505", "P0002"].includes(e.code ?? "") ? e.message : "Gagal menyimpan. Coba lagi.";
};

/* ====================== Presensi dengan lokasi / swafoto ====================== */

export async function presensiLengkap(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return { ok: false, pesan: "Sesi berakhir. Silakan masuk ulang." };
  const jenis = String(form.get("jenis"));
  if (jenis !== "masuk" && jenis !== "pulang") return { ok: false, pesan: "Jenis presensi tidak dikenal." };
  const angka = (k: string, min: number, max: number) => {
    const v = Number(form.get(k));
    return form.get(k) && Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  const lat = angka("lat", -90, 90), lng = angka("lng", -180, 180), akurasi = angka("akurasi", 0, 100000);

  let foto: string | null = null;
  const f = form.get("foto") as File | null;
  if (f && f.size > 0) {
    if (f.size > 2 * 1024 * 1024) return { ok: false, pesan: "Ukuran foto terlalu besar (maks. 2 MB)." };
    try {
      foto = await unggahPrivat(ctx.supabase, ctx.akses.userId, "presensi", hariIniWIB(), f);
    } catch (e) {
      return { ok: false, pesan: (e as Error).message };
    }
  }
  const { data, error } = await ctx.supabase.rpc("presensi_saya", { jenis, p_lat: lat, p_lng: lng, p_akurasi: akurasi, p_foto: foto });
  if (error) {
    if (foto && kunciAdminTersedia) await supabaseAdminStorage().from("presensi").remove([foto]); // jangan simpan foto yang tidak dipakai
    return { ok: false, pesan: error.message };
  }
  revalidatePath("/admin/presensi");
  const d = data as { jam: string; jarak: number | null };
  return { ok: true, pesan: `Presensi ${jenis} tercatat pukul ${d.jam}${d.jarak != null ? ` (±${d.jarak} m dari sekolah)` : ""}.` };
}

/* ====================== Pengajuan izin/sakit/dinas/cuti ====================== */

export async function ajukanIzinPegawai(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      jenis: z.enum(["S", "I", "DL", "C"], { message: "Pilih jenis" }),
      tanggal_mulai: z.string().refine(tanggalValid, "Tanggal tidak valid"),
      tanggal_selesai: z.string().refine(tanggalValid, "Tanggal tidak valid"),
      alasan: z.string().trim().min(5, "Minimal 5 karakter").max(500),
    })
    .refine((d) => d.tanggal_selesai >= d.tanggal_mulai, { path: ["tanggal_selesai"], message: "Sebelum tanggal mulai" })
    .refine((d) => d.tanggal_selesai <= geserTanggal(d.tanggal_mulai, 30), { path: ["tanggal_selesai"], message: "Maksimal 31 hari" })
    .refine((d) => d.tanggal_mulai >= geserTanggal(hariIniWIB(), -7), { path: ["tanggal_mulai"], message: "Paling lambat 7 hari setelahnya" })
    .safeParse({
      jenis: String(form.get("jenis") ?? ""),
      tanggal_mulai: String(form.get("tanggal_mulai") ?? ""),
      tanggal_selesai: String(form.get("tanggal_selesai") || form.get("tanggal_mulai") || ""),
      alasan: String(form.get("alasan") ?? ""),
    });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian pengajuan.", errors: pesanError(parsed.error) };
  const bukti = form.get("bukti") as File | null;
  const salah = cekBukti(bukti);
  if (salah) return { ok: false, pesan: salah, errors: { bukti: salah } };
  let bukti_path = "";
  try {
    if (bukti && bukti.size > 0) bukti_path = await unggahPrivat(ctx.supabase, ctx.akses.userId, "bukti", "izin-pegawai", bukti);
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  // pegawai_id diisi otomatis oleh database dari akun yang login
  const { error } = await ctx.supabase.from("pengajuan_izin_pegawai").insert({ ...parsed.data, bukti_path });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/presensi");
  revalidatePath("/admin/izin-pegawai");
  return { ok: true, pesan: "Pengajuan terkirim ke kepala sekolah. Status bisa dipantau di bawah." };
}

export async function batalkanIzinPegawai(form: FormData) {
  const ctx = await aksesAksi();
  if (!ctx) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.rpc("batalkan_izin_pegawai", { p_id: id.data });
  revalidatePath("/admin/presensi");
  redirect("/admin/presensi?pesan=izin-dibatalkan#izin");
}

export async function putuskanIzinPegawai(form: FormData) {
  const ctx = await aksesAksi("izin_pegawai.setujui");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const setuju = String(form.get("keputusan")) === "setuju";
  if (!id.success) redirect("/admin/izin-pegawai?pesan=gagal");
  const { error } = await ctx.supabase.rpc("putuskan_izin_pegawai", { p_id: id.data, p_setuju: setuju, p_catatan: String(form.get("catatan") ?? "").slice(0, 300) });
  if (error) {
    console.error("[pegawai] putuskan:", error.message);
    redirect("/admin/izin-pegawai?pesan=gagal");
  }
  kirimSegera();
  revalidatePath("/admin", "layout");
  redirect(`/admin/izin-pegawai?pesan=${setuju ? "izin-pegawai-disetujui" : "ditolak"}`);
}

/* ====================== Kelompok kerja & kebijakan presensi ====================== */

export async function simpanKelompokKerja(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi_pegawai.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const parsed = z
    .object({
      nama: z.string().trim().min(2).max(60),
      jam_masuk: jamSchema,
      toleransi_menit: z.coerce.number().int().min(0).max(120),
      jam_pulang: jamSchema,
      hari_kerja: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Pilih hari kerja"),
      wajib_lokasi: z.boolean(),
      wajib_swafoto: z.boolean(),
    })
    .refine((d) => d.jam_pulang > d.jam_masuk, { path: ["jam_pulang"], message: "Harus setelah jam masuk" })
    .safeParse({
      ...Object.fromEntries(["nama", "jam_masuk", "toleransi_menit", "jam_pulang"].map((k) => [k, String(form.get(k) ?? "")])),
      hari_kerja: form.getAll("hari_kerja").map(String),
      wajib_lokasi: form.get("wajib_lokasi") === "on",
      wajib_swafoto: form.get("wajib_swafoto") === "on",
    });
  if (!parsed.success) return { ok: false, pesan: "Periksa isian kelompok.", errors: pesanError(parsed.error) };
  const { error } = uuid.safeParse(id).success
    ? await ctx.supabase.from("kelompok_kerja").update(parsed.data).eq("id", id)
    : await ctx.supabase.from("kelompok_kerja").insert(parsed.data);
  if (error) return { ok: false, pesan: error.code === "23505" ? "Nama kelompok sudah ada." : pesanDb(error) };
  revalidatePath("/admin/absensi/guru/pengaturan");
  return { ok: true, pesan: `Kelompok ${parsed.data.nama} tersimpan.` };
}

export async function aturKelompokPegawai(form: FormData) {
  const ctx = await aksesAksi("absensi_pegawai.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const kelompok = String(form.get("kelompok_kerja_id") ?? "");
  const ids = form.getAll("pegawai").map(String).filter((x) => uuid.safeParse(x).success);
  if (!ids.length) redirect("/admin/absensi/guru/pengaturan?pesan=gagal#pegawai");
  const { error } = await ctx.supabase.from("pegawai").update({ kelompok_kerja_id: uuid.safeParse(kelompok).success ? kelompok : null }).in("id", ids);
  if (error) console.error("[pegawai] kelompok:", error.message);
  revalidatePath("/admin/absensi/guru/pengaturan");
  redirect(`/admin/absensi/guru/pengaturan?pesan=${error ? "gagal" : "tersimpan"}#pegawai`);
}

export async function simpanLokasiSekolah(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi.atur");
  if (!ctx) return TANPA_AKSES;
  const parsed = z
    .object({
      lokasi_lat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).transform((v) => (v === "" ? null : v)),
      lokasi_lng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).transform((v) => (v === "" ? null : v)),
      lokasi_radius: z.coerce.number().int().min(30, "Minimal 30 m").max(2000, "Maksimal 2000 m"),
      retensi_swafoto_hari: z.coerce.number().int().min(1).max(365),
    })
    .safeParse(Object.fromEntries(["lokasi_lat", "lokasi_lng", "lokasi_radius", "retensi_swafoto_hari"].map((k) => [k, String(form.get(k) ?? "").trim()])));
  if (!parsed.success) return { ok: false, pesan: "Periksa isian lokasi.", errors: pesanError(parsed.error) };
  const { error } = await ctx.supabase.from("pengaturan_absensi").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/absensi/guru/pengaturan");
  return { ok: true, pesan: "Lokasi & retensi tersimpan." };
}

/** Hapus swafoto yang melewati masa simpan (kebijakan retensi) */
export async function hapusSwafotoLama(_p: HasilAksi): Promise<HasilAksi> {
  const ctx = await aksesAksi("absensi_pegawai.kelola");
  if (!ctx) return TANPA_AKSES;
  if (!kunciAdminTersedia) return { ok: false, pesan: "Butuh kunci rahasia Supabase di server." };
  const { data: atur } = await ctx.supabase.from("pengaturan_absensi").select("retensi_swafoto_hari").eq("id", 1).single();
  const batas = geserTanggal(hariIniWIB(), -(atur?.retensi_swafoto_hari ?? 30));
  const { data: rows } = await ctx.supabase
    .from("absensi_pegawai")
    .select("id, foto_masuk, foto_pulang")
    .lt("tanggal", batas)
    .or("foto_masuk.neq.,foto_pulang.neq.")
    .limit(1000);
  const path = (rows ?? []).flatMap((r) => [r.foto_masuk, r.foto_pulang]).filter(Boolean);
  if (!path.length) return { ok: true, pesan: "Tidak ada swafoto yang melewati masa simpan." };
  const { error } = await supabaseAdminStorage().from("presensi").remove(path);
  if (error) return { ok: false, pesan: "Gagal menghapus berkas." };
  await ctx.supabase.from("absensi_pegawai").update({ foto_masuk: "", foto_pulang: "" }).in("id", (rows ?? []).map((r) => r.id));
  return { ok: true, pesan: `${path.length} swafoto lama dihapus permanen.` };
}
