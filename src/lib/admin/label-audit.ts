/**
 * Label tampilan untuk log aktivitas (audit_log). Data audit aslinya tidak diubah —
 * berkas ini hanya menerjemahkan kode teknis menjadi kalimat yang mudah dipahami.
 */

export const TABEL_AUDIT: Record<string, string> = {
  profil_sekolah: "Profil sekolah", berita: "Berita", agenda: "Agenda", pengumuman: "Pengumuman", galeri: "Galeri",
  siswa: "Siswa", pegawai: "Pegawai", kelas: "Kelas", anggota_kelas: "Anggota kelas", tahun_ajaran: "Tahun ajaran",
  orang_tua: "Orang tua", siswa_orang_tua: "Relasi orang tua", pengguna: "Pengguna", pengguna_peran: "Peran pengguna", peran_izin: "Matriks izin", admins: "Admin (lama)",
  auth: "Login & keamanan akun", peran: "Pengaturan peran", kegiatan_kalender: "Kalender kegiatan", pengajuan_tukar_jadwal: "Tukar jam",
  jadwal: "Jadwal pelajaran", perubahan_jadwal: "Perubahan jadwal",
  struktur_kurikulum: "Struktur kurikulum", capaian_pembelajaran: "Capaian pembelajaran", tujuan_pembelajaran: "Tujuan pembelajaran (ATP)",
  atp_status: "Status ATP", tugas: "Tugas", pengumpulan_tugas: "Nilai tugas", kuis: "Kuis", barang: "Inventaris barang", peminjaman: "Peminjaman", laporan_kerusakan: "Laporan kerusakan", perangkat_ajar: "Perangkat ajar", projek_kokurikuler: "Projek kokurikuler", supervisi_akademik: "Supervisi akademik", materi_kelas: "Materi digital", buku: "Katalog buku", eksemplar: "Eksemplar buku", pinjaman_buku: "Pinjaman buku", pengaduan: "Pengaduan", kemitraan: "Kemitraan", buku_tamu: "Buku tamu", pojok_baca: "Pojok baca", kegiatan_pojok: "Kegiatan pojok baca", reservasi_buku: "Pesanan buku", jurnal_baca: "Jurnal baca", tantangan_literasi: "Tantangan literasi", ulasan_buku: "Ulasan buku", duta_literasi: "Duta literasi", sla_pengaduan: "SLA pengaduan", kegiatan_mitra: "Kegiatan mitra", kontak_media: "Kontak media", survei: "Survei", pengaturan_bk: "Pengaturan BK", kategori_konseling: "Kategori konseling", tindak_lanjut_bk: "Tindak lanjut BK", rujukan_eksternal_bk: "Rujukan eksternal BK", pengaturan_ekskul: "Pengaturan ekskul", organisasi: "Organisasi siswa", pembina_organisasi: "Pembina organisasi", pendaftaran_ekskul: "Pendaftaran ekskul", keanggotaan_org: "Keanggotaan organisasi", kegiatan_org: "Kegiatan organisasi", program_kerja: "Program kerja", pengajuan_kegiatan: "Pengajuan kegiatan", sertifikat_org: "Sertifikat organisasi", angkatan_alumni: "Angkatan alumni", profil_alumni: "Profil alumni", pendaftaran_alumni: "Pendaftaran alumni", acara_alumni: "Acara alumni", peluang: "Peluang", mentor_alumni: "Mentor alumni", mentoring: "Mentoring", kontribusi_alumni: "Kontribusi alumni", cerita_alumni: "Cerita alumni", kerangka_mutu: "Kerangka mutu", standar_mutu: "Standar mutu", indikator_mutu: "Indikator mutu", evaluasi_indikator: "Evaluasi indikator", bukti_mutu: "Bukti mutu", tautan_bukti_mutu: "Tautan bukti", temuan_mutu: "Temuan mutu", rencana_perbaikan: "Rencana perbaikan",
  pelanggaran_siswa: "Pelanggaran siswa", prestasi_siswa: "Prestasi siswa", pembinaan_siswa: "Pembinaan siswa", rujukan_bk: "Rujukan BK", jenis_pelanggaran: "Aturan pelanggaran",
  absensi_siswa: "Absensi siswa", absensi_pegawai: "Kehadiran pegawai", absensi_jp: "Absensi per jam", jurnal_jp: "Jurnal mengajar", izin_ortu: "Izin orang tua",
  pengajuan_koreksi: "Koreksi absensi", pengajuan_izin_pegawai: "Izin pegawai", penugasan_mengajar: "Penugasan mengajar", hero_slide: "Foto pembuka", pengaturan_situs: "Tampilan website",
  visual_akun: "Visual website",
};

/** Label singkat aksi (dipakai sebagai pilihan saringan di halaman Log Aktivitas) */
export const AKSI_AUDIT: Record<string, string> = {
  INSERT: "Tambah", UPDATE: "Ubah", DELETE: "Hapus", EKSPOR: "Ekspor data", LIHAT: "Lihat berkas", CETAK: "Cetak",
  LOGIN: "Masuk", LOGOUT: "Keluar", LOGIN_GAGAL: "Gagal masuk", KEAMANAN: "Keamanan akun", RESET_DIMINTA: "Minta atur ulang sandi",
};

export const PERISTIWA_AUDIT: Record<string, string> = {
  sandi_diubah: "ganti kata sandi", sandi_direset: "sandi diatur ulang admin", sandi_lupa: "atur ulang sandi lewat email",
  mfa_aktif: "aktifkan verifikasi dua langkah", mfa_dihapus: "hapus autentikator", mfa_direset: "reset verifikasi dua langkah",
  keluar_semua: "keluar dari semua perangkat", tautan_reset: "kirim tautan atur ulang", wajib_mfa: "ubah peran wajib MFA",
};

/** Kata kerja pasif untuk perubahan data, mis. "Berita diubah" */
const AKSI_DATA: Record<string, string> = { INSERT: "ditambahkan", UPDATE: "diubah", DELETE: "dihapus", EKSPOR: "diekspor", LIHAT: "dibuka", CETAK: "dicetak" };

const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Kalimat aktivitas yang mudah dibaca, mis. tabel "auth" + aksi "LOGOUT" → "Keluar dari akun". */
export function kalimatAktivitas(a: { tabel: string; aksi: string; data_baru?: Record<string, unknown> | null }) {
  switch (a.aksi) {
    case "LOGIN":
      return "Masuk ke akun";
    case "LOGOUT":
      return "Keluar dari akun";
    case "LOGIN_GAGAL":
      return "Percobaan masuk gagal";
    case "RESET_DIMINTA":
      return "Meminta atur ulang kata sandi";
    case "KEAMANAN": {
      const p = String(a.data_baru?.peristiwa ?? "");
      return kapital(PERISTIWA_AUDIT[p] ?? "Perubahan keamanan akun");
    }
  }
  const tabel = TABEL_AUDIT[a.tabel] ?? a.tabel.replace(/_/g, " ");
  const kerja = AKSI_DATA[a.aksi];
  return kerja ? `${kapital(tabel)} ${kerja}` : `${kapital(tabel)} · ${AKSI_AUDIT[a.aksi] ?? a.aksi}`;
}

/** Waktu dalam format Indonesia & zona waktu sekolah, mis. "15 Okt 2026, 07.12" */
export function waktuWIB(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}
