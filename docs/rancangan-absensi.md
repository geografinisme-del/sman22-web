# Rancangan pindah absensi dari SABDA 22 + PWA (Bagian B)

Status: **B1 bagian 1 (audit platform) selesai**. Bagian berikutnya (pemetaan SABDA 22, aturan B2, migrasi data B3,
cadangan B4, PWA B5, keluaran B6) menyusul setelah berkas SABDA 22 diperiksa. Dokumen ini RANCANGAN — tidak ada kode atau
database yang diubah. Tidak memuat data siswa.

## B1.1 Audit fitur kehadiran yang SUDAH ada di platform (30 Okt 2026)

Sumber: skema database lokal (sama dengan production), migrasi `20261010_absensi`, `20261012_portal`,
`20261019_absensi_lanjutan`, `20261022_kesiswaan`, kode halaman `src/app/admin/(panel)/absensi/**`, `portal/**`.

### Tabel & aturan

| Kebutuhan | Yang sudah ada | Catatan |
|---|---|---|
| Absensi harian siswa | `absensi_siswa` (siswa, tanggal, status **S/I/A/T/PC**, jam, keterangan, `sumber` wali_kelas/piket/admin/koreksi/**impor**, pencatat) | Hanya mencatat yang TIDAK hadir/terlambat (hadir = tidak ada baris). Sumber `impor` sudah disiapkan. |
| Tanda kelas sudah dicek | `absensi_kelas_harian` (kelas, tanggal, dicek_oleh/pada) | Dipakai Ringkasan "x dari y kelas sudah diabsen". |
| Absensi per jam pelajaran | `absensi_jp` (+ `jurnal_jp` materi & jumlah hadir), RPC `simpan_absensi_jp` | Hanya pengajar jam itu; batas isi **2 hari**. Status S/I/A/T/D. |
| Hak catat & batas waktu | `bisa_catat_absensi(siswa, tgl)` | `absensi.kelola` (piket, kesiswaan, admin) kapan saja ≤ hari ini; **wali kelas hanya pekan berjalan** untuk kelasnya. ✓ sesuai aturan SABDA. |
| Koreksi pekan lalu | `pengajuan_koreksi` (status lama→baru, alasan, bukti, menunggu/disetujui/ditolak) + `notif_koreksi` | Notifikasi ke pemegang `absensi.kelola` (piket/kesiswaan/admin); hasil diberitahukan ke pengaju; riwayat tersimpan. ✓ |
| Izin/sakit dari orang tua | `izin_ortu` (S/I, rentang ≤ 14 hari, bukti) + `proses_izin_ortu` | Diajukan dari portal orang tua (maks. 3 hari setelah / 30 hari sebelum); diproses wali kelas atau `absensi.kelola`; bila diterima, mengisi `absensi_siswa` per hari sekolah. |
| SP & pemanggilan | `aturan_disiplin` (alpa 3/6/9 → SP1–3; terlambat 3/6/9 → Panggilan Ortu 1–3, 12/15/18 → SP1–3), `status_disiplin()`, `notif_ambang_absensi` | ✓ sama dengan aturan SABDA. Notifikasi otomatis ke kesiswaan/BK (`disiplin.kelola`), wali kelas, **dan orang tua** saat ambang tercapai. |
| Tindak lanjut disiplin | `tindak_lanjut_disiplin` (jenis, ambang, label, jumlah saat itu, catatan, dikonfirmasi oleh/pada) | Status "sudah ditindak" = ada baris. **Belum ada** kolom rekomendasi tindakan & keterangan tindakan terpisah, warna hijau di UI perlu dicek. |
| Hitungan per tahun ajaran | `tahun_ajaran.mulai_hitung_absensi` (tanggal diatur admin), hari libur dikecualikan | ✓ reset per tahun ajaran; riwayat tahun lalu TETAP tersimpan (baris tidak dihapus), tetapi **belum ada tampilan riwayat lintas tahun** untuk kenaikan kelas/kelulusan. |
| Hari sekolah & libur | `pengaturan_absensi` (jam masuk batas, hari sekolah, lokasi & radius, retensi swafoto), `hari_libur`, kalender `kbm_libur` | |
| Pelanggaran & prestasi berpoin | `jenis_pelanggaran` (kategori, poin, versi), `pelanggaran_siswa`, `prestasi_siswa` (tingkat, peringkat, poin, organisasi), `aturan_poin_prestasi`, `aturan_tindakan_poin`, `rekap_poin()` | Poin bersih = pelanggaran − prestasi (sakelar `prestasi_kurangi_poin`). **Belum**: batas pengurangan maks. 50%, pembedaan prestasi lomba vs perilaku & siapa yang boleh mengisi, pelanggaran Berat → SP langsung. |
| Pembinaan | `pembinaan_siswa` (jenis, uraian, tindak lanjut, status) | |
| Rekap & unduh | Halaman Rekap Absensi + ekspor **.xlsx** per kelas & rentang tanggal (`rekap_absensi_kelas`) | **Belum**: rekap per siswa lintas bulan/tahun dan rekap harian seluruh sekolah dalam satu unduhan. |
| Portal siswa & orang tua | Beranda portal (rekap bulan ini), **Kalender Kehadiran** per anak, Karakter (poin), Izin (pengajuan ortu), Notifikasi | Menampilkan data asli dari tabel di atas (bukan data contoh) — siap begitu data diimpor. |
| Kehadiran mandiri | **QR di kelas** (`/portal/scan`, token dari guru, per jam pelajaran) | Ada untuk siswa per JP; belum untuk absensi harian. |
| Presensi pegawai (pola PWA) | `absensi_pegawai` dengan **swafoto + jarak dari sekolah** (`lokasi_lat/lng/radius`, `retensi_swafoto_hari`) | Pola geofence + swafoto SUDAH berjalan untuk guru/pegawai → dapat dipakai ulang untuk siswa (B5). |

### Halaman yang ada

- **Admin:**
  - Absensi Siswa (per kelas, form terlambat), Per Jam Pelajaran, Rekap (+ ekspor), Pengajuan Koreksi,
    Izin dari Orang Tua, SP & Panggilan Ortu, Pengaturan Absensi;
  - Kehadiran Guru (+ jam kerja), Presensi Saya (swafoto + lokasi);
  - Kelas Saya (wali), Prestasi & Poin, Lapor Pelanggaran/Prestasi, Aturan Poin.
- **Portal:** beranda, anak/[id] (kalender kehadiran), karakter, izin, scan (QR), notifikasi.
- **Ringkasan (A3):** kartu piket (terlambat, pengajuan), wali kelas (kelas saya), kesiswaan (SP/panggilan).

### Peran yang sudah tersedia untuk absensi
`piket`, `wali_kelas`, `waka_kesiswaan`, `bk`, `operator`/`super_admin` (admin), `guru` (per JP), `siswa`,
`orang_tua` — semua ada setelah A2a.

### Celah awal terhadap kebutuhan B2 (sementara, dilengkapi setelah membaca SABDA 22)

1. Tindak lanjut disiplin: kolom **rekomendasi tindakan**, keterangan tindakan, status Belum/Sudah Ditindak eksplisit.
2. Prestasi: jenis **lomba vs perilaku** + siapa yang boleh mengisi masing-masing; batas pengurangan poin **maks. 50%**;
   prestasi tercatat juga pada kasus Alpa/Terlambat.
3. Pelanggaran **Berat** langsung SP bertahap.
4. Tampilan riwayat Alpa/Terlambat **lintas tahun ajaran** (kenaikan kelas/kelulusan).
5. Rekap harian sekolah & per siswa, cepat di HP.
6. Izin keluar kelas (belum ada).
7. Absensi mandiri harian lewat PWA (swafoto + geofence) untuk siswa — pola sudah ada di presensi pegawai.
8. Jembatan data dengan SABDA 22 (salin harian platform → SABDA, impor balik dari SABDA saat gangguan).

### Berkas SABDA 22 yang tersedia (belum dibaca)
`D:\PROJEK CLAUDE CODE\sabda22-ekspor\` (di LUAR repo, juga masuk `.gitignore`):
- `CODEBARU1.gs` (±650 KB), `INDEXBARU1.html` (±1,1 MB), `SABDA 22.xlsx` (±3,9 MB).
- Nama berkas kode memakai akhiran "1" (bukan `CODEBARU.gs`/`INDEXBARU.html`) — perlu konfirmasi bahwa ini versi yang
  benar sebelum dipetakan.
