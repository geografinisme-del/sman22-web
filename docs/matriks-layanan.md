# Matriks menu & kartu Ringkasan per peran (USULAN — menunggu persetujuan)

Tanda: **✓** tampil · **—** tidak · **Δ** berubah dari kondisi production sekarang (A3, `dpl_6KomU5xpkdLBer9UXdTa1H9aZQcd`).
Satu akun dengan beberapa peran = gabungan semua kolom ✓-nya.

## 0. Penyebab ketidakcocokan yang ditemukan

1. **Menu bergantung pada tautan akun ke data pegawai** (`pegawai_saya`), bukan pada peran. Saat "Lihat sebagai…",
   tautannya milik akun super admin (tidak ada), sehingga Presensi Saya, Rujukan BK Saya, Tukar Jam, dan grup Mengajar
   hilang. Akun asli yang belum ditautkan operator juga kehilangan menu itu.
   → **Aturan baru:** menu ditentukan PERAN; halaman sendiri menampilkan "akun belum tertaut ke data pegawai" bila perlu.
2. **Tidak ada pembeda pendidik/tendik:** Jadwal Saya & Lapor Pelanggaran tampil untuk semua GTK (termasuk pustakawan).
3. **"Per Jam Pelajaran" ada di grup Absensi** untuk semua pemegang `absensi.lihat` (termasuk piket).
4. **"Terakhir dibuka"** (4 menu terakhir dari peramban ini, judul kecil) tampil di atas Ringkasan dan menduplikasi menu
   di bawahnya → **dihapus** (pencarian menu "/" tetap ada).
5. **Kartu Ringkasan** belum ada untuk pustakawan, pegawai umum, literasi, keuangan, tim mutu, auditor, admin alumni.

## 1. Dasar peran

| Dasar | Peran |
|---|---|
| **PENDIDIK** | guru, wali_kelas, piket, bk, waka_kurikulum, waka_kesiswaan, waka_sarpras, waka_humas, kepala_sekolah, literasi (koordinator literasi = guru) |
| **TENAGA KEPENDIDIKAN** | operator (TU), pustakawan, laboran, pegawai (umum: satpam, caraka, sopir, …), keuangan |
| **Tugas tambahan tanpa dasar sendiri** | super_admin, tim_mutu, auditor, admin_alumni → dasar mengikuti peran lain akun itu; bila tidak ada peran lain → TENDIK |

## 2. "Layanan saya" + grup "Mengajar"

L1 Presensi Saya · L2 Kalender Sekolah · L3 Lapor Kerusakan · L4 Peminjaman Ruang/Barang · L5 Pinjaman Perpustakaan Saya ·
L6 Pengaduan Ditugaskan (hanya bila ia PIC sebuah pengaduan) · P1 Jadwal Saya · P2 Tukar Jam · P3 Rujukan BK Saya ·
P4 Lapor Pelanggaran/Prestasi · **M** = grup Mengajar (Jadwal Pelajaran, **Per Jam Pelajaran** Δ, Perangkat Ajar, Materi,
Kelas Digital, Struktur Kurikulum, CP/TP/ATP, Kokurikuler, Supervisi Saya)

| Peran | L1 | L2 | L3 | L4 | L5 | L6 | P1 | P2 | P3 | P4 | M |
|---|---|---|---|---|---|---|---|---|---|---|---|
| guru | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | ✓ | ✓ Δ¹ | ✓ Δ¹ | ✓ | ✓ Δ¹ |
| wali_kelas | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | ✓ | ✓ Δ¹ | ✓ Δ¹ | ✓ | ✓ Δ¹ |
| piket | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | ✓ | ✓ Δ¹ | ✓ Δ¹ | ✓ | ✓ Δ¹ |
| bk | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | (grup Pengaduan) | ✓ | ✓ Δ¹ | — (BK mengelola Rujukan) | ✓ | ✓ Δ¹ |
| waka_kurikulum / kesiswaan / humas | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | ✓ | ✓ Δ | ✓ Δ | ✓ | ✓ Δ |
| waka_sarpras | ✓ Δ¹ | ✓ | (grup Sarpras) | (grup Sarpras) | ✓ | PIC | ✓ | ✓ Δ | ✓ Δ | ✓ | ✓ Δ |
| kepala_sekolah | ✓ Δ¹ | ✓ | (grup Sarpras: lihat) | (grup Sarpras) | ✓ | — (grup Humas) | ✓ | ✓ Δ | ✓ Δ | ✓ | ✓ Δ |
| literasi | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | ✓ Δ | ✓ Δ | ✓ Δ | ✓ | ✓ Δ |
| operator | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | — Δ | — | — Δ | — Δ | — |
| pustakawan | ✓ Δ¹ | ✓ | ✓ | ✓ | — (grup Perpustakaan) | PIC | — Δ | — | — Δ | — Δ | — |
| laboran | ✓ Δ¹ | ✓ | ✓ | (grup Laboratorium) | ✓ Δ | PIC | — | — | — | — | — |
| pegawai (umum) | ✓ Δ¹ | ✓ | ✓ | ✓ Δ | ✓ Δ | PIC | — | — | — | — | — |
| keuangan | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | — Δ | — | — Δ | — Δ | — |
| super_admin / tim_mutu / auditor / admin_alumni (tanpa peran lain) | ✓ Δ¹ | ✓ | ✓ | ✓ | ✓ | PIC | — Δ | — | — Δ | — Δ | — |

¹ sekarang hilang saat "Lihat sebagai…" / akun belum ditautkan (penyebab 1).
**Dihapus dari "Layanan saya"** (perlu persetujuan): *Tamu untuk Saya* (tamu tetap diberitahukan lewat notifikasi; daftar
tamu ada di Buku Tamu piket/TU), *Pojok Baca Saya* (pindah ke grup Mengajar bagi guru penanggung jawab pojok baca).

## 3. Grup bidang (tugas tambahan) & kartu Ringkasan

| Peran | Grup bidang (isi) | Kartu "Untuk peran Anda" |
|---|---|---|
| guru | — | Jadwal mengajar hari ini |
| wali_kelas | **Perwalian** Δ: Kelas Saya, Absensi Kelas, Izin dari Orang Tua, Pengajuan Koreksi, Rekap Absensi Kelas, SP & Panggilan Kelas, Prestasi & Poin Kelas (dulu sebagian di grup Absensi) | Kelas saya · Jadwal mengajar |
| piket | **Piket** Δ (menggantikan Absensi/Jadwal/Buku Tamu): Absensi Harian & Terlambat, Pengajuan Koreksi, Izin dari Orang Tua, Buku Tamu, Guru Pengganti — **tanpa Per Jam Pelajaran & Rekap** | Piket hari ini · Jadwal mengajar |
| bk | Bimbingan Konseling; Kesiswaan (Rujukan BK); **Absensi** (SP & Panggilan, Rekap) Δ tanpa Per Jam Pelajaran; Pengaduan; Data Induk; Alumni (lihat) | BK · Jadwal mengajar |
| waka_kurikulum | Kurikulum; Jadwal; Data Induk; Mutu (lihat); Perpustakaan (lihat) | Kurikulum & jadwal · Jadwal mengajar |
| waka_kesiswaan | Kesiswaan; Absensi (semua, termasuk Pengaturan Absensi) Δ tanpa Per Jam Pelajaran; Ekskul & OSIS; Pengaduan; Data Induk | Kesiswaan & disiplin · Jadwal mengajar |
| waka_sarpras | Sarpras (Inventaris, Peminjaman, Laporan Kerusakan) | Sarpras · Jadwal mengajar |
| waka_humas | Humas; Website; Alumni | Humas · Jadwal mengajar |
| kepala_sekolah | Absensi (lihat, Kehadiran Guru, Izin Guru & Pegawai) Δ tanpa Per Jam Pelajaran; Kesiswaan (lihat, Statistik BK); Kurikulum (Supervisi); Humas (lihat); Sarpras (lihat); Perpustakaan (lihat); Ekskul & OSIS (lihat, anggaran); Alumni (lihat); Mutu (lihat); Website (Persetujuan Konten); Data Induk; Pengaturan (Log Aktivitas, Log Akses BK) | Ringkasan semua bidang · Jadwal mengajar |
| literasi | Perpustakaan (Literasi, Pojok Baca) | **Literasi** Δ (jurnal baca menunggu, tantangan aktif) · Jadwal mengajar |
| operator | Data Induk; Pengaturan (Akun Portal, Pengguna & Peran); Absensi (Kehadiran Guru, Izin Guru & Pegawai, Jam Kerja Pegawai, Absensi Siswa & Rekap: lihat) Δ tanpa Per Jam Pelajaran; Sarpras (lihat); Buku Tamu | **Tata usaha** Δ (akun menunggu verifikasi, siswa aktif tanpa kelas, siswa tanpa akun portal) |
| pustakawan | Perpustakaan (Sirkulasi, Katalog, Laporan & Denda, Literasi, Pojok Baca) | **Perpustakaan** Δ (buku sedang dipinjam, lewat jatuh tempo, denda belum lunas, kunjungan hari ini) |
| laboran | **Laboratorium** (Inventaris, Jadwal & Peminjaman Lab) | **Laboratorium** Δ (peminjaman lab menunggu, jadwal lab hari ini, barang lab rusak) |
| pegawai (umum) | — | **Hari ini** Δ (status presensi saya hari ini, jadwal piket/shift, pengumuman terbaru) |
| keuangan | Ekskul & OSIS (Pengajuan Kegiatan — anggaran) | **Anggaran kegiatan** Δ (pengajuan menunggu keputusan anggaran) |
| tim_mutu / auditor | Mutu | **Mutu** Δ (evaluasi menunggu tinjauan, temuan terbuka, rencana perbaikan jatuh tempo) |
| admin_alumni | Alumni | **Alumni** Δ (pendaftaran menunggu verifikasi, permintaan layanan) |
| super_admin | semua grup sesuai izin A2 | Administrasi sistem |

Grup **Akun saya** (Profil Saya, Direktori GTK, Keamanan Akun) tetap untuk semua.

## 4. Uji otomatis (setelah disetujui)

- Matriks ini ditulis juga sebagai data uji (`scripts/uji-e2e/matriks-layanan.mjs`): untuk SETIAP peran, daftar grup +
  item menu (href) yang tampil saat "Lihat sebagai…" harus **persis sama** (tidak lebih, tidak kurang), dan kartu
  Ringkasan harus persis sesuai kolom kartu.
- URL halaman bidang yang tidak ada di menu sebuah peran dibuka langsung → ditolak server.
- Screenshot "Lihat sebagai…" semua peran 1440/390 px (halaman penuh).

## 5. Keputusan yang perlu Anda ambil

1. **Klasifikasi peran ambigu:** `literasi` = pendidik? `keuangan` = tendik? `tim_mutu`, `auditor`, `admin_alumni`,
   `super_admin` mengikuti peran lain (default tendik)? Usulan: **ya** untuk semuanya.
2. **Waka & kepala sekolah** mendapat grup Mengajar & Layanan pendidik (Jadwal Saya, Tukar Jam, …) karena mereka juga
   guru. Usulan: **ya** (sesuai aturan Anda: pendidik).
3. Hapus *Tamu untuk Saya* & pindahkan *Pojok Baca Saya* ke Mengajar. Usulan: **ya**.
4. Hapus bagian "Terakhir dibuka". Usulan: **ya** (alternatif: tetap, dengan judul "Terakhir Anda buka" dan tanpa menu
   yang sudah terlihat di bawahnya).
5. Piket: grup tersendiri "Piket" (bukan "Absensi" + "Jadwal" + "Buku Tamu"). Usulan: **ya**.
