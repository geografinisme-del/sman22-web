import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { namaHari } from "./jadwal";

export const STATUS_TUKAR: Record<string, { label: string; warna: string }> = {
  menunggu_mitra: { label: "Menunggu jawaban guru", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  menunggu_kurikulum: { label: "Menunggu kurikulum", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ditolak: { label: "Ditolak", warna: "bg-red-50 text-red-800 ring-red-200" },
  dibatalkan: { label: "Dibatalkan", warna: "bg-black/5 text-black/60 ring-black/10" },
};

export type BarisTukar = {
  id: string;
  pemohon_id: string;
  mitra_id: string;
  jadwal_pemohon: string;
  tanggal_pemohon: string;
  jadwal_mitra: string | null;
  tanggal_mitra: string | null;
  alasan: string;
  status: string;
  catatan_mitra: string;
  catatan_putusan: string;
  created_at: string;
  pemohon: string;
  mitra: string;
  slotPemohon: string;
  slotMitra: string | null;
};

const KOLOM = "id, pemohon_id, mitra_id, jadwal_pemohon, tanggal_pemohon, jadwal_mitra, tanggal_mitra, alasan, status, catatan_mitra, catatan_putusan, created_at";

/** Muat pengajuan tukar jam (RLS membatasi: milik sendiri / sebagai mitra / kurikulum) + teks slot & nama guru */
export async function muatTukar(supabase: SupabaseClient, atur: (q: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>) => typeof q) {
  const { data } = await atur(supabase.from("pengajuan_tukar_jadwal").select(KOLOM)).order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as Omit<BarisTukar, "pemohon" | "mitra" | "slotPemohon" | "slotMitra">[];
  const idSlot = [...new Set(list.flatMap((t) => [t.jadwal_pemohon, t.jadwal_mitra]).filter(Boolean))] as string[];
  const idGuru = [...new Set(list.flatMap((t) => [t.pemohon_id, t.mitra_id]))];
  const [{ data: slot }, nama] = await Promise.all([
    idSlot.length ? supabase.from("jadwal_lengkap").select("id, hari, jp_ke, kelas, mapel").in("id", idSlot) : Promise.resolve({ data: [] as { id: string; hari: number; jp_ke: number; kelas: string; mapel: string }[] }),
    Promise.all(idGuru.map(async (id) => [id, ((await supabase.rpc("nama_pegawai", { pid: id })).data as string | null) ?? "guru"] as const)),
  ]);
  const s = new Map((slot ?? []).map((x) => [x.id, x]));
  const g = new Map(nama);
  const teks = (id: string | null, tgl: string | null) => {
    if (!id || !tgl) return null;
    const x = s.get(id);
    const t = new Date(tgl + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
    return x ? `${namaHari(x.hari)} ${t} · JP ${x.jp_ke} · ${x.mapel} ${x.kelas}` : `${t} (jadwal sudah berubah)`;
  };
  return list.map((t) => ({
    ...t,
    pemohon: g.get(t.pemohon_id) ?? "guru",
    mitra: g.get(t.mitra_id) ?? "guru",
    slotPemohon: teks(t.jadwal_pemohon, t.tanggal_pemohon) ?? "",
    slotMitra: teks(t.jadwal_mitra, t.tanggal_mitra),
  })) as BarisTukar[];
}
