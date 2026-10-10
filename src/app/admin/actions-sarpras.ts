"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi, getAkses } from "@/lib/admin/auth";
import { cekBukti, unggahPrivat } from "@/lib/admin/berkas";
import { pesanError, uuid } from "@/lib/admin/schema";
import { dariLokalWIB } from "@/lib/lms";
import { kirimSegera } from "@/lib/notif/kirim";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const ambil = (form: FormData, ...k: string[]) => Object.fromEntries(k.map((x) => [x, String(form.get(x) ?? "")]));
const opsiUuid = z.union([z.literal(""), uuid]);
const segarkan = () => revalidatePath("/admin/sarpras", "layout");

function pesanDb(e: { code?: string; message: string }) {
  console.error("[sarpras]", e.code, e.message);
  if (["22023", "23P01"].includes(e.code ?? "")) return e.message;
  if (e.code === "42501") return /row-level/.test(e.message) ? "Akses ditolak." : e.message;
  if (e.code === "23514") return "Ada isian yang tidak memenuhi syarat.";
  if (e.code === "23505") return "Kode inventaris sudah dipakai.";
  return "Gagal menyimpan. Coba lagi.";
}

async function fotoDari(form: FormData, supabase: NonNullable<Awaited<ReturnType<typeof getAkses>>["supabase"]>, userId: string, folder: string) {
  const f = form.get("foto") as File | null;
  if (!f || f.size === 0) return { path: "" };
  const salah = cekBukti(f);
  if (salah || f.type === "application/pdf") return { salah: salah ?? "Foto harus JPG/PNG/WEBP" };
  try {
    return { path: await unggahPrivat(supabase, userId, "sarpras", folder, f) };
  } catch (e) {
    return { salah: (e as Error).message };
  }
}

/* ============================ Inventaris ============================ */

export async function simpanBarang(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("sarpras.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(150),
      kategori_id: uuid,
      merk: z.string().trim().max(100),
      spesifikasi: z.string().trim().max(1000),
      ruang_id: opsiUuid,
      jumlah: z.coerce.number().int().min(1, "Minimal 1").max(100000),
      satuan: z.string().trim().min(1).max(20),
      kondisi: z.enum(["baik", "rusak_ringan", "rusak_berat", "hilang"]),
      sumber_dana: z.string().trim().max(60),
      tahun_perolehan: z.union([z.literal(""), z.coerce.number().int().min(1950).max(2100)]),
      harga: z.union([z.literal(""), z.coerce.number().min(0).max(1e12)]),
      bisa_dipinjam: z.boolean(),
      keterangan: z.string().trim().max(1000),
    })
    .safeParse({
      ...ambil(form, "nama", "kategori_id", "merk", "spesifikasi", "ruang_id", "jumlah", "satuan", "kondisi", "sumber_dana", "tahun_perolehan", "keterangan"),
      harga: String(form.get("harga") ?? "").replace(/[.\s]/g, "").replace(",", "."),
      bisa_dipinjam: form.get("bisa_dipinjam") === "on",
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const foto = await fotoDari(form, ctx.supabase, ctx.akses.userId, "barang");
  if (foto.salah) return { ok: false, pesan: foto.salah, errors: { foto: foto.salah } };
  const baris = {
    ...p.data,
    ruang_id: p.data.ruang_id || null,
    tahun_perolehan: p.data.tahun_perolehan === "" ? null : p.data.tahun_perolehan,
    harga: p.data.harga === "" ? null : p.data.harga,
    ...(foto.path ? { foto_path: foto.path } : {}),
  };
  const r = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("barang").update(baris).eq("id", id).select("id").single()
    : await ctx.supabase.from("barang").insert(baris).select("id").single();
  if (r.error) return { ok: false, pesan: pesanDb(r.error) };
  segarkan();
  if (!id) redirect(`/admin/sarpras/barang/${r.data.id}?pesan=tersimpan`);
  return { ok: true, pesan: "Data barang tersimpan." };
}

export async function hapusBarang(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("sarpras.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  const alasan = String(form.get("alasan_hapus") ?? "").trim();
  if (!id.success) return { ok: false, pesan: "Data tidak valid." };
  if (alasan.length < 3) return { ok: false, pesan: "Tulis alasan penghapusan.", errors: { alasan_hapus: "Wajib" } };
  const { error } = await ctx.supabase.from("barang").update({ deleted_at: new Date().toISOString(), alasan_hapus: alasan.slice(0, 300) }).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  redirect("/admin/sarpras?pesan=diarsipkan");
}

export async function simpanRuangSarpras(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("sarpras.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = uuid.safeParse(String(form.get("id")));
  const p = z
    .object({ gedung: z.string().trim().max(60), kondisi: z.enum(["baik", "rusak_ringan", "rusak_berat"]), kapasitas: z.union([z.literal(""), z.coerce.number().int().min(0).max(5000)]), bisa_dipinjam: z.boolean(), penanggung_jawab_id: opsiUuid })
    .safeParse({ ...ambil(form, "gedung", "kondisi", "kapasitas", "penanggung_jawab_id"), bisa_dipinjam: form.get("bisa_dipinjam") === "on" });
  if (!id.success || !p.success) return { ok: false, pesan: "Periksa isian." };
  const { error } = await ctx.supabase.from("ruang").update({ ...p.data, kapasitas: p.data.kapasitas === "" ? null : p.data.kapasitas, penanggung_jawab_id: p.data.penanggung_jawab_id || null }).eq("id", id.data);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Ruang tersimpan." };
}

/* ============================ Peminjaman ============================ */

export async function ajukanPinjam(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase } = await getAkses();
  if (!supabase) return TANPA_AKSES;
  const [jenis, objek] = String(form.get("objek") ?? "").split(":");
  const p = z
    .object({
      jenis: z.enum(["ruang", "barang"], { message: "Pilih ruang atau barang" }),
      objek: uuid,
      jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1").max(1000),
      tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal"),
      jam_mulai: z.string().regex(/^\d{2}:\d{2}$/, "Isi jam mulai"),
      tanggal_selesai: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
      jam_selesai: z.string().regex(/^\d{2}:\d{2}$/, "Isi jam selesai"),
      keperluan: z.string().trim().min(5, "Tulis keperluan (min. 5 huruf)").max(300),
    })
    .safeParse({ jenis, objek, ...ambil(form, "tanggal", "jam_mulai", "tanggal_selesai", "jam_selesai", "keperluan"), jumlah: String(form.get("jumlah") || "1") });
  if (!p.success) return { ok: false, pesan: p.error.issues[0].message, errors: pesanError(p.error) };
  const d = p.data;
  const mulai = dariLokalWIB(`${d.tanggal}T${d.jam_mulai}`);
  const selesai = dariLokalWIB(`${d.tanggal_selesai || d.tanggal}T${d.jam_selesai}`);
  if (!mulai || !selesai || selesai <= mulai) return { ok: false, pesan: "Waktu selesai harus setelah waktu mulai.", errors: { jam_selesai: "Periksa" } };
  const { error } = await supabase.rpc("ajukan_pinjam", {
    p_ruang: d.jenis === "ruang" ? d.objek : null,
    p_barang: d.jenis === "barang" ? d.objek : null,
    p_jumlah: d.jenis === "barang" ? d.jumlah : 1,
    p_mulai: mulai,
    p_selesai: selesai,
    p_keperluan: d.keperluan,
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  redirect("/admin/sarpras/peminjaman?pesan=pinjam-diajukan");
}

export async function prosesPinjam(form: FormData) {
  const { supabase } = await getAkses();
  if (!supabase) redirect("/admin/login");
  const id = uuid.safeParse(String(form.get("id")));
  const aksi = String(form.get("aksi"));
  if (!id.success) redirect("/admin/sarpras/peminjaman?pesan=gagal");
  const { error } = await supabase.rpc("proses_pinjam", { p_id: id.data, p_aksi: aksi, p_catatan: String(form.get("catatan") ?? "").slice(0, 300) });
  if (error) {
    console.error("[pinjam]", error.message);
    redirect(`/admin/sarpras/peminjaman?galat=${encodeURIComponent(error.message.slice(0, 200))}`);
  }
  kirimSegera();
  segarkan();
  redirect("/admin/sarpras/peminjaman?pesan=tersimpan");
}

/* ============================ Kerusakan ============================ */

export async function laporKerusakan(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const { supabase, user } = await getAkses();
  if (!supabase || !user) return TANPA_AKSES;
  const [jenis, objek] = String(form.get("objek") ?? "").split(":");
  const p = z
    .object({ judul: z.string().trim().min(3, "Tulis apa yang rusak").max(150), deskripsi: z.string().trim().max(2000), prioritas: z.enum(["rendah", "sedang", "tinggi"]) })
    .safeParse(ambil(form, "judul", "deskripsi", "prioritas"));
  if (!p.success) return { ok: false, pesan: "Periksa isian.", errors: pesanError(p.error) };
  const foto = await fotoDari(form, supabase, user.id, "kerusakan");
  if (foto.salah) return { ok: false, pesan: foto.salah, errors: { foto: foto.salah } };
  const { error } = await supabase.from("laporan_kerusakan").insert({
    ...p.data,
    ruang_id: jenis === "ruang" && uuid.safeParse(objek).success ? objek : null,
    barang_id: jenis === "barang" && uuid.safeParse(objek).success ? objek : null,
    foto_path: foto.path ?? "",
  });
  if (error) return { ok: false, pesan: pesanDb(error) };
  kirimSegera();
  segarkan();
  redirect("/admin/sarpras/kerusakan?pesan=kerusakan-dilaporkan");
}

export async function tanganiKerusakan(form: FormData) {
  const ctx = await aksesAksi("sarpras.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const status = z.enum(["diproses", "selesai", "ditolak"]).safeParse(String(form.get("status")));
  if (!id.success || !status.success) redirect("/admin/sarpras/kerusakan?pesan=gagal");
  const biaya = String(form.get("biaya") ?? "").replace(/[.\s]/g, "");
  const kondisi = String(form.get("kondisi_barang") ?? "");
  const { data: lap, error } = await ctx.supabase
    .from("laporan_kerusakan")
    .update({ status: status.data, penanganan: String(form.get("penanganan") ?? "").slice(0, 2000), biaya: /^\d+$/.test(biaya) ? Number(biaya) : null })
    .eq("id", id.data)
    .select("barang_id")
    .single();
  if (!error && lap?.barang_id && ["baik", "rusak_ringan", "rusak_berat", "hilang"].includes(kondisi)) {
    await ctx.supabase.from("barang").update({ kondisi }).eq("id", lap.barang_id);
  }
  if (error) console.error("[kerusakan]", error.message);
  kirimSegera();
  segarkan();
  redirect(`/admin/sarpras/kerusakan?pesan=${error ? "gagal" : "tersimpan"}`);
}
