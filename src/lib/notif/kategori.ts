export const KATEGORI_NOTIF: Record<string, string> = {
  izin: "Izin & sakit siswa",
  absensi: "Absensi & koreksi",
  disiplin: "Peringatan disiplin (SP, panggilan ortu)",
  kesiswaan: "Laporan pelanggaran",
  prestasi: "Prestasi",
  jadwal: "Jadwal & guru pengganti",
  kurikulum: "Kurikulum, tugas, kuis & supervisi",
  sarpras: "Sarpras: peminjaman & kerusakan",
  perpus: "Perpustakaan (jatuh tempo)",
  humas: "Humas: pengaduan, tamu, kemitraan",
  konten: "Berita & persetujuan",
  kepegawaian: "Izin/cuti pegawai",
  bk: "Layanan BK (rujukan, jadwal)",
  ekskul: "Ekskul & OSIS",
  alumni: "Alumni & mentoring",
  mutu: "Penjaminan mutu",
  sistem: "Sistem",
};

/** Kategori yang selalu dikirim (tidak bisa dimatikan pengguna) */
export const KATEGORI_WAJIB: Record<string, string> = { keamanan: "Keamanan akun" };
export const labelKategori = (k: string) => KATEGORI_NOTIF[k] ?? KATEGORI_WAJIB[k] ?? k;
