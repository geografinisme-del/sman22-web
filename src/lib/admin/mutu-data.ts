import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { periodeAwal } from "@/lib/mutu";

export type Kerangka = { id: string; kode: string; nama: string; versi: string; status: string; periode_aktif: string; sumber_regulasi: string; periode_mulai: string | null; periode_selesai: string | null };
export type BarisAnalisis = { standar_id: string; standar_kode: string; standar: string; indikator_id: string; kode: string; nama: string; pemilik: string; target: string; capaian: string;
  skor: number | null; status: string; persetujuan: string; jumlah_bukti: number; temuan_terbuka: number; rencana_aktif: number; celah: string[] };

/** Kerangka & periode terpilih (default: kerangka aktif pertama, periode aktifnya) */
export async function pilihKerangka(supabase: SupabaseClient, k?: string, periode?: string) {
  const { data } = await supabase.from("kerangka_mutu").select("id, kode, nama, versi, status, periode_aktif, sumber_regulasi, periode_mulai, periode_selesai").order("status").order("kode").order("versi", { ascending: false });
  const semua = (data ?? []) as Kerangka[];
  const kini = semua.find((x) => x.id === k) ?? semua.find((x) => x.status === "aktif") ?? semua[0];
  const per = periode && /^\d{4}(\/\d{4})?$/.test(periode) ? periode : kini?.periode_aktif || periodeAwal();
  return { semua, kini, periode: per };
}
