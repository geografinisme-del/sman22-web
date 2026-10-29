# Usulan A2 — Hak akses per bidang (menunggu persetujuan)

Dasar: audit A1 (`docs/audit-hak-akses.md`) + keputusan pemilik 29 Okt 2026.
Production saat ini: 1 akun (super admin), 0 siswa, 0 pengaduan, 0 rujukan BK — risiko migrasi data kecil.

Diusulkan **dua tahap migrasi**:
- **A2a** `20261229000000_hak_akses_bidang.sql` (draf terlampir): peran per bidang, izin, BK, pengaduan, operator,
  log aktivitas, menu.
- **A2b** (rancangan di bawah, migrasi menyusul): pembatasan kolom data pribadi siswa/orang tua/pegawai. Perubahan kodenya
  besar (semua halaman yang menampilkan nama siswa), jadi dipisah; **harus selesai sebelum impor data SABDA 22 (B3)**.

## 1. Matriks baru (setelah A2a)

**K** kelola, **L** lihat, **T** setujui/terbitkan, **R** rahasia, **M** metadata saja, **—** tidak ada.
`guru`, `wali_kelas`, `pegawai`, `siswa`, `orang_tua`, `alumni` tetap tanpa izin (akses lewat relasi). Peran lain yang
tidak disebut (pustakawan, literasi, auditor, keuangan, tim_mutu, admin_alumni, laboran, piket, bk) **tidak berubah**.

| Peran | Website | Data induk¹ | Akun & peran | Log | Kurikulum | Jadwal | Kalender | Supervisi | Absensi siswa | SP/Disiplin | Poin | BK isi | BK agregat | Rujukan BK | Pengaduan biasa | Pengaduan rahasia | Humas | Sarpras | Ekskul | Alumni | Mutu | Pegawai |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| super_admin | K+T | K | K (semua) | L | K | K | K | K | K | K | K | — | L | **—** | **M** | **M** | K | K | K | K | K | K+T |
| kepala_sekolah | **T** | L¹ | — | L | — | — | — | **K** (setujui) | L | L | L | — | L | — | **L** | **L** | **L** | L | L (+anggaran) | L | **L** | L+**T** |
| operator (TU) | — | K | **K dasar²** | — | — | **— ³** | — | — | L (**atur dicabut³**) | — | — | — | — | — | — | — | — | L | — | — | — | K |
| waka_kurikulum | — | L¹ | — | — | K | K | K | K | — | — | — | — | — | — | — | — | — | — | — | — | L | — |
| waka_kesiswaan | — | L¹ | — | — | — | — | — | — | K (+atur) | K | K | — | — | — | — | **K** | — | — | K | — | — | — |
| waka_sarpras | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | K | — | — | — | — |
| waka_humas | K | — | — | — | — | — | **— (dicabut)** | — | — | — | — | — | — | — | **K** | — | K | — | — | K | — | — |
| bk (tetap) | — | L¹ | — | — | — | — | — | — | L | K | L | **K** | L | **K** | — | **K** | — | — | — | L | — | — |

¹ Setelah A2b: lengkap hanya operator, waka_kesiswaan, bk; kepala & waka lain ringkasan + detail tercatat; waka_kurikulum
data akademik saja (lihat bagian 4).
² Peran dasar = guru, wali_kelas, piket, pegawai, laboran, siswa, orang_tua. Akun yang punya peran lain tidak bisa disentuh
operator (dijaga database).
³ Usulan saya (perlu keputusan, lihat bagian 6): jadwal → waka_kurikulum, pengaturan absensi → waka_kesiswaan.

Ruang kerja & menu mengikuti matriks: Wakasek Sarpras hanya melihat Sarpras, tidak lagi Kurikulum/BK.

## 2. Isi migrasi A2a (ringkas) + RLS

| Bagian | Perubahan | RLS / penjaga |
|---|---|---|
| A | Batal bila masih ada akun `wakasek` (production: 0) | — |
| B | Izin baru: `humas.lihat`, `pengaduan.lihat`, `pengaduan.metadata`, `pengguna.kelola_dasar` | — |
| C | Ganti kode: kurikulum→waka_kurikulum, kesiswaan→waka_kesiswaan, sarpras→waka_sarpras, humas→waka_humas (akun dipindahkan, label "Wakasek …"); `wakasek` dihapus | Fungsi yang menyebut "kurikulum/sarpras/humas/kesiswaan" adalah **kategori notifikasi**, bukan kode peran — tidak perlu diubah |
| D | Daftar izin lengkap untuk super_admin, kepala_sekolah, operator, 4 waka | — |
| E | Rujukan BK | `rujukan_bk` SELECT: `bk.rujukan` **atau** `dirujuk_oleh = auth.uid()`; super admin tidak lagi punya `bk.rujukan` |
| F | Pengaduan | ubah: biasa = `pengaduan.kelola` (waka_humas), rahasia = `pengaduan.rahasia` (bk, waka_kesiswaan), PIC tetap; baca = itu + `pengaduan.lihat` (kepala); view `pengaduan_ringkas` (tiket, kategori, status, tanggal — tanpa isi/nama/kontak/catatan) untuk `pengaduan.metadata` (super admin) |
| G | Kepala sekolah lihat humas | SELECT baru dengan `humas.lihat` pada kemitraan, kegiatan_mitra, kontak_media, survei, jawaban_survei, buku_tamu |
| H | Operator kelola akun dasar | `pengguna`/`pengguna_peran`: `pengguna.kelola` **atau** (`pengguna.kelola_dasar` + peran dasar + akun target tidak "dilindungi"); semua perubahan sudah tercatat di log (trigger audit yang ada) |
| I | **Log aktivitas** (temuan baru, lihat bawah) | `catat_audit()` menyimpan hanya id + nama kolom yang berubah untuk siswa, orang_tua, siswa_orang_tua, pegawai, pengaduan, rujukan_bk, tindak_lanjut_bk, rujukan_eksternal_bk, pelanggaran_siswa, pembinaan_siswa, izin_ortu; 15 catatan lama disamarkan |

**Temuan baru saat menyusun A2:** pencatat log aktivitas menyimpan **salinan lengkap baris** — termasuk isi pengaduan
rahasia, alasan rujukan BK, dan data pribadi siswa — dan log itu bisa dibaca super admin & kepala sekolah. Tanpa bagian I,
semua pembatasan di atas bisa dilewati lewat halaman "Log Aktivitas". Penyamaran 15 catatan lama **tidak bisa dibatalkan**
kecuali dari backup (backup dibuat sebelum migrasi).

Rollback: `supabase/rollback/rollback_20261229_hak_akses_bidang.sql` (semua kecuali isi log yang sudah disamarkan).

## 3. Perubahan kode (rilis bersama A2a)

- Kode peran baru di `NAMA_PERAN`, `PERAN_PANEL`, `PERAN_STAF`, `PERAN_PIMPINAN` (wakasek dihapus), pemilih "Lihat
  sebagai…", akun uji lokal & skrip reset, uji unit.
- **Sidebar:**
  - grup "Pengaturan" pribadi → **"Akun saya"** (Profil Saya, Direktori GTK, Keamanan Akun);
  - "Pengaturan" hanya berisi Pengguna & Peran / Akun Portal / WhatsApp & Email / Log untuk yang berizin;
  - menu tanpa izin disembunyikan, kecuali layanan semua GTK: Profil, Jadwal Saya, Presensi Saya, Lapor Kerusakan,
    Lapor Pelanggaran;
  - menu mengajar (Perangkat Ajar, Materi, Kelas Digital) tetap untuk akun yang punya tugas mengajar;
  - grup BK hanya untuk peran bk; angka BK agregat pindah ke Ringkasan (A3);
  - "Log Akses BK" pindah ke grup Pengaturan untuk pemegang `audit.baca`.
- **Penjaga server** untuk modul yang menunya disembunyikan (Struktur Kurikulum, Kokurikuler, Inventaris, Katalog/Sirkulasi
  Perpus, Prestasi & Poin): buka URL langsung tanpa izin → ditolak di server.
- **Pengguna & Peran untuk operator:**
  - daftar peran yang bisa dipilih hanya peran dasar;
  - reset sandi & ubah akun ditolak untuk akun dilindungi (dicek di server action + database);
  - reset MFA tetap super admin.
- **Pengaduan:**
  - kepala sekolah baca saja (formulir tindak lanjut disembunyikan);
  - super admin melihat daftar dari `pengaduan_ringkas`.
- **Rujukan BK:** guru melihat status rujukannya sendiri.

## 4. Rancangan A2b — data pribadi (migrasi terpisah, menyusul)

**Rekomendasi teknis: view kolom terbatas + RPC tercatat**, bukan RLS per kolom. Postgres tidak punya RLS per kolom per
pengguna (semua pengguna = peran database `authenticated`), dan `GRANT` per kolom tidak bisa membedakan guru vs operator.

| Lapisan | Isi | Siapa |
|---|---|---|
| Tabel `siswa`, `orang_tua`, `siswa_orang_tua` (lengkap: alamat, HP, email, tempat/tgl lahir, orang tua) | RLS SELECT: `data_induk.baca` (operator, waka_kesiswaan, bk), wali kelas → kelasnya, siswa → dirinya, orang tua → anaknya | sesuai keputusan |
| View `siswa_akademik` (id, NISN, NIS, nama, jenis kelamin, status, kelas aktif) | izin baru `data_induk.akademik` atau salah satu di atas | guru, piket, wali kelas, waka_kurikulum, kepala, waka lain |
| RPC `detail_siswa(id, alasan)` | baris lengkap + orang tua; **setiap panggilan dicatat** (siapa, siswa mana, alasan, waktu) | kepala sekolah, waka lain, super admin (izin `data_induk.detail_tercatat`) |
| `pegawai` (telepon, email) | sama: lengkap untuk operator; direktori GTK lewat view tanpa kontak pribadi | — |

Konsekuensi:
- `bisa_lihat_siswa()` tidak lagi memberi data lengkap kepada piket (`absensi.kelola`); piket memakai view akademik.
- Super admin melepas `data_induk.baca`. Perbaikan data tetap lewat operator, dan detail lewat RPC tercatat.
  Perlu keputusan apakah super admin juga melepas `data_induk.kelola`.
- Halaman yang menampilkan nama siswa untuk peran non-lengkap (absensi, jadwal, LMS, kesiswaan, perpus, …) dialihkan ke
  `siswa_akademik`. Perkiraan 2–3 hari kerja + uji per peran.

## 5. Daftar uji (A4, diperluas untuk A2)

**Database** (`uji-hak-akses-db.mjs`, lokal; setiap peran login asli):
1. Setiap peran: `akses_saya().izin` = matriks bagian 1 persis.
2. **BK:** hanya bk yang bisa membaca `kasus_bk`/`sesi_konseling`/`rujukan_eksternal_bk`. `rujukan_bk` hanya terbaca
   oleh bk + guru pembuatnya (guru lain, super admin, kepala: 0 baris).
3. **Pengaduan rahasia:**
   - bk & waka_kesiswaan bisa membaca & mengubah;
   - kepala bisa membaca tetapi tidak bisa mengubah;
   - waka_humas tidak bisa membaca;
   - super admin hanya mendapat kolom metadata dari `pengaduan_ringkas` dan 0 baris dari `pengaduan`.
4. **Pengaduan biasa:** waka_humas K, kepala L, bk/waka_kesiswaan tidak (kecuali PIC).
5. **Operator:**
   - bisa membuat akun dan memberi/mencabut guru/wali_kelas/piket/pegawai/laboran/siswa/orang_tua;
   - **ditolak** untuk super_admin/kepala_sekolah/bk/waka_*/operator dan untuk mengubah atau mereset akun yang punya peran
     itu;
   - setiap perubahan muncul di `audit_log`.
6. Kepala sekolah: bisa membaca kemitraan/survei/kontak media, tetapi INSERT/UPDATE ditolak.
7. **Kalender:** waka_humas tidak bisa lagi menulis `kegiatan_kalender`; waka_kurikulum bisa.
8. **Log aktivitas:**
   - mengubah siswa/pengaduan/rujukan menghasilkan log tanpa nilai (hanya nama kolom);
   - catatan lama sudah disamarkan;
   - tabel non-sensitif tetap dicatat lengkap.
9. Regresi pratinjau (`uji-pratinjau-db`): tetap lulus dengan kode peran baru.
10. Pengguna biasa tetap bisa menulis datanya.

**Aplikasi** (`uji-hak-akses.mjs` + `uji-pratinjau.mjs` diperbarui):
11. Menu tiap peran = daftar yang diharapkan (termasuk "Akun saya", tanpa BK untuk non-BK).
12. Buka URL modul lain langsung → ditolak server (redirect "tanpa akses"/403), per peran.
13. "Lihat sebagai…" tiap peran: menu sama dengan login asli, pita menyebut nama peran spesifik ("Wakasek Sarpras"),
    tetap hanya-baca.
14. Screenshot "Lihat sebagai" tiap peran 1440 px & 390 px.
15. Semua uji lama lulus.

## 6. Keputusan yang masih perlu Anda ambil

1. **Operator:** cabut `jadwal.kelola` (→ waka_kurikulum saja) dan `absensi.atur` (→ waka_kesiswaan saja)? Usulan: **ya**.
2. **Super admin & pengaduan biasa:** hanya metadata juga (seperti rahasia), atau tetap boleh menangani pengaduan biasa?
   Usulan: **metadata saja**.
3. **waka_humas & Website:** peran `humas` lama juga "Admin Konten" (berita, galeri). Tetap satu peran, atau dibuat peran
   terpisah `admin_konten` untuk staf yang hanya mengurus website? Usulan: tetap satu dulu; pisahkan bila ada staf
   khusus.
4. **Layanan umum GTK:** selain 5 yang Anda sebut, apakah **Peminjaman Ruang/Barang**, **Kalender Sekolah**, **Direktori
   GTK**, dan **Perpustakaan (pinjaman saya)** tetap tampil untuk semua GTK? Usulan: **ya** (semuanya layanan pribadi).
5. **A2b:** super admin juga melepas `data_induk.kelola` (perubahan data oleh operator saja)? Usulan: **ya**, dengan RPC
   tercatat untuk perbaikan darurat.
