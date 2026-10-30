/**
 * Siapa boleh membuka modul admin yang TIDAK dijaga satu izin tunggal.
 * Satu sumber untuk sidebar (menu disembunyikan) dan penjaga halaman (`wajibBoleh`, ditolak di server bila URL dibuka
 * langsung). Data di dalamnya tetap dijaga RLS. Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */
export type AksesMinimal = { peran: readonly string[]; izin: readonly string[] };

import { PERAN_PENDIDIK } from "./menu-peran.ts";

/** peran yang mengajar di kelas = semua PENDIDIK (guru + tugas tambahan guru, termasuk waka & kepala sekolah) */
export const PERAN_PENGAJAR = PERAN_PENDIDIK;

const izin = (a: AksesMinimal, ...daftar: string[]) => daftar.some((i) => a.izin.includes(i));
const peran = (a: AksesMinimal, ...daftar: string[]) => daftar.some((p) => a.peran.includes(p));

export const pengajar = (a: AksesMinimal) => peran(a, ...PERAN_PENGAJAR);

/**
 * Peran yang boleh diberikan/dicabut operator (izin pengguna.kelola_dasar). Akun yang punya peran LAIN ("dilindungi")
 * hanya bisa diubah super admin. Sama dengan fungsi database peran_dasar() (migrasi 20261229).
 */
export const PERAN_DASAR = ["guru", "wali_kelas", "piket", "pegawai", "laboran", "siswa", "orang_tua"];
export const peranDasar = (p: string) => PERAN_DASAR.includes(p);
export const akunDilindungi = (peranAkun: readonly string[]) => peranAkun.some((p) => !peranDasar(p));

export const BOLEH = {
  strukturKurikulum: (a: AksesMinimal) => pengajar(a) || izin(a, "kurikulum.kelola", "supervisi.kelola"),
  perangkatAjar: (a: AksesMinimal) => pengajar(a) || izin(a, "kurikulum.kelola"),
  mengajar: pengajar,
  supervisi: (a: AksesMinimal) => pengajar(a) || izin(a, "supervisi.kelola"),
  jadwalPelajaran: (a: AksesMinimal) => pengajar(a) || izin(a, "jadwal.kelola", "jadwal.pengganti"),
  katalogPerpus: (a: AksesMinimal) => izin(a, "perpus.kelola", "perpus.lihat"),
  poinKesiswaan: (a: AksesMinimal) => izin(a, "kesiswaan.lihat") || peran(a, "wali_kelas"),
  dataHumas: (a: AksesMinimal) => izin(a, "humas.kelola", "humas.lihat"),
  // penangan pengaduan RAHASIA saja (BK, Wakasek Kesiswaan) tidak termasuk: mereka memakai daftar Pengaduan saja
  dasborHumas: (a: AksesMinimal) => izin(a, "humas.kelola", "humas.lihat", "pengaduan.kelola", "pengaduan.lihat", "pengaduan.metadata"),
  penggunaPeran: (a: AksesMinimal) => izin(a, "pengguna.kelola", "pengguna.kelola_dasar"),
  laporanBk: (a: AksesMinimal) => izin(a, "bk.agregat"),
  logAksesBk: (a: AksesMinimal) => izin(a, "bk.konseling", "audit.baca"),
  /** absensi harian per kelas: pencatat (piket, kesiswaan), pengatur, pemantau kehadiran sekolah (kepala, TU) & wali kelas */
  absensiHarian: (a: AksesMinimal) => izin(a, "absensi.kelola", "absensi.atur", "absensi_pegawai.lihat") || peran(a, "wali_kelas"),
  /** rekap absensi: pemantau disiplin/kehadiran (bukan piket) & wali kelas */
  rekapAbsensi: (a: AksesMinimal) => izin(a, "disiplin.lihat", "absensi.atur", "absensi_pegawai.lihat") || peran(a, "wali_kelas"),
  /** halaman literasi & pengelolaan pojok baca: pustakawan & koordinator literasi */
  binaLiterasi: (a: AksesMinimal) => izin(a, "perpus.kelola", "literasi.kelola"),
} satisfies Record<string, (a: AksesMinimal) => boolean>;
