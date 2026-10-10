"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { pesanError, uuid } from "@/lib/admin/schema";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const https = z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/, "Harus diawali https://").max(500)]);
const segarkan = () => {
  revalidatePath("/admin/perpus", "layout");
  revalidatePath("/perpustakaan");
  revalidatePath("/portal/perpus");
};
function pesanDb(e: { code?: string; message: string }) {
  console.error("[perpus]", e.code, e.message);
  if (["22023", "23P01"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return "Akses ditolak.";
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat (mis. format ISBN).";
  return "Gagal menyimpan. Coba lagi.";
}

/* ============================ Katalog ============================ */

export async function simpanBuku(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      judul: z.string().trim().min(1, "Judul wajib").max(250),
      pengarang: z.string().trim().max(250),
      penerbit: z.string().trim().max(150),
      tahun: z.union([z.literal(""), z.coerce.number().int().min(1800).max(2100)]),
      isbn: z.string().trim().regex(/^[0-9Xx-]{0,20}$/, "ISBN hanya angka, X, dan tanda hubung"),
      kategori: z.string().trim().max(60),
      nomor_panggil: z.string().trim().max(40),
      rak: z.string().trim().max(40),
      sinopsis: z.string().trim().max(3000),
      sampul_url: https,
      tautan_digital: https,
      tampil_publik: z.boolean(),
      rekomendasi: z.boolean(),
      lisensi: z.string().trim().max(120),
      akses_digital: z.enum(["publik", "warga"]),
      jumlah: z.coerce.number().int().min(0).max(200).default(0),
      sumber: z.string().trim().max(60),
    })
    .refine((d) => !d.tautan_digital || d.lisensi.length >= 2, { path: ["lisensi"], message: "Isi dasar lisensi untuk tautan digital (mis. Buku Kemendikbud — terbuka)" })
    .safeParse({
      ...ambil(form, "judul", "pengarang", "penerbit", "tahun", "isbn", "kategori", "nomor_panggil", "rak", "sinopsis", "sampul_url", "tautan_digital", "sumber", "lisensi"),
      akses_digital: String(form.get("akses_digital") || "warga"), jumlah: String(form.get("jumlah") || "0"),
      tampil_publik: form.get("tampil_publik") === "on", rekomendasi: form.get("rekomendasi") === "on",
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { jumlah, sumber, ...d } = p.data;
  const baris = { ...d, tahun: d.tahun === "" ? null : d.tahun, updated_at: new Date().toISOString() };
  const r = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("buku").update(baris).eq("id", id).select("id").single()
    : await ctx.supabase.from("buku").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  if (!id && jumlah > 0) {
    const e = await ctx.supabase.from("eksemplar").insert(Array.from({ length: jumlah }, () => ({ buku_id: r.data.id, sumber })));
    if (e.error) return { ok: false, pesan: pesanDb(e.error) };
  }
  segarkan();
  if (!id) redirect(`/admin/perpus/buku/${r.data.id}?pesan=tersimpan`);
  return { ok: true, pesan: "Data buku tersimpan." };
}

export async function tambahEksemplar(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("buku_id")));
  const n = z.coerce.number().int().min(1, "1–200").max(200, "1–200").safeParse(form.get("jumlah"));
  if (!id.success || !n.success) return { ok: false, pesan: "Isi jumlah 1–200.", errors: { jumlah: "1–200" } };
  const sumber = String(form.get("sumber") ?? "").slice(0, 60);
  const pojok = uuid.safeParse(String(form.get("pojok_id") ?? ""));
  const { error } = await ctx.supabase.from("eksemplar").insert(Array.from({ length: n.data }, () => ({ buku_id: id.data, sumber, pojok_id: pojok.success ? pojok.data : null })));
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: `${n.data} eksemplar ditambahkan.` };
}

export async function ubahEksemplar(form: FormData) {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const buku = String(form.get("buku_id") ?? "");
  const status = z.enum(["tersedia", "rusak", "hilang", "dihapus"]).safeParse(String(form.get("status")));
  let galat = "";
  if (id.success && status.success) {
    const pj = form.has("pojok_id") ? uuid.safeParse(String(form.get("pojok_id"))) : null;
    const ubah: { status: string; pojok_id?: string | null } = { status: status.data };
    if (pj) ubah.pojok_id = pj.success ? pj.data : null;
    const { error } = await ctx.supabase.from("eksemplar").update(ubah).eq("id", id.data);
    if (error) galat = error.message;
  }
  segarkan();
  redirect(`/admin/perpus/buku/${uuid.safeParse(buku).success ? buku : ""}?${galat ? `galat=${encodeURIComponent(galat)}` : "pesan=tersimpan"}`);
}

/* ============================ Sirkulasi ============================ */

export async function pinjamBuku(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const kode = String(form.get("kode") ?? "").trim();
  const anggota = String(form.get("anggota") ?? "").trim();
  if (!kode) return { ok: false, pesan: "Pindai / ketik kode buku.", errors: { kode: "Wajib" } };
  if (!anggota) return { ok: false, pesan: "Isi NISN siswa atau NIP guru.", errors: { anggota: "Wajib" } };
  const { data, error } = await ctx.supabase.rpc("pinjam_buku", { p_kode: kode, p_anggota: anggota });
  if (error) return { ok: false, pesan: pesanDb(error) };
  const r = (data as { judul: string; peminjam: string; jatuh_tempo: string }[])[0];
  segarkan();
  return { ok: true, pesan: `✓ “${r.judul}” dipinjam ${r.peminjam}. Kembali paling lambat ${new Date(r.jatuh_tempo + "T00:00:00Z").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}.` };
}

export async function kembalikanBuku(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const kode = String(form.get("kode") ?? "").trim();
  if (!kode) return { ok: false, pesan: "Pindai / ketik kode buku.", errors: { kode: "Wajib" } };
  const kondisi = z.enum(["tersedia", "rusak", "hilang"]).catch("tersedia").parse(String(form.get("kondisi") ?? "tersedia"));
  const { data, error } = await ctx.supabase.rpc("kembalikan_buku", { p_kode: kode, p_kondisi: kondisi, p_lunas: form.get("lunas") === "on" });
  if (error) return { ok: false, pesan: pesanDb(error) };
  const r = (data as { judul: string; peminjam: string; terlambat: number; denda: number }[])[0];
  segarkan();
  return { ok: true, pesan: `✓ “${r.judul}” dikembalikan oleh ${r.peminjam}.${r.terlambat ? ` Terlambat ${r.terlambat} hari${Number(r.denda) ? `, denda Rp${Number(r.denda).toLocaleString("id-ID")}` : ""}.` : ""}` };
}

export async function perpanjangBuku(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const kembali = String(form.get("kembali") ?? "/portal/perpus");
  const tujuan = /^\/(portal|admin)\/perpus/.test(kembali) ? kembali : "/portal/perpus";
  if (!id.success) redirect(tujuan);
  const { error } = await supabase.rpc("perpanjang_buku", { p_id: id.data });
  segarkan();
  redirect(`${tujuan}?${error ? `galat=${encodeURIComponent(error.message.slice(0, 200))}` : "pesan=diperpanjang"}`);
}

export async function lunasiDenda(form: FormData) {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("pinjaman_buku").update({ denda_lunas: true }).eq("id", id.data);
  segarkan();
  redirect("/admin/perpus/laporan?pesan=tersimpan#denda");
}

export async function simpanPengaturanPerpus(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const p = z
    .object({ lama_pinjam: z.coerce.number().int().min(1).max(60), maks_pinjam: z.coerce.number().int().min(1).max(20), maks_perpanjang: z.coerce.number().int().min(0).max(5), denda_per_hari: z.coerce.number().min(0).max(100000) })
    .safeParse(ambil(form, "lama_pinjam", "maks_pinjam", "maks_perpanjang", "denda_per_hari"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await ctx.supabase.from("pengaturan_perpus").update(p.data).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Aturan peminjaman tersimpan." };
}

export async function catatKunjungan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("perpus.kelola");
  if (!ctx) return TANPA_AKSES;
  const kunci = String(form.get("anggota") ?? "").trim();
  const keperluan = z.enum(["membaca", "meminjam", "mengerjakan_tugas", "lainnya"]).catch("membaca").parse(String(form.get("keperluan")));
  if (!kunci) return { ok: false, pesan: "Isi NISN / NIP / nama tamu.", errors: { anggota: "Wajib" } };
  const { data: nama, error } = await ctx.supabase.rpc("catat_kunjungan_perpus", { p_kunci: kunci, p_keperluan: keperluan });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/perpus", "layout");
  return { ok: true, pesan: `Kunjungan tercatat: ${nama}.` };
}

/* ============================ Reservasi ============================ */

const kembaliAman = (form: FormData, awal: string) => {
  const k = String(form.get("kembali") ?? "");
  return /^\/(portal\/perpus|admin\/perpus|perpustakaan)(\/[0-9a-f-]{36})?$/.test(k) ? k : awal;
};

export async function pesanBuku(form: FormData) {
  const { supabase } = await getAkses();
  const kembali = kembaliAman(form, "/perpustakaan");
  if (!supabase) redirect("/masuk");
  const id = uuid.safeParse(String(form.get("buku_id")));
  if (!id.success) redirect(kembali);
  const { data, error } = await supabase.rpc("pesan_buku", { p_buku: id.data });
  segarkan();
  redirect(`${kembali}?${error ? `galat=${encodeURIComponent(error.message.slice(0, 200))}` : `pesan=${data === "siap" ? "pesanan-siap" : "pesanan-antre"}`}`);
}

export async function batalPesan(form: FormData) {
  const { supabase } = await getAkses();
  const kembali = kembaliAman(form, "/portal/perpus");
  if (!supabase) redirect("/masuk");
  const id = uuid.safeParse(String(form.get("id")));
  const r = id.success ? await supabase.rpc("batal_pesan", { p_id: id.data }) : { error: { message: "Data tidak valid" } };
  segarkan();
  redirect(`${kembali}?${r.error ? `galat=${encodeURIComponent(r.error.message.slice(0, 200))}` : "pesan=pesanan-batal"}`);
}

/* ============================ Literasi ============================ */

export async function tulisJurnal(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const { data: sid } = await supabase.rpc("siswa_login");
  if (!sid) return { ok: false, pesan: "Jurnal baca diisi oleh siswa dari akunnya sendiri." };
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      judul: z.string().trim().min(1, "Judul buku wajib").max(250),
      pengarang: z.string().trim().max(250),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      halaman: z.coerce.number().int().min(0).max(2000),
      menit: z.coerce.number().int().min(0).max(600),
      ringkasan: z.string().trim().min(30, "Ceritakan isi/kesanmu minimal 30 karakter").max(3000),
    })
    .refine((d) => d.halaman > 0 || d.menit > 0, { path: ["menit"], message: "Isi jumlah halaman atau menit membaca" })
    .safeParse({ ...ambil(form, "judul", "pengarang", "tanggal", "ringkasan"), halaman: String(form.get("halaman") || "0"), menit: String(form.get("menit") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const r = id && uuid.safeParse(id).success
    ? await supabase.from("jurnal_baca").update(p.data).eq("id", id)
    : await supabase.from("jurnal_baca").insert({ ...p.data, siswa_id: sid });
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  revalidatePath("/portal/perpus");
  revalidatePath("/admin/perpus/literasi");
  return { ok: true, pesan: "Jurnal baca tersimpan dan menunggu diperiksa pembina literasi." };
}

const PEMBINA = ["perpus.kelola", "literasi.kelola"] as const;
async function aksesPembina() {
  for (const i of PEMBINA) { const c = await aksesAksi(i); if (c) return c; }
  return null;
}

export async function periksaJurnal(form: FormData) {
  const ctx = await aksesPembina();
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const status = z.enum(["disetujui", "revisi"]).safeParse(String(form.get("status")));
  const catatan = String(form.get("catatan") ?? "").trim().slice(0, 500);
  if (id.success && status.success) await ctx.supabase.from("jurnal_baca").update({ status: status.data, catatan_pembina: catatan }).eq("id", id.data);
  revalidatePath("/admin/perpus/literasi");
  redirect("/admin/perpus/literasi?pesan=tersimpan");
}

export async function moderasiUlasan(form: FormData) {
  const ctx = await aksesPembina();
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const status = z.enum(["tampil", "ditolak"]).safeParse(String(form.get("status")));
  if (id.success && status.success) await ctx.supabase.from("ulasan_buku").update({ status: status.data }).eq("id", id.data);
  segarkan();
  redirect("/admin/perpus/literasi?tab=ulasan&pesan=tersimpan");
}

export async function simpanTantangan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesPembina();
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
  const p = z
    .object({
      judul: z.string().trim().min(3, "Judul wajib").max(150),
      deskripsi: z.string().trim().max(2000),
      mulai: tgl, selesai: tgl,
      target_buku: z.coerce.number().int().min(0).max(100),
      target_menit: z.coerce.number().int().min(0).max(100000),
    })
    .refine((d) => d.selesai >= d.mulai, { path: ["selesai"], message: "Harus setelah tanggal mulai" })
    .refine((d) => d.target_buku > 0 || d.target_menit > 0, { path: ["target_buku"], message: "Isi target buku atau menit" })
    .safeParse({ ...ambil(form, "judul", "deskripsi", "mulai", "selesai"), target_buku: String(form.get("target_buku") || "0"), target_menit: String(form.get("target_menit") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const r = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("tantangan_literasi").update(p.data).eq("id", id)
    : await ctx.supabase.from("tantangan_literasi").insert(p.data);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  revalidatePath("/admin/perpus/literasi");
  revalidatePath("/portal/perpus");
  redirect("/admin/perpus/literasi?tab=tantangan&pesan=tersimpan");
}

export async function arsipTantangan(form: FormData) {
  const ctx = await aksesPembina();
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("tantangan_literasi").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath("/admin/perpus/literasi");
  redirect("/admin/perpus/literasi?tab=tantangan&pesan=diarsipkan");
}

export async function tetapkanDuta(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesPembina();
  if (!ctx) return TANPA_AKSES;
  const nisn = String(form.get("nisn") ?? "").trim();
  if (!/^\d{10}$/.test(nisn)) return { ok: false, pesan: "NISN 10 digit.", errors: { nisn: "NISN 10 digit" } };
  const { data, error } = await ctx.supabase.rpc("tetapkan_duta", { p_nisn: nisn, p_peran: String(form.get("peran") ?? "").slice(0, 60) });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/perpus/literasi");
  return { ok: true, pesan: `${data} ditetapkan sebagai duta literasi.` };
}

export async function hapusDuta(form: FormData) {
  const ctx = await aksesPembina();
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("duta_literasi").delete().eq("id", id.data);
  revalidatePath("/admin/perpus/literasi");
  redirect("/admin/perpus/literasi?tab=duta&pesan=tersimpan");
}

export async function ulasBuku(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return { ok: false, pesan: "Masuk dulu untuk menulis ulasan." };
  const id = uuid.safeParse(String(form.get("buku_id")));
  const p = z
    .object({ rating: z.coerce.number().int().min(1, "Pilih bintang").max(5), isi: z.string().trim().min(10, "Minimal 10 karakter").max(1000) })
    .safeParse({ rating: String(form.get("rating") || "0"), isi: String(form.get("isi") ?? "") });
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.rpc("ulas_buku", { p_buku: id.data, p_rating: p.data.rating, p_isi: p.data.isi });
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/perpus/literasi");
  return { ok: true, pesan: "Terima kasih! Ulasan tampil setelah diperiksa pustakawan." };
}

/* ============================ Pojok baca ============================ */

export async function simpanPojok(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesPembina();
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      nama: z.string().trim().min(2, "Nama pojok baca wajib").max(100),
      lokasi: z.string().trim().max(150),
      kelas_id: z.union([z.literal(""), uuid]),
      penanggung_jawab_id: z.union([z.literal(""), uuid]),
      deskripsi: z.string().trim().max(1000),
      aktif: z.boolean(),
    })
    .safeParse({ ...ambil(form, "nama", "lokasi", "kelas_id", "penanggung_jawab_id", "deskripsi"), aktif: form.get("aktif") === "on" });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const baris = { ...p.data, kelas_id: p.data.kelas_id || null, penanggung_jawab_id: p.data.penanggung_jawab_id || null, updated_at: new Date().toISOString() };
  const r = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("pojok_baca").update(baris).eq("id", id)
    : await ctx.supabase.from("pojok_baca").insert(baris);
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  revalidatePath("/admin/perpus/pojok");
  redirect("/admin/perpus/pojok?pesan=tersimpan");
}

export async function catatKegiatanPojok(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const p = z
    .object({
      pojok_id: uuid,
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
      kegiatan: z.string().trim().min(3, "Isi kegiatan").max(300),
      peserta: z.coerce.number().int().min(0).max(2000),
      tautan_dokumentasi: https,
    })
    .safeParse({ ...ambil(form, "pojok_id", "tanggal", "kegiatan", "tautan_dokumentasi"), peserta: String(form.get("peserta") || "0") });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const { error } = await supabase.from("kegiatan_pojok").insert(p.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  revalidatePath("/admin/perpus/pojok");
  return { ok: true, pesan: "Kegiatan pojok baca tercatat." };
}
