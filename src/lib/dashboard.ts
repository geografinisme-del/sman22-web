import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { geserTanggal, hariIniWIB } from "@/lib/admin/absensi";
import type { TitikHarian } from "@/components/dashboard/GrafikTidakHadir";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** % siswa tidak hadir (S/I/A) untuk N hari sekolah terakhir */
export async function trenTidakHadir(supabase: SupabaseClient, n = 10): Promise<TitikHarian[]> {
  const hari = hariIniWIB();
  const dari = geserTanggal(hari, -25);
  const [{ data: atur }, { data: libur }, { count: total }, { data: absen }] = await Promise.all([
    supabase.from("pengaturan_absensi").select("hari_sekolah").eq("id", 1).maybeSingle(),
    supabase.from("hari_libur").select("tanggal").gte("tanggal", dari).lte("tanggal", hari),
    supabase.from("siswa_kelas_aktif").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("status", "aktif").not("kelas_id", "is", null),
    supabase.from("absensi_siswa").select("tanggal, status").gte("tanggal", dari).lte("tanggal", hari).in("status", ["S", "I", "A"]).limit(20000),
  ]);
  if (!total) return [];
  const sekolah = new Set<number>((atur?.hari_sekolah as number[] | undefined) ?? [1, 2, 3, 4, 5]);
  const lib = new Set((libur ?? []).map((l) => l.tanggal));
  const hitung = new Map<string, number>();
  for (const a of absen ?? []) hitung.set(a.tanggal, (hitung.get(a.tanggal) ?? 0) + 1);
  const hasil: TitikHarian[] = [];
  for (let i = 0; i <= 25 && hasil.length < n; i++) {
    const t = geserTanggal(hari, -i);
    const d = new Date(t + "T00:00:00Z").getUTCDay();
    if (!sekolah.has(d === 0 ? 7 : d) || lib.has(t)) continue;
    const x = hitung.get(t) ?? 0;
    hasil.unshift({ tanggal: t, label: `${HARI[d]} ${Number(t.slice(8))}/${Number(t.slice(5, 7))}`, persen: (x / total) * 100, tidakHadir: x, total });
  }
  return hasil;
}
