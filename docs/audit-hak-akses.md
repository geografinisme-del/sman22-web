# Audit hak akses per peran (A1) — 29 Okt 2026

Sumber: tabel `peran` & `peran_izin` di database production (dibaca saja), kebijakan RLS, `src/app/admin/(panel)/layout.tsx`
(sidebar), `src/lib/ruang-kerja.ts`, halaman Ringkasan. Production saat ini hanya punya 1 akun (super admin).

Keterangan: **K** = kelola, **L** = lihat, **T** = terbitkan/setujui, **R** = rahasia, **—** = tidak ada.
Peran tanpa izin sama sekali (akses lewat relasi, mis. wali kelas → kelas perwaliannya): `guru`, `wali_kelas`, `pegawai`,
`siswa`, `orang_tua`, `alumni`.

## Matriks izin

| Peran | Website | Data induk | Akun portal | Pengguna & Peran | Log aktivitas | Kurikulum | Jadwal | Kalender | Supervisi | Absensi siswa | SP/Disiplin | Poin kesiswaan | BK isi kasus | BK agregat | Rujukan BK | Pengaduan | Humas | Sarpras | Perpus/Literasi | Ekskul | Alumni | Mutu | Absensi & izin pegawai | Buku tamu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| super_admin | K+T | K | K | **K** | L | K | K | K | K | K (+atur) | K | K | — | L | **L** | K+R | K | K | K | K | K | K | K+T | K |
| kepala_sekolah | T | L | — | — | L | — | — | — | K | L | L | L | — | L | — | **K+R** | **K** | L | L | L (+anggaran) | L | **K** | L+T | — |
| **wakasek** | — | L | — | — | — | **K** | — | **K** | — | L | L | L | — | **L** | — | — | — | L | — | L | — | L | — | — |
| operator (TU) | — | K | K | — | — | — | **K** | — | — | L (+**atur**) | — | — | — | — | — | — | — | L | — | — | — | — | K | K |
| kurikulum ("Wakasek Kurikulum") | — | L | — | — | — | K | K | K | K | — | — | — | — | — | — | — | — | — | L | — | — | L | — | — |
| sarpras ("Wakasek Sarpras") | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | K | — | — | — | — | — | — |
| kesiswaan | — | L | — | — | — | — | — | — | — | K (+atur) | K | K | — | — | — | **R** | — | — | — | K | — | — | — | — |
| humas ("Humas / Admin Konten") | K | — | — | — | — | — | — | K | — | — | — | — | — | — | — | K | K | — | — | — | K | — | — | K |
| piket | — | — | — | — | — | — | pengganti | — | — | K | — | — | — | — | — | — | — | — | — | — | — | — | — | K |
| bk | — | L | — | — | — | — | — | — | — | L | **K** | L | **K** | L | L | R | — | — | — | — | L | — | — | — |
| pustakawan | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | K | — | — | — | — | — |
| literasi | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | literasi K, perpus L | — | — | — | — | — |
| auditor | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | audit | — | — |
| keuangan | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | anggaran+L | — | — | — | — |
| tim_mutu | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | K | — | — |
| admin_alumni | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | K | — | — | — |
| laboran | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | L (+inventaris) | — | — | — | — | — | — |

Menu yang **selalu** tampil untuk semua GTK (tanpa izin, layanan umum): Jadwal Saya/Kalender, Struktur Kurikulum &
Projek Kokurikuler, Peminjaman Ruang/Barang & Laporan Kerusakan, Perpustakaan (Pinjaman Saya), Lapor
Pelanggaran/Prestasi, Presensi Saya, dan grup "Pengaturan" berisi Profil Saya, Direktori GTK, Keamanan Akun.

## Kebijakan data BK (RLS)

| Tabel | Siapa yang bisa membaca |
|---|---|
| `kasus_bk`, `sesi_konseling`, `rujukan_eksternal_bk` | hanya `bk.konseling` → **hanya peran bk** (super admin tidak) |
| `permintaan_konseling` | `bk.konseling` atau pengaju sendiri |
| `rujukan_bk` (rujukan guru → BK, berisi uraian masalah siswa) | `bk.rujukan` → bk **dan super_admin** |
| `log_akses_bk` (siapa membuka kasus apa) | `bk.konseling` atau `audit.baca` → bk, **super_admin, kepala_sekolah** |
| `statistik_bk()` (laporan agregat) | `bk.agregat`; angka < 3 disembunyikan |

## Temuan yang mencurigakan / perlu keputusan

1. **`wakasek` terlalu luas dan tidak berbidang.** Satu peran untuk semua wakil kepala sekolah, tetapi bisa
   *mengelola* kurikulum dan kalender, serta melihat data induk, absensi, disiplin, poin, ekskul, sarpras, mutu, dan BK
   agregat. Akibatnya Waka Sarpras pun bisa mengubah struktur kurikulum.
2. **Kenapa wakasek seluas itu:** peran dibuat 8 Okt sebagai pimpinan "melihat seluruh data induk"; setiap migrasi modul
   berikutnya menambahkan wakasek sebagai pembaca (absensi, kesiswaan, ekskul, sarpras, mutu, BK agregat), dan migrasi
   kurikulum (20261029) memberinya `kurikulum.kelola`, migrasi kalender (20261026) `kalender.kelola`. Di kode, wakasek juga
   dihitung "pimpinan" (`PERAN_PIMPINAN`) sehingga selalu mulai di Ringkasan.
3. **Sidebar "Bimbingan Konseling" pada wakasek** berasal dari `bk.agregat` → hanya "Laporan BK (agregat)" berisi angka.
   Isi kasus tetap tertutup (RLS). Tetap mengecoh dan sebaiknya dipindah ke Ringkasan (angka) saja.
4. **"Pengaturan" muncul di semua peran** karena Profil Saya, Direktori GTK, Keamanan Akun ditaruh di grup itu.
   "Pengguna & Peran" dan "WhatsApp & Email" hanya untuk `pengguna.kelola` (= super_admin saja). Jadi masalah label,
   bukan kebocoran — tetapi `operator` saat ini **tidak** bisa membuka Pengguna & Peran.
5. **Data sensitif BK di luar peran BK:** super admin bisa membaca `rujukan_bk` (uraian masalah siswa dari guru);
   super admin & kepala sekolah bisa membaca `log_akses_bk` (metadata siapa membuka kasus siapa).
6. **Kepala sekolah punya hak kelola**, bukan hanya ringkasan: humas, pengaduan (termasuk rahasia), mutu, supervisi,
   persetujuan konten & izin pegawai.
7. **Operator (TU)** bisa mengelola jadwal pelajaran dan pengaturan absensi (`jadwal.kelola`, `absensi.atur`) — tumpang
   tindih dengan Kurikulum dan Kesiswaan.
8. **`data_induk.baca` luas:** super admin, kepala sekolah, wakasek, operator, kurikulum, kesiswaan, bk membaca seluruh
   data pribadi siswa & pegawai (bukan hanya kelas/bidangnya).
9. **Pengaduan rahasia** (perundungan/kekerasan) terbuka untuk kesiswaan, bk, kepala sekolah, super admin.
10. **Banyak menu umum tampil untuk semua GTK** (lihat di atas), sehingga sidebar terasa "hampir semua modul" walau
    halamannya hanya baca/layanan umum.
11. **Ringkasan hampir sama untuk semua peran:** kerangkanya selalu Dasbor dasar + Hari ini, ditambah panel Data induk
    (`data_induk.baca`, dimiliki hampir semua peran pimpinan), Kelengkapan website (`konten.kelola`), Aktivitas
    (`audit.baca`). Tidak ada kartu khusus piket, wali kelas, BK, sarpras, humas.
12. **Peran yang sebenarnya sudah "terpecah":** `kurikulum` (berlabel "Wakasek Kurikulum"), `sarpras` ("Wakasek Sarpras"),
    `kesiswaan`, `humas` sudah ada; `wakasek` generik tumpang tindih dengan keempatnya.
