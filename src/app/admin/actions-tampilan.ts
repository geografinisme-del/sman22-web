"use server";

import { revalidatePath } from "next/cache";
import { aksesAksi } from "@/lib/admin/auth";
import { bacaKonfigurasi } from "@/lib/tampilan/konfigurasi";
import type { HasilAksi } from "./actions";

/**
 * Aksi mesin tema & widget. Izin diperiksa di server (konten.kelola) DAN di database
 * (RLS tampilan_draf/riwayat_tampilan, fungsi terbitkan_tampilan). Konfigurasi selalu dibersihkan
 * oleh bacaKonfigurasi() sebelum disimpan, sehingga editor tidak bisa menyimpan HTML/JS atau nilai bebas.
 */
const TANPA_AKSES: HasilAksi = { ok: false, pesan: "Anda tidak berhak mengubah tampilan website." };
const BELUM_MIGRASI: HasilAksi = { ok: false, pesan: "Jalankan migrasi 20261202000000_tampilan_widget.sql di Supabase terlebih dahulu." };
const tabelHilang = (kode?: string) => kode === "42P01" || kode === "PGRST205" || kode === "42883" || kode === "PGRST202";

export async function simpanDrafTampilan(json: string): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  let mentah: unknown;
  try {
    if (json.length > 40000) throw new Error();
    mentah = JSON.parse(json);
  } catch {
    return { ok: false, pesan: "Data pengaturan tidak valid. Muat ulang halaman." };
  }
  const konfigurasi = bacaKonfigurasi(mentah);
  const { error } = await ctx.supabase.from("tampilan_draf").upsert({ id: 1, konfigurasi });
  if (error) {
    console.error("[tampilan] simpan draf:", error.code, error.message);
    return tabelHilang(error.code) ? BELUM_MIGRASI : { ok: false, pesan: "Gagal menyimpan draf. Coba lagi." };
  }
  return { ok: true, pesan: "Draf tersimpan. Periksa pratinjau sebelum menerapkan." };
}

export async function terbitkanTampilan(catatan: string): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  const { error } = await ctx.supabase.rpc("terbitkan_tampilan", { p_catatan: catatan.trim().slice(0, 200) });
  if (error) {
    console.error("[tampilan] terbit:", error.code, error.message);
    if (error.code === "P0002") return { ok: false, pesan: "Belum ada draf. Simpan draf terlebih dahulu." };
    if (error.code === "42501") return TANPA_AKSES;
    return tabelHilang(error.code) ? BELUM_MIGRASI : { ok: false, pesan: "Gagal menerapkan. Coba lagi." };
  }
  revalidatePath("/", "layout");
  return { ok: true, pesan: "Tampilan diterapkan. Website publik diperbarui dalam ±1 menit." };
}

/** Salin versi terbit sebelumnya ke draf (tidak langsung terbit — periksa pratinjau lalu terapkan). */
export async function pulihkanTampilan(id: number): Promise<HasilAksi> {
  const ctx = await aksesAksi("konten.kelola");
  if (!ctx) return TANPA_AKSES;
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, pesan: "Versi tidak dikenal." };
  const { data, error } = await ctx.supabase.from("riwayat_tampilan").select("konfigurasi").eq("id", id).maybeSingle();
  if (error || !data) return error && tabelHilang(error.code) ? BELUM_MIGRASI : { ok: false, pesan: "Versi tidak ditemukan." };
  const { error: e2 } = await ctx.supabase.from("tampilan_draf").upsert({ id: 1, konfigurasi: bacaKonfigurasi(data.konfigurasi) });
  if (e2) return { ok: false, pesan: "Gagal memulihkan. Coba lagi." };
  return { ok: true, pesan: "Versi dipulihkan ke draf. Periksa pratinjau, lalu Terapkan." };
}
