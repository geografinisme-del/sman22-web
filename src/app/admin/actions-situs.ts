"use server";

import { revalidatePath } from "next/cache";
import { kirimSegera } from "@/lib/notif/kirim";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar, pesanError, uuid, waktuTayang } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";
import type { HasilAksi } from "./actions";

const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak melakukan aksi ini." };
const segarkan = () => revalidatePath("/", "layout");

function pesanDb(e: { code?: string; message: string }) {
  console.error("[situs]", e.code, e.message);
  if (e.code === "42501") return e.message.includes("persetujuan") ? e.message : "Akses ditolak.";
  if (["23514", "22023"].includes(e.code ?? "")) return e.message;
  return "Gagal menyimpan. Coba lagi.";
}

/** Tautan internal (/profil) atau https:// saja — tolak javascript: dan sejenisnya */
const tautan = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^\/(?!\/)[\w\-./?=&#%]*$/.test(v) || /^https:\/\/[^\s<>"]+$/.test(v), "Tautan harus diawali / (halaman situs) atau https://");

/* ============================ Persetujuan berita ============================ */

export async function putuskanBerita(form: FormData) {
  const ctx = await aksesAksi("konten.terbitkan");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  const setuju = String(form.get("keputusan")) === "setuju";
  const catatan = String(form.get("catatan") ?? "").slice(0, 500);
  if (!id.success) redirect("/admin/persetujuan?pesan=gagal");
  if (!setuju && catatan.trim().length < 3) redirect("/admin/persetujuan?pesan=perlu-catatan");
  const { error } = await ctx.supabase.rpc("putuskan_berita", { p_id: id.data, p_setuju: setuju, p_catatan: catatan });
  if (error) {
    console.error("[situs] putuskan:", error.message);
    redirect("/admin/persetujuan?pesan=gagal");
  }
  kirimSegera();
  segarkan();
  redirect(`/admin/persetujuan?pesan=${setuju ? "berita-disetujui" : "berita-dikembalikan"}`);
}

export async function pulihkanRevisi(form: FormData) {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const rid = z.coerce.number().int().positive().safeParse(form.get("revisi"));
  if (!rid.success) redirect("/admin/berita?pesan=gagal");
  const { data: r } = await ctx.supabase.from("berita_revisi").select("berita_id, data").eq("id", rid.data).maybeSingle();
  if (!r) redirect("/admin/berita?pesan=gagal");
  const d = r.data as Record<string, string>;
  const { error } = await ctx.supabase
    .from("berita")
    .update({ judul: d.judul, ringkasan: d.ringkasan, isi: d.isi, gambar_url: d.gambar_url, kategori: d.kategori, tanggal: d.tanggal, slug: d.slug })
    .eq("id", r.berita_id);
  if (error) console.error("[situs] pulihkan:", error.message);
  segarkan();
  redirect(`/admin/berita/${r.berita_id}?pesan=${error ? "gagal" : "revisi-dipulihkan"}`);
}

/* ============================ Pengaturan situs ============================ */

const layananSchema = z.array(
  z.object({ nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(60), keterangan: z.string().trim().max(80), url: tautan }),
).max(8);
const sosmedSchema = z.array(z.object({ nama: z.string().trim().min(2).max(40), akun: z.string().trim().max(60), url: tautan })).max(8);

function barisBerulang(form: FormData, awalan: string, kolom: string[], maks: number) {
  const hasil: Record<string, string>[] = [];
  for (let i = 0; i < maks; i++) {
    const b = Object.fromEntries(kolom.map((k) => [k, String(form.get(`${awalan}_${k}_${i}`) ?? "").trim()]));
    if (Object.values(b).some(Boolean)) hasil.push(b);
  }
  return hasil;
}

export async function simpanPengaturanSitus(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = (await aksesAksi("konten.kelola")) ?? (await aksesAksi("konten.terbitkan"));
  if (!ctx) return TANPA_AKSES;
  const bagian = String(form.get("bagian"));
  let isi: Record<string, unknown>;

  if (bagian === "hero") {
    const p = z
      .object({
        hero_label: z.string().trim().max(80),
        hero_judul_awal: z.string().trim().min(2, "Wajib diisi").max(60),
        hero_judul_miring: z.string().trim().max(40),
        hero_judul_akhir: z.string().trim().max(60),
        hero_teks: z.string().trim().max(300),
        tombol1_label: z.string().trim().min(2).max(40),
        tombol1_url: tautan,
        tombol2_label: z.string().trim().min(2).max(40),
        tombol2_url: tautan,
        hero_detik: z.coerce.number().int().min(6, "6–8 detik").max(8, "6–8 detik"),
      })
      .safeParse(Object.fromEntries(["hero_label", "hero_judul_awal", "hero_judul_miring", "hero_judul_akhir", "hero_teks", "tombol1_label", "tombol1_url", "tombol2_label", "tombol2_url", "hero_detik"].map((k) => [k, String(form.get(k) ?? "")])));
    if (!p.success) return { ok: false, pesan: "Periksa isian bagian pembuka.", errors: pesanError(p.error) };
    isi = p.data;
  } else if (bagian === "layanan") {
    const p = layananSchema.safeParse(barisBerulang(form, "layanan", ["nama", "keterangan", "url"], 8));
    if (!p.success) return { ok: false, pesan: `Tautan layanan: ${p.error.issues[0].message} (baris ${Number(p.error.issues[0].path[0]) + 1})` };
    isi = { layanan: p.data };
  } else if (bagian === "footer") {
    const s = sosmedSchema.safeParse(barisBerulang(form, "sosmed", ["nama", "akun", "url"], 6));
    if (!s.success) return { ok: false, pesan: `Media sosial: ${s.error.issues[0].message} (baris ${Number(s.error.issues[0].path[0]) + 1})` };
    const teks = z.string().trim().max(400, "Maksimal 400 karakter").safeParse(String(form.get("footer_teks") ?? ""));
    if (!teks.success) return { ok: false, pesan: teks.error.issues[0].message, errors: { footer_teks: teks.error.issues[0].message } };
    isi = { sosial_media: s.data, footer_teks: teks.data };
  } else if (bagian === "seo") {
    const p = z
      .object({ seo_judul: z.string().trim().max(70, "Maksimal 70 karakter"), seo_deskripsi: z.string().trim().max(170, "Maksimal 170 karakter") })
      .safeParse({ seo_judul: String(form.get("seo_judul") ?? ""), seo_deskripsi: String(form.get("seo_deskripsi") ?? "") });
    if (!p.success) return { ok: false, pesan: "Periksa isian SEO.", errors: pesanError(p.error) };
    isi = p.data;
    const gambar = form.get("seo_gambar") as File | null;
    const salah = cekGambar(gambar);
    if (salah) return { ok: false, pesan: salah, errors: { seo_gambar: salah } };
    try {
      if (gambar && gambar.size > 0) isi.seo_gambar_url = await unggahGambar(ctx.supabase, gambar, "seo");
    } catch (e) {
      return { ok: false, pesan: (e as Error).message };
    }
  } else if (bagian === "persetujuan") {
    isi = { persetujuan_wajib: form.get("persetujuan_wajib") === "on" };
  } else return { ok: false, pesan: "Bagian tidak dikenal." };

  const { error } = await ctx.supabase.from("pengaturan_situs").update(isi).eq("id", 1);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  return { ok: true, pesan: "Tersimpan. Website diperbarui dalam ±1 menit." };
}

/* ============================ Hero slide ============================ */

export async function simpanSlide(_p: HasilAksi, form: FormData): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  const id = String(form.get("id") ?? "");
  const p = z
    .object({
      alt: z.string().trim().min(3, "Tulis keterangan foto (untuk tunanetra & SEO)").max(200),
      fokus_x: z.coerce.number().int().min(0).max(100),
      fokus_y: z.coerce.number().int().min(0).max(100),
      skala: z.coerce.number().int().min(100, "100–150%").max(150, "100–150%"),
      tautan,
      video_url: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\/[^\s<>"]+\.(mp4|webm)(\?[^\s<>"]*)?$/i.test(v), "Tautan video harus https:// dan berakhiran .mp4 atau .webm"),
      urutan: z.coerce.number().int().min(0).max(999),
      aktif: z.boolean(),
      tayang_mulai: waktuTayang,
      tayang_selesai: waktuTayang,
    })
    .refine((d) => !d.tayang_mulai || !d.tayang_selesai || d.tayang_selesai > d.tayang_mulai, { path: ["tayang_selesai"], message: "Harus setelah waktu mulai" })
    .safeParse({
      ...Object.fromEntries(["alt", "fokus_x", "fokus_y", "skala", "tautan", "video_url", "urutan", "tayang_mulai", "tayang_selesai"].map((k) => [k, String(form.get(k) ?? "")])),
      aktif: form.get("aktif") === "on",
    });
  if (!p.success) return { ok: false, pesan: "Periksa isian foto.", errors: pesanError(p.error) };

  const baris: Record<string, unknown> = { ...p.data };
  const g = form.get("gambar") as File | null;
  const gHp = form.get("gambar_hp") as File | null;
  for (const [f, k] of [[g, "gambar"], [gHp, "gambar_hp"]] as const) {
    const salah = cekGambar(f);
    if (salah) return { ok: false, pesan: salah, errors: { [k]: salah } };
  }
  if (!id && (!g || g.size === 0)) return { ok: false, pesan: "Pilih foto layar lebar.", errors: { gambar: "Wajib" } };
  try {
    if (g && g.size > 0) baris.gambar_url = await unggahGambar(ctx.supabase, g, "hero");
    if (gHp && gHp.size > 0) baris.gambar_hp_url = await unggahGambar(ctx.supabase, gHp, "hero");
    else if (form.get("hapus_hp") === "on") baris.gambar_hp_url = "";
  } catch (e) {
    return { ok: false, pesan: (e as Error).message };
  }
  const { error } = id && uuid.safeParse(id).success
    ? await ctx.supabase.from("hero_slide").update(baris).eq("id", id)
    : await ctx.supabase.from("hero_slide").insert(baris);
  if (error) return { ok: false, pesan: pesanDb(error) };
  segarkan();
  if (!id) redirect("/admin/situs?pesan=tersimpan#foto-hero");
  return { ok: true, pesan: "Foto pembuka tersimpan." };
}

export async function arsipSlide(form: FormData) {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) redirect("/admin?pesan=tanpa-akses");
  const id = uuid.safeParse(String(form.get("id")));
  if (id.success) await ctx.supabase.from("hero_slide").update({ deleted_at: new Date().toISOString() }).eq("id", id.data);
  segarkan();
  redirect("/admin/situs?pesan=diarsipkan#foto-hero");
}
