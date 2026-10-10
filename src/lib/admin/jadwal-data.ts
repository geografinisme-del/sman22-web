import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entri, Jam, Perubahan } from "./jadwal";

const KOLOM_ENTRI = "id, hari, jp_ke, kelas_id, kelas, mapel, kode_mapel, guru, pegawai_id, ruang, ruang_id";

export async function muatJam(supabase: SupabaseClient): Promise<Jam[]> {
  const { data } = await supabase.from("jam_pelajaran").select("hari, urutan, jenis, jp_ke, jam_mulai, jam_selesai, label").order("hari").order("urutan");
  return (data ?? []) as Jam[];
}

/** Jadwal tahun ajaran aktif, difilter satu kolom (kelas_id / pegawai_id / ruang_id / hari) */
export async function muatEntri(supabase: SupabaseClient, kolom?: "kelas_id" | "pegawai_id" | "ruang_id" | "hari", nilai?: string | number): Promise<Entri[]> {
  let q = supabase.from("jadwal_lengkap").select(KOLOM_ENTRI).eq("tahun_aktif", true).order("hari").order("jp_ke").limit(5000);
  if (kolom && nilai !== undefined) q = q.eq(kolom, nilai);
  const { data } = await q;
  return (data ?? []) as Entri[];
}

export async function muatPerubahan(supabase: SupabaseClient, dari: string, sampai: string = dari): Promise<Perubahan[]> {
  const { data } = await supabase
    .from("perubahan_jadwal")
    .select("id, jadwal_id, tanggal, jenis, pegawai_pengganti_id, ruang_id, catatan")
    .gte("tanggal", dari)
    .lte("tanggal", sampai);
  return (data ?? []) as Perubahan[];
}

/** Nama guru/ruang yang disebut di perubahan (nama guru lewat fungsi aman nama_pegawai) */
export async function namaUntukPerubahan(supabase: SupabaseClient, list: Perubahan[]) {
  const guru = [...new Set(list.map((p) => p.pegawai_pengganti_id).filter(Boolean))] as string[];
  const ruang = [...new Set(list.map((p) => p.ruang_id).filter(Boolean))] as string[];
  const [g, r] = await Promise.all([
    Promise.all(guru.map(async (id) => [id, ((await supabase.rpc("nama_pegawai", { pid: id })).data as string | null) ?? "guru"] as const)),
    ruang.length ? supabase.from("ruang").select("id, nama").in("id", ruang) : Promise.resolve({ data: [] as { id: string; nama: string }[] }),
  ]);
  return { guru: new Map(g), ruang: new Map((r.data ?? []).map((x) => [x.id, x.nama])) };
}

export function teksPerubahan(p: Perubahan, nama: { guru: Map<string, string>; ruang: Map<string, string> }) {
  switch (p.jenis) {
    case "pengganti":
      return `Diganti ${nama.guru.get(p.pegawai_pengganti_id ?? "") ?? "guru lain"}`;
    case "tugas":
      return "Tugas mandiri";
    case "ditiadakan":
      return "Ditiadakan";
    case "pindah_ruang":
      return `Pindah ke ${nama.ruang.get(p.ruang_id ?? "") ?? "ruang lain"}`;
  }
}
