# Website SMA Negeri 22 Bandung

Website publik + sistem sekolah (CMS, akun & peran, data induk) berbasis Next.js, Supabase, dan Vercel.

Status: **Fase 1** (website + CMS), **Fase 2** (akun, peran, data induk), **Fase 3** (absensi siswa & guru, SP/panggilan ortu), **Fase 4** (portal siswa & orang tua, izin online), **Fase 5** (jadwal pelajaran, guru pengganti, piket), **Fase 6** (persetujuan & jadwal tayang konten, hero/SEO dari CMS, absensi per jam pelajaran + QR, izin guru mandiri, jam kerja & presensi lokasi/swafoto opsional), **Fase 7** (kesiswaan: prestasi, pelanggaran berpoin, pembinaan, rujukan BK; notifikasi aplikasi + WhatsApp/email; dashboard per peran), dan **Fase 8** (verifikasi dua langkah wajib untuk super admin, lupa sandi via email, ganti sandi & keluar dari semua perangkat, audit login; kalender sekolah + iCal, tukar jam guru, notifikasi perubahan jadwal, riwayat jadwal), dan **Fase 9** (kurikulum: struktur & cek kesesuaian, CP/TP/ATP + KKTP, perangkat ajar + review, projek kokurikuler, supervisi akademik, materi digital untuk papan interaktif, Asisten AI guru), dan **Fase 10** (kelas digital: tugas + pengumpulan + penilaian, kuis online dinilai server, pengingat tenggat, rekap nilai Excel; sarpras: inventaris + label QR, ruang, peminjaman anti-bentrok, laporan kerusakan), dan **Fase 11** (perpustakaan: katalog & eksemplar, sirkulasi, reservasi, denda opsional, e-book berlisensi, pojok baca, jurnal baca, tantangan & duta literasi, ulasan; humas: pengaduan bertiket + kanal rahasia, SLA, riwayat & penilaian layanan, kemitraan + kegiatan/evaluasi, survei, kontak media, buku tamu, dasbor agregat), dan **Fase 12** (BK: permintaan layanan dari portal, kasus dengan catatan terenkripsi, sesi & tindak lanjut, log akses, saran untuk wali, laporan agregat, retensi; ekskul/OSIS: pendaftaran berkuota + daftar tunggu, jabatan pengurus, kegiatan & presensi, program kerja, pengajuan kegiatan + LPJ, sertifikat terverifikasi QR, profil publik), dan **Fase 13** (alumni: registrasi terverifikasi + persetujuan privasi, direktori opt-in per kolom, tracer study per angkatan, acara, mentoring difasilitasi sekolah, peluang, kontribusi, cerita; mutu & akreditasi: kerangka berversi, indikator + pemilik, evaluasi diri & persetujuan, bukti dengan versi/hash/log akses/tautan modul, analisis kesenjangan, temuan & rencana perbaikan, paket laporan), dan **Fase 14** (beranda beranimasi: judul muncul per kata, parallax hero + kursor, teks menyala saat scroll, angka menghitung, pita foto bergerak, kartu bercahaya; video latar opsional; menghormati "kurangi animasi") selesai.

## Halaman
- **Publik:** Beranda · Profil · Berita · Agenda & Pengumuman (+ kalender umum) · Galeri · SPMB · Kontak · `/kalender.ics`
- **Papan interaktif (`/papan`, guru):** tayangan slide layar penuh + pena, papan tulis, pewaktu, pilih siswa acak
- **Akun:** `/admin/login` · `/admin/lupa-sandi` · `/admin/mfa` (verifikasi dua langkah)
- **Admin (`/admin`):** Ringkasan · Website (Persetujuan Konten, Profil, Berita + pratinjau & riwayat revisi, Pengumuman, Agenda, Galeri, Tampilan Website) · Data Induk (Siswa, Guru & Pegawai, Kelas, Tahun Ajaran, impor Dapodik, ekspor) · Kelas Saya (wali kelas) · Absensi (presensi guru, absensi siswa, catat terlambat, pengajuan koreksi, rekap, SP & panggilan ortu, kehadiran guru, pengaturan) · Jadwal (Jadwal Saya, lihat per kelas/guru/ruang/hari, susun anti-bentrok, penugasan mengajar, guru pengganti, mapel/jam/piket, cetak & Excel) · Kurikulum (Struktur, CP/TP & ATP, Perangkat Ajar & Periksa, Materi & Papan Interaktif, Projek Kokurikuler, Supervisi Akademik) · Kelas Digital (tugas & kuis) · Sarpras (Inventaris, Label QR, Ruang, Peminjaman, Laporan Kerusakan) · Kalender Sekolah · Tukar Jam & Persetujuan · Riwayat Jadwal · Izin dari Orang Tua · Akun Portal · Pengguna & Peran · Keamanan Akun (MFA, ganti sandi) · Log Aktivitas
- **Portal (`/masuk` → `/portal`):** login NISN · Beranda (kehadiran bulan ini, SP, pengumuman) · Jadwal pelajaran · Kalender sekolah · Tugas & kuis online · Materi & projek kokurikuler · Kalender kehadiran · Izin/Sakit online (orang tua) · Ganti kata sandi

## Menyalakan CMS
Ikuti **[PANDUAN-CMS.md](./PANDUAN-CMS.md)** langkah demi langkah (±20 menit, tanpa coding).
Sebelum Supabase disambungkan, website tetap tampil dengan isi dari `src/content/sekolah.ts`.

## Menjalankan di komputer (pengembang)
```bash
npm install
cp .env.example .env.local   # isi kunci Supabase
npm run dev                  # http://localhost:3000
npm run build                # cek build produksi
```

## Struktur penting
| Lokasi | Isi |
|---|---|
| `src/app/(situs)/` | Halaman publik |
| `src/app/admin/` | Halaman admin + `actions*.ts` (simpan data) |
| `src/app/portal/` | Portal siswa & orang tua |
| `src/lib/data.ts` | Pengambilan data publik (Supabase / fallback file) |
| `src/lib/admin/schema.ts`, `induk.ts`, `jadwal.ts` | Validasi formulir, impor, aturan jadwal |
| `src/components/jadwal/` | Tampilan jadwal mingguan/harian |
| `src/content/sekolah.ts` | Konten statis (hero, program, layanan, SPMB) |
| `supabase/migrations/` | Struktur database + keamanan (RLS) |
| `supabase/tests/` | Uji hak akses (RLS) per peran |

## Teknologi
Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, Storage, RLS) · Vercel
