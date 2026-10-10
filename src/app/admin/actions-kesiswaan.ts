"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekBukti, unggahPrivat } from "@/lib/admin/berkas";
import { tanggalSchema } from "@/lib/admin/absensi";
import { pesanError } from "@/lib/admin/schema";
import { kirimSegera } from "@/lib/notif/kirim";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const uuid = z.string().uuid();
const pesanDb = (e: { code?: string; message: string }) => {
  console.error("[kesiswaan]", e.code, e.message);
  return ["42501", "22023", "23514", "P0002"].includes(e.code ?? "") ? e.message : "Gagal menyimpan. Coba lagi.";
};
const segarkan = () => {
  revalidatePath("/admin/kesiswaan", "layout");
  revalidatePath("/portal/karakter");
};
const ambil = (f: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(f.get(x) ?? "")]));

async function buktiDari(ctx: NonNullable<Awaited<ReturnType<typeof aksesAksi>>>, form: FormData, folder: string) {
  const f = form.get("bukti") as File | null;
  const salah = cekBukti(f);
  if (salah) throw new Error(salah);
  return f && f.size > 0 ? unggahPrivat(ctx.supabase, ctx.akses.userId, "bukti", folder, f) : "";
}

export async function cariSiswa(q: string): Promise<{ id: string; nama: string; kelas: string | null }[]> {
  const ctx = await aksesAksi();
  if (!ctx || q.trim().length < 3) return [];
  const { data } = await ctx.supabase.rpc("cari_siswa", { q: q.slice(0, 60) });
  return (data ?? []) as { id: string; nama: string; kelas: string | null }[];
}

export async function laporPelanggaran(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({
      siswa_id: z.string().uuid("Pilih siswa dari hasil pencarian"),
      jenis_id: z.string().uuid("Pilih jenis pelanggaran"),
      tanggal: tanggalSchema,
      tempat: z.string().trim().max(120),
      kronologi: z.string().trim().min(10, "Ceritakan kronologi minimal 10 karakter").max(2000),
      saksi: z.string().trim().max(300),
    })
    .safeParse(ambil(form, "siswa_id", "jenis_id", "tanggal", "tempat", "kronologi", "saksi"));
  if (!p.success) return { ok: false, pesan: "Periksa isian laporan.", errors: pesanError(p.error) };
  let bukti_path = "";
  try {
    bukti_path = await buktiDari(ctx, form, "pelanggaran");
  } catch (e) {
    return { ok: false, pesan: (e as Error).message, errors: { bukti: (e as Error).message } };
  }
  const { error } = await ctx.supabase.from("pelanggaran_siswa").insert({ ...p.data, bukti_path });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  return { ok: true, pesan: "Laporan terkirim ke kesiswaan untuk diverifikasi. Poin baru dihitung setelah diverifikasi." };
}

export async function ajukanPrestasi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({
      siswa_id: z.string().uuid("Pilih siswa"),
      nama_kegiatan: z.string().trim().min(3, "Isi nama lomba/kegiatan").max(200),
      bidang: z.enum(["akademik", "olahraga", "seni", "keagamaan", "kepemimpinan", "lainnya"]),
      tingkat: z.enum(["sekolah", "kota", "provinsi", "nasional", "internasional"]),
      peringkat: z.enum(["juara1", "juara2", "juara3", "harapan", "finalis", "peserta"]),
      peserta: z.enum(["individu", "tim"]),
      penyelenggara: z.string().trim().max(150),
      pembina: z.string().trim().max(150),
      tanggal: tanggalSchema,
    })
    .safeParse(ambil(form, "siswa_id", "nama_kegiatan", "bidang", "tingkat", "peringkat", "peserta", "penyelenggara", "pembina", "tanggal"));
  if (!p.success) return { ok: false, pesan: "Periksa isian prestasi.", errors: pesanError(p.error) };
  let bukti_path = "";
  try {
    bukti_path = await buktiDari(ctx, form, "prestasi");
  } catch (e) {
    return { ok: false, pesan: (e as Error).message, errors: { bukti: (e as Error).message } };
  }
  const { error } = await ctx.supabase.from("prestasi_siswa").insert({ ...p.data, bukti_path });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  return { ok: true, pesan: "Prestasi terkirim. Kesiswaan akan memverifikasi berdasarkan bukti (piagam/sertifikat)." };
}

export async function verifikasi(form: FormData) {
  const ctx = await aksesAksi("kesiswaan.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const tipe = String(form.get("tipe"));
  const id = uuid.safeParse(String(form.get("id")));
  const sah = String(form.get("keputusan")) === "sah";
  const catatan = String(form.get("catatan") ?? "").slice(0, 500);
  if (!id.success || !["pelanggaran", "prestasi"].includes(tipe)) redirect("/admin/kesiswaan?pesan=gagal");
  if (!sah && catatan.trim().length < 3) redirect("/admin/kesiswaan?pesan=perlu-catatan");
  const { error } = await ctx.supabase.rpc(tipe === "pelanggaran" ? "verifikasi_pelanggaran" : "verifikasi_prestasi", { p_id: id.data, p_sah: sah, p_catatan: catatan });
  if (error) console.error("[kesiswaan] verifikasi:", error.message);
  kirimSegera();
  segarkan();
  redirect(`/admin/kesiswaan?pesan=${error ? "gagal" : "tersimpan"}`);
}

export async function batalkanPelanggaran(form: FormData) {
  const ctx = await aksesAksi("kesiswaan.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const sid = String(form.get("siswa_id") ?? "");
  if (!id.success) redirect("/admin/kesiswaan?pesan=gagal");
  const { error } = await ctx.supabase.rpc("batalkan_pelanggaran", { p_id: id.data, p_catatan: String(form.get("catatan") ?? "") });
  segarkan();
  redirect(`/admin/kesiswaan/siswa/${uuid.safeParse(sid).success ? sid : ""}?pesan=${error ? "gagal" : "tersimpan"}`);
}

export async function simpanPembinaan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      siswa_id: uuid,
      jenis: z.enum(["bimbingan_wali", "pemanggilan_ortu", "kunjungan_rumah", "perjanjian", "tugas_sosial", "skorsing", "lainnya"]),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      uraian: z.string().trim().min(5, "Minimal 5 karakter").max(2000),
      tindak_lanjut: z.string().trim().max(1000),
      status: z.enum(["direncanakan", "selesai"]),
    })
    .safeParse(ambil(form, "siswa_id", "jenis", "tanggal", "uraian", "tindak_lanjut", "status"));
  if (!p.success) return { ok: false, pesan: "Periksa isian pembinaan.", errors: pesanError(p.error) };
  const { error } = uuid.safeParse(id).success
    ? await ctx.supabase.from("pembinaan_siswa").update(p.data).eq("id", id)
    : await ctx.supabase.from("pembinaan_siswa").insert(p.data);
  if (error) return { ok: false, pesan: error.code === "42501" ? "Hanya wali kelas, kesiswaan, atau BK yang dapat mencatat pembinaan." : pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Catatan pembinaan tersimpan." };
}

export async function rujukBk(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi();
  if (!ctx) return TANPA_AKSES;
  const p = z.object({ siswa_id: uuid, alasan: z.string().trim().min(10, "Jelaskan singkat (min. 10 karakter)").max(500) }).safeParse(ambil(form, "siswa_id", "alasan"));
  if (!p.success) return { ok: false, pesan: "Periksa isian rujukan.", errors: pesanError(p.error) };
  const { error } = await ctx.supabase.from("rujukan_bk").insert(p.data);
  if (error) return { ok: false, pesan: error.code === "42501" ? "Hanya wali kelas/kesiswaan yang dapat merujuk." : pesanDb(error) };
  kirimSegera();
  segarkan();
  return { ok: true, pesan: "Rujukan terkirim ke guru BK. Isi konseling bersifat rahasia; Anda akan melihat statusnya saja." };
}

export async function tanganiRujukan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.rujukan");
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({ id: uuid, status: z.enum(["baru", "ditangani", "selesai"]), catatan_bk: z.string().trim().max(2000) })
    .safeParse(ambil(form, "id", "status", "catatan_bk"));
  if (!p.success) return { ok: false, pesan: "Periksa isian." };
  const { id, ...isi } = p.data;
  const { error } = await ctx.supabase.from("rujukan_bk").update(isi).eq("id", id);
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  revalidatePath("/admin/rujukan-bk");
  return { ok: true, pesan: "Rujukan diperbarui." };
}

/* ---------------------- Pengaturan poin ---------------------- */

export async function simpanJenisPelanggaran(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("kesiswaan.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kode: z.string().trim().max(10),
      nama: z.string().trim().min(3).max(150),
      kategori: z.enum(["ringan", "sedang", "berat"]),
      poin: z.coerce.number().int().min(1, "1–300").max(300, "1–300"),
    })
    .safeParse(ambil(form, "kode", "nama", "kategori", "poin"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const aktif = form.get("aktif") !== "off";
  const { error } = uuid.safeParse(id).success
    ? await ctx.supabase.rpc("ubah_jenis_pelanggaran", { p_id: id, p_nama: p.data.nama, p_kategori: p.data.kategori, p_poin: p.data.poin, p_aktif: aktif })
    : await ctx.supabase.from("jenis_pelanggaran").insert(p.data);
  if (error) return { ok: false, pesan: error.code === "23505" ? "Nama pelanggaran sudah ada." : pesanDb(error) };
  revalidatePath("/admin/kesiswaan/pengaturan");
  redirect(`/admin/kesiswaan/pengaturan?pesan=${uuid.safeParse(id).success ? (aktif ? "versi-baru" : "jenis-nonaktif") : "tersimpan"}`);
}

export async function simpanAturanPoin(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("kesiswaan.kelola");
  if (!ctx) return TANPA_AKSES;
  const prestasi: { tingkat: string; peringkat: string; poin: number }[] = [];
  for (const [k, v] of form.entries()) {
    const m = k.match(/^pp_(\w+)_(\w+)$/);
    if (!m) continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 500) return { ok: false, pesan: "Poin prestasi harus angka 0–500." };
    prestasi.push({ tingkat: m[1], peringkat: m[2], poin: n });
  }
  const tindakan: { ambang: number; tindakan: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = String(form.get(`ambang_${i}`) ?? "").trim();
    const t = String(form.get(`tindakan_${i}`) ?? "").trim();
    if (!a && !t) continue;
    const n = Number(a);
    if (!Number.isInteger(n) || n < 1 || n > 1000 || t.length < 3) return { ok: false, pesan: `Baris tindakan ${i + 1}: ambang 1–1000 dan tindakan wajib diisi.` };
    tindakan.push({ ambang: n, tindakan: t.slice(0, 100) });
  }
  if (new Set(tindakan.map((t) => t.ambang)).size !== tindakan.length) return { ok: false, pesan: "Ambang poin tidak boleh sama." };
  if (prestasi.length) {
    const { error } = await ctx.supabase.from("aturan_poin_prestasi").upsert(prestasi);
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  const { data: lama } = await ctx.supabase.from("aturan_tindakan_poin").select("ambang");
  const hapus = (lama ?? []).map((x) => x.ambang).filter((a) => !tindakan.some((t) => t.ambang === a));
  if (hapus.length) await ctx.supabase.from("aturan_tindakan_poin").delete().in("ambang", hapus);
  if (tindakan.length) {
    const { error } = await ctx.supabase.from("aturan_tindakan_poin").upsert(tindakan);
    if (error) return { ok: false, pesan: pesanDb(error) };
  }
  const { error } = await ctx.supabase.from("pengaturan_kesiswaan").update({ prestasi_kurangi_poin: form.get("prestasi_kurangi_poin") === "on", updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/kesiswaan", "layout");
  return { ok: true, pesan: "Aturan poin tersimpan. Poin prestasi baru berlaku untuk pengajuan berikutnya." };
}
