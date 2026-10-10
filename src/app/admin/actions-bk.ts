"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import { bkSiap, enkripsi, sidik } from "@/lib/bk-kripto";
import { dariLokalWIB } from "@/lib/lms";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
function pesanDb(e: { code?: string; message: string }) {
  console.error("[bk]", e.code); // isi pesan galat tidak dicatat (bisa memuat data sensitif)
  if (["22023", "23P01"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return "Akses ditolak.";
  return "Gagal menyimpan. Coba lagi.";
}
const segarkan = (kasus?: string) => {
  revalidatePath("/admin/bk", "layout");
  if (kasus) revalidatePath(`/admin/bk/kasus/${kasus}`);
};
/** Teks sensitif hanya dienkripsi ulang bila benar-benar berubah (sidik jari teks awal dikirim dari formulir) */
function teksRahasia(form: FormData, nama: string, maks: number): { ubah: false } | { ubah: true; nilai: string } | { galat: string } {
  if (!form.has(nama)) return { ubah: false };
  const t = String(form.get(nama) ?? "").trim();
  if (t.length > maks) return { galat: `Maksimal ${maks} karakter` };
  if (sidik(t) === String(form.get(`${nama}_sidik`) ?? "")) return { ubah: false };
  if (t && !bkSiap) return { galat: "Kunci enkripsi BK (BK_KUNCI) belum dipasang — catatan rahasia belum bisa disimpan." };
  return { ubah: true, nilai: enkripsi(t) };
}

/* ============================ Portal: ajukan layanan ============================ */

export async function ajukanKonseling(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const p = z
    .object({
      siswa_id: uuid,
      kategori: z.string().regex(/^[a-z_]{2,30}$/, "Pilih kategori"),
      topik: z.string().trim().min(3, "Tulis topik singkat").max(150),
      pesan: z.string().trim().max(3000),
      waktu: z.string().trim().max(150),
      mendesak: z.boolean(),
    })
    .safeParse({ ...ambil(form, "siswa_id", "kategori", "topik", "pesan", "waktu"), mendesak: form.get("mendesak") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  if (p.data.pesan && !bkSiap) return { ok: false, pesan: "Kolom cerita rahasia belum aktif. Kosongkan kolom itu; ceritakan langsung kepada guru BK.", errors: { pesan: "Kosongkan" } };
  const { error } = await supabase.rpc("ajukan_konseling", {
    p_siswa: p.data.siswa_id, p_kategori: p.data.kategori, p_topik: p.data.topik, p_pesan_enc: p.data.pesan ? enkripsi(p.data.pesan) : "",
    p_mendesak: p.data.mendesak, p_waktu: p.data.waktu,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/portal/bk");
  return { ok: true, pesan: "Permintaan terkirim. Guru BK akan menghubungi Anda; pantau statusnya di halaman ini." };
}

/* ============================ BK: permintaan ============================ */

export async function prosesPermintaan(form: FormData) {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) redirect("/admin/bk");
  const aksi = String(form.get("aksi"));
  const catatan = String(form.get("catatan") ?? "").trim().slice(0, 500);
  const { data: r } = await ctx.supabase.from("permintaan_konseling").select("id, siswa_id, kategori, prioritas, kasus_id").eq("id", id.data).single();
  if (!r) redirect("/admin/bk");
  if (aksi === "terima") {
    let kasus = String(form.get("kasus_id") ?? "");
    if (!uuid.safeParse(kasus).success) {
      const { data: k, error } = await ctx.supabase.from("kasus_bk")
        .insert({ siswa_id: r.siswa_id, kategori: r.kategori, prioritas: r.prioritas, asal: "permintaan" }).select("id").single();
      if (error) redirect(`/admin/bk/permintaan/${id.data}?galat=${encodeURIComponent(pesanDb(error))}`);
      kasus = k.id;
    }
    await ctx.supabase.from("permintaan_konseling").update({ status: "diterima", kasus_id: kasus, catatan_untuk_pemohon: catatan }).eq("id", id.data);
    segarkan(kasus);
    redirect(`/admin/bk/kasus/${kasus}?pesan=tersimpan`);
  }
  const status = aksi === "tolak" ? "ditolak" : aksi === "selesai" ? "selesai" : aksi === "dijadwalkan" ? "dijadwalkan" : null;
  await ctx.supabase.from("permintaan_konseling").update(status ? { status, catatan_untuk_pemohon: catatan } : { catatan_untuk_pemohon: catatan }).eq("id", id.data);
  segarkan();
  redirect(r.kasus_id ? `/admin/bk/kasus/${r.kasus_id}?pesan=tersimpan` : "/admin/bk?pesan=tersimpan");
}

/* ============================ BK: kasus ============================ */

export async function buatKasus(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({
      siswa_id: uuid,
      kategori: z.string().regex(/^[a-z_]{2,30}$/),
      prioritas: z.enum(["rendah", "sedang", "tinggi", "darurat"]),
      risiko: z.enum(["rendah", "sedang", "tinggi"]),
      asal: z.enum(["permintaan", "rujukan_guru", "pengaduan", "inisiatif_bk"]),
      rujukan_id: z.union([z.literal(""), uuid]),
    })
    .safeParse(ambil(form, "siswa_id", "kategori", "prioritas", "risiko", "asal", "rujukan_id"));
  if (!p.success) return { ok: false, pesan: "Pilih siswa dan lengkapi isian.", errors: pesanError(p.error) };
  const as = teksRahasia(form, "asesmen", 5000);
  if ("galat" in as) return { ok: false, pesan: as.galat, errors: { asesmen: as.galat } };
  const { data, error } = await ctx.supabase.from("kasus_bk")
    .insert({ ...p.data, rujukan_id: p.data.rujukan_id || null, asesmen_enc: as.ubah ? as.nilai : "" }).select("id").single();
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect(`/admin/bk/kasus/${data.id}?pesan=tersimpan`);
}

export async function simpanKasus(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  const p = z
    .object({
      kategori: z.string().regex(/^[a-z_]{2,30}$/),
      prioritas: z.enum(["rendah", "sedang", "tinggi", "darurat"]),
      risiko: z.enum(["rendah", "sedang", "tinggi"]),
      status: z.enum(["aktif", "pemantauan", "selesai", "dirujuk_luar"]),
      konselor_id: z.union([z.literal(""), uuid]),
      saran_wali: z.string().trim().max(1000),
    })
    .safeParse(ambil(form, "kategori", "prioritas", "risiko", "status", "konselor_id", "saran_wali"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const as = teksRahasia(form, "asesmen", 5000);
  const rk = teksRahasia(form, "ringkasan", 3000);
  if ("galat" in as) return { ok: false, pesan: as.galat, errors: { asesmen: as.galat } };
  if ("galat" in rk) return { ok: false, pesan: rk.galat, errors: { ringkasan: rk.galat } };
  if (["selesai", "dirujuk_luar"].includes(p.data.status) && !rk.ubah && !String(form.get("ringkasan") ?? "").trim())
    return { ok: false, pesan: "Tulis ringkasan penutupan sebelum menutup kasus.", errors: { ringkasan: "Wajib saat menutup" } };
  const baris: Record<string, unknown> = { ...p.data, konselor_id: p.data.konselor_id || null };
  if (as.ubah) baris.asesmen_enc = as.nilai;
  if (rk.ubah) baris.ringkasan_enc = rk.nilai;
  const { error } = await ctx.supabase.from("kasus_bk").update(baris).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan(id.data);
  return { ok: true, pesan: "Kasus tersimpan." };
}

export async function simpanSesi(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kasus_id: uuid,
      mulai: z.string().min(1, "Isi tanggal & jam"),
      durasi_menit: z.coerce.number().int().min(10).max(240),
      jenis: z.enum(["individu", "kelompok", "konsultasi_ortu", "kunjungan_rumah"]),
      mode: z.enum(["tatap_muka", "daring", "telepon"]),
      tempat: z.string().trim().max(100),
      status: z.enum(["terjadwal", "selesai", "batal", "tidak_hadir"]),
    })
    .safeParse({ ...ambil(form, "kasus_id", "mulai", "jenis", "mode", "tempat", "status"), durasi_menit: String(form.get("durasi_menit") || "45") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const mulai = dariLokalWIB(p.data.mulai);
  if (!mulai) return { ok: false, pesan: "Tanggal & jam tidak valid.", errors: { mulai: "Tidak valid" } };
  const ct = teksRahasia(form, "catatan", 5000);
  if ("galat" in ct) return { ok: false, pesan: ct.galat, errors: { catatan: ct.galat } };
  const baris: Record<string, unknown> = { ...p.data, mulai, tempat: p.data.tempat || "Ruang BK" };
  if (ct.ubah) baris.catatan_enc = ct.nilai;
  const r = uuid.safeParse(id).success
    ? await ctx.supabase.from("sesi_konseling").update(baris).eq("id", id)
    : await ctx.supabase.from("sesi_konseling").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  if (!id) await ctx.supabase.from("permintaan_konseling").update({ status: "dijadwalkan" }).eq("kasus_id", p.data.kasus_id).eq("status", "diterima");
  segarkan(p.data.kasus_id);
  return { ok: true, pesan: id ? "Sesi tersimpan." : "Sesi dijadwalkan. Siswa/orang tua diberi tahu di aplikasi (tanpa isi masalah)." };
}

export async function simpanTindakLanjut(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kasus_id: uuid,
      rencana: z.string().trim().min(3, "Isi rencana").max(500),
      pihak: z.string().trim().max(100),
      tenggat: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      status: z.enum(["rencana", "berjalan", "selesai", "batal"]),
      hasil: z.string().trim().max(1000),
    })
    .safeParse(ambil(form, "kasus_id", "rencana", "pihak", "tenggat", "status", "hasil"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, tenggat: p.data.tenggat || null, pihak: p.data.pihak || "BK", updated_at: new Date().toISOString() };
  const r = uuid.safeParse(id).success
    ? await ctx.supabase.from("tindak_lanjut_bk").update(baris).eq("id", id)
    : await ctx.supabase.from("tindak_lanjut_bk").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(p.data.kasus_id);
  return { ok: true, pesan: "Tindak lanjut tersimpan." };
}

export async function simpanRujukanLuar(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      kasus_id: uuid,
      lembaga: z.string().trim().min(2, "Isi nama lembaga").max(150),
      jenis: z.enum(["psikolog", "puskesmas", "rumah_sakit", "uptd_ppa", "kepolisian", "lainnya"]),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      alasan: z.string().trim().max(500),
      hasil: z.string().trim().max(1000),
      status: z.enum(["diajukan", "diterima", "selesai"]),
    })
    .safeParse(ambil(form, "kasus_id", "lembaga", "jenis", "tanggal", "alasan", "hasil", "status"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const r = uuid.safeParse(id).success
    ? await ctx.supabase.from("rujukan_eksternal_bk").update(p.data).eq("id", id)
    : await ctx.supabase.from("rujukan_eksternal_bk").insert(p.data);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan(p.data.kasus_id);
  return { ok: true, pesan: "Rujukan tersimpan." };
}

export async function simpanPengaturanBk(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("bk.konseling");
  if (!ctx) return TANPA_AKSES;
  const n = z.coerce.number().int().min(1).max(10).safeParse(form.get("retensi_tahun"));
  if (!n.success) return { ok: false, pesan: "Retensi 1–10 tahun.", errors: { retensi_tahun: "1–10" } };
  const { error } = await ctx.supabase.from("pengaturan_bk").update({ retensi_tahun: n.data }).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Masa simpan tersimpan (berlaku untuk kasus yang ditutup berikutnya)." };
}
