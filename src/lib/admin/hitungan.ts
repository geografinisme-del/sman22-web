import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Hasil query yang dipakai bersama dalam SATU permintaan halaman. Layout admin (badge menu) dan halaman Ringkasan
 * (daftar "Perlu ditindaklanjuti") menghitung banyak hal yang sama; dengan wadah ini query yang sama hanya dikirim
 * sekali ke database dan hasilnya dibagi. Wadah hidup selama satu permintaan saja (React `cache`), jadi tidak
 * pernah tercampur antarpengguna.
 */
const wadah = cache(() => new Map<string, Promise<unknown>>());

export function sekali<T>(kunci: string, buat: () => PromiseLike<T>): Promise<T> {
  const peta = wadah();
  let janji = peta.get(kunci) as Promise<T> | undefined;
  if (!janji) {
    janji = Promise.resolve(buat());
    peta.set(kunci, janji);
  }
  return janji;
}

export type Hitungan = { count: number | null; error: unknown };
const kepala = { count: "exact" as const, head: true };

/** id pegawai milik akun yang login (null bila akun bukan pegawai) */
export const pegawaiSaya = (s: SupabaseClient) =>
  sekali("pegawai_saya", () => Promise.resolve(s.rpc("pegawai_saya")).then((r) => (r.data as string | null) ?? null));

export type TahunAjaran = { id: string; nama: string; semester: string };
export const tahunAjaranAktif = (s: SupabaseClient) =>
  sekali("tahun_ajaran_aktif", () =>
    Promise.resolve(s.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).maybeSingle()).then((r) => ({ data: (r.data as TahunAjaran | null) ?? null, error: r.error })),
  );

/** Status disiplin (SP/panggilan) — RPC yang dipakai badge menu & Ringkasan */
export const statusDisiplin = (s: SupabaseClient) =>
  sekali("status_disiplin", () => Promise.resolve(s.rpc("status_disiplin")).then((r) => ({ data: (r.data ?? []) as { dikonfirmasi: boolean }[], error: r.error })));

/** Hitungan tanpa parameter yang dipakai badge menu & Ringkasan */
const HITUNGAN = {
  beritaDiajukan: (s: SupabaseClient) => s.from("berita").select("id", kepala).eq("status", "diajukan").is("deleted_at", null),
  tukarMenungguKurikulum: (s: SupabaseClient) => s.from("pengajuan_tukar_jadwal").select("id", kepala).eq("status", "menunggu_kurikulum"),
  perangkatDiajukan: (s: SupabaseClient) => s.from("perangkat_ajar").select("id", kepala).eq("status", "diajukan").is("deleted_at", null),
  peminjamanDiajukan: (s: SupabaseClient) => s.from("peminjaman").select("id", kepala).eq("status", "diajukan"),
  kerusakanBaru: (s: SupabaseClient) => s.from("laporan_kerusakan").select("id", kepala).eq("status", "dilaporkan"),
  aduanBaru: (s: SupabaseClient) => s.from("pengaduan").select("id", kepala).eq("status", "baru"),
  konselingBaru: (s: SupabaseClient) => s.from("permintaan_konseling").select("id", kepala).eq("status", "baru"),
  alumniMenunggu: (s: SupabaseClient) => s.from("pendaftaran_alumni").select("id", kepala).eq("status", "menunggu"),
  mutuDiajukan: (s: SupabaseClient) => s.from("evaluasi_indikator").select("id", kepala).eq("persetujuan", "diajukan"),
  pelanggaranBaru: (s: SupabaseClient) => s.from("pelanggaran_siswa").select("id", kepala).eq("status", "dilaporkan"),
  prestasiDiajukan: (s: SupabaseClient) => s.from("prestasi_siswa").select("id", kepala).eq("status", "diajukan"),
  rujukanBaru: (s: SupabaseClient) => s.from("rujukan_bk").select("id", kepala).eq("status", "baru"),
  koreksiMenunggu: (s: SupabaseClient) => s.from("pengajuan_koreksi").select("id", kepala).eq("status", "menunggu"),
  izinOrtuMenunggu: (s: SupabaseClient) => s.from("izin_ortu").select("id", kepala).eq("status", "menunggu"),
  izinPegawaiMenunggu: (s: SupabaseClient) => s.from("pengajuan_izin_pegawai").select("id", kepala).eq("status", "menunggu"),
  kegiatanMenungguKelola: (s: SupabaseClient) => s.from("pengajuan_kegiatan").select("id", kepala).in("status", ["disetujui_pembina", "lpj_diajukan"]),
} as const;
export type NamaHitungan = keyof typeof HITUNGAN;

export const hitungBersama = (s: SupabaseClient, nama: NamaHitungan): Promise<Hitungan> =>
  sekali(`hitung:${nama}`, () => Promise.resolve(HITUNGAN[nama](s)).then((r) => ({ count: r.count, error: r.error })));

/** Hitungan milik pegawai tertentu (badge menu & Ringkasan) */
export const tukarUntukSaya = (s: SupabaseClient, pid: string): Promise<Hitungan> =>
  sekali(`hitung:tukarMitra:${pid}`, () =>
    Promise.resolve(s.from("pengajuan_tukar_jadwal").select("id", kepala).eq("mitra_id", pid).eq("status", "menunggu_mitra")).then((r) => ({ count: r.count, error: r.error })),
  );
export const tugasPerluNilai = (s: SupabaseClient, pid: string): Promise<Hitungan> =>
  sekali(`hitung:perluNilai:${pid}`, () =>
    Promise.resolve(s.from("pengumpulan_tugas").select("id, tugas!inner(pegawai_id)", kepala).eq("status", "dikumpulkan").eq("tugas.pegawai_id", pid)).then((r) => ({
      count: r.count,
      error: r.error,
    })),
  );
