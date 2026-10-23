import "server-only";
import { cache } from "react";
import { supabaseAktif } from "@/lib/supabase/config";
import { supabasePublik } from "@/lib/supabase/public";

/**
 * Foto sementara (stok Unsplash) + arsip foto asli (migrasi 20261227000000_foto_slot).
 * - Slot di KODE (tabel kosong, mis. "profil.sejarah"): foto aktif dibaca dari sini; tanpa baris → foto bawaan kode.
 * - Slot di tabel CMS (galeri, tur, kartu, menu, halaman masuk): foto aktif tetap di tabel CMS; baris ini hanya
 *   menyimpan foto asli (tautan "Lihat foto asli") dan kredit.
 * Tabel belum ada / galat → kosong (situs memakai foto bawaan seperti sebelumnya).
 */
export type FotoSlot = {
  lokasi: string;
  nama: string;
  jenis: "dekorasi" | "kegiatan";
  tabel: string | null;
  barisId: string | null;
  src: string;
  sementara: boolean;
  alt: string;
  fokus: { x: number; y: number };
  asli: string | null;
  asliSementara: boolean;
  fotografer: string;
  sumber: string;
  tautanSumber: string;
  lisensi: string;
  diunduhPada: string | null;
  dikembalikan: boolean;
};

/** Teks label: foto dekorasi vs foto pengganti dokumentasi kegiatan (agar tidak disangka foto kegiatan asli). */
export const LABEL_SEMENTARA = { dekorasi: "Ilustrasi sementara", kegiatan: "Ilustrasi — bukan foto kegiatan" } as const;

export const getFotoSlot = cache(async (): Promise<FotoSlot[]> => {
  if (!supabaseAktif) return [];
  const { data, error } = await supabasePublik().from("foto_slot").select("*").order("lokasi");
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("[foto-slot] gagal memuat:", error.code, error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    lokasi: r.lokasi,
    nama: r.nama,
    jenis: r.jenis === "kegiatan" ? "kegiatan" : "dekorasi",
    tabel: r.tabel ?? null,
    barisId: r.baris_id ?? null,
    src: r.url_aktif,
    sementara: r.is_placeholder === true,
    alt: r.alt_text ?? "",
    fokus: { x: r.fokus_x ?? 50, y: r.fokus_y ?? 50 },
    asli: r.url_asli ?? null,
    asliSementara: r.asli_sementara === true,
    fotografer: r.fotografer ?? "",
    sumber: r.sumber ?? "",
    tautanSumber: r.tautan_sumber ?? "",
    lisensi: r.lisensi ?? "",
    diunduhPada: r.diunduh_pada ?? null,
    dikembalikan: Boolean(r.dikembalikan_pada),
  }));
});

export type FotoTerpakai = { src: string; alt: string; sementara: boolean; fokus?: { x: number; y: number } };

/**
 * Foto untuk slot di kode: baris foto_slot (bila ada) menggantikan foto bawaan.
 * Setelah "Kembalikan foto asli" / diganti foto asli, baris itu memuat foto asli dengan sementara = false.
 */
export async function fotoKode(lokasi: string, bawaan: FotoTerpakai): Promise<FotoTerpakai> {
  const s = (await getFotoSlot()).find((x) => x.lokasi === lokasi && x.tabel === null);
  return s ? { src: s.src, alt: s.alt || bawaan.alt, sementara: s.sementara, fokus: s.fokus } : bawaan;
}

/** Foto asli + jenis untuk baris tabel CMS tertentu (mis. galeri) — dipakai label & tautan "Lihat foto asli". */
export async function slotBaris(tabel: string): Promise<Map<string, FotoSlot>> {
  return new Map((await getFotoSlot()).filter((s) => s.tabel === tabel && s.barisId).map((s) => [s.barisId!, s]));
}
