"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { aksesAksi } from "@/lib/admin/auth";
import { cekGambar } from "@/lib/admin/schema";
import { unggahGambar } from "@/lib/admin/unggah";

/**
 * Foto sementara (tabel foto_slot, migrasi 20261227):
 * - "Kembalikan foto asli": foto asli yang diarsipkan dipasang lagi di lokasinya (tabel CMS atau slot kode),
 *   label sementara hilang (kecuali foto lama itu sendiri foto stok).
 * - "Ganti dengan foto asli" (slot kode): unggahan admin = foto asli → label sementara hilang.
 * Diperiksa di server (izin konten.kelola) dan dibatasi lagi oleh RLS.
 */
const KEMBALI = "/admin/foto-sementara";
const LOKASI = /^[a-z0-9_.:-]{3,120}$/;

/** kolom foto per tabel CMS + kunci barisnya */
const KOLOM: Record<string, { kolom: string; kunci: string }> = {
  kartu_beranda: { kolom: "foto_url", kunci: "id" },
  tur_sekolah: { kolom: "media_url", kunci: "id" },
  galeri: { kolom: "gambar_url", kunci: "id" },
  menu_sorotan: { kolom: "foto_url", kunci: "id" },
  portal_login: { kolom: "foto_url", kunci: "peran" },
};

function segarkan() {
  revalidatePath("/", "layout");
  updateTag("menu-navigasi");
}

export async function kembalikanFotoAsli(form: FormData) {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) redirect("/admin/login");
  const lokasi = String(form.get("lokasi") ?? "");
  if (!LOKASI.test(lokasi)) redirect(`${KEMBALI}?pesan=gagal`);
  const { data: slot, error } = await ctx.supabase.from("foto_slot").select("*").eq("lokasi", lokasi).maybeSingle();
  if (error || !slot?.url_asli) redirect(`${KEMBALI}?pesan=gagal`);
  const sementara = slot.asli_sementara === true;

  if (slot.tabel) {
    const k = KOLOM[slot.tabel];
    if (!k || !slot.baris_id) redirect(`${KEMBALI}?pesan=gagal`);
    const isi: Record<string, unknown> = { [k.kolom]: slot.url_asli, is_placeholder: sementara, updated_at: new Date().toISOString() };
    if (slot.tabel === "tur_sekolah") isi.media_tipe = "foto";
    const { error: e } = await ctx.supabase.from(slot.tabel).update(isi).eq(k.kunci, slot.baris_id);
    if (e) {
      console.error("[foto-slot] gagal mengembalikan foto di tabel:", e.code, e.message);
      redirect(`${KEMBALI}?pesan=gagal`);
    }
  }
  const { error: e2 } = await ctx.supabase
    .from("foto_slot")
    .update({ url_aktif: slot.url_asli, is_placeholder: sementara, dikembalikan_pada: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("lokasi", lokasi);
  if (e2) {
    console.error("[foto-slot] gagal mencatat:", e2.code, e2.message);
    redirect(`${KEMBALI}?pesan=gagal`);
  }
  segarkan();
  redirect(`${KEMBALI}?pesan=foto-dikembalikan`);
}

/** Slot di kode (tanpa tabel CMS): unggah foto asli sekolah sebagai pengganti ilustrasi sementara. */
export async function gantiFotoSlot(form: FormData) {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) redirect("/admin/login");
  const lokasi = String(form.get("lokasi") ?? "");
  if (!LOKASI.test(lokasi)) redirect(`${KEMBALI}?pesan=gagal`);
  const foto = form.get("foto") as File | null;
  if (!foto || foto.size === 0 || cekGambar(foto)) redirect(`${KEMBALI}?pesan=gagal`);
  let url: string;
  try {
    url = await unggahGambar(ctx.supabase, foto, "foto-situs");
  } catch {
    redirect(`${KEMBALI}?pesan=gagal`);
  }
  const alt = String(form.get("alt") ?? "").trim().slice(0, 200);
  const { error } = await ctx.supabase
    .from("foto_slot")
    .update({ url_aktif: url, is_placeholder: false, ...(alt ? { alt_text: alt } : {}), updated_at: new Date().toISOString() })
    .eq("lokasi", lokasi)
    .is("tabel", null);
  if (error) {
    console.error("[foto-slot] gagal mengganti:", error.code, error.message);
    redirect(`${KEMBALI}?pesan=gagal`);
  }
  segarkan();
  redirect(`${KEMBALI}?pesan=tersimpan`);
}
