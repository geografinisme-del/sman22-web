# MODULE_STATUS — Platform Digital SMAN 22 Bandung

Status modul berdasarkan audit kode (bukan asumsi). Perbarui setiap selesai satu tahap.
Legenda: **Berfungsi** · **Sebagian** (ada, tetapi belum lengkap/rapi) · **Belum** · **Berizin** (ada, tampil hanya untuk peran tertentu).

Branch kerja: `desain-editorial-sekolah` (belum di-push, belum di produksi).

## Stack (hasil audit)

- Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS v4, lucide-react, zod 4.
- Supabase: Postgres + RLS, autentikasi email/sandi, MFA TOTP (`/admin/mfa`), izin dihitung database (`akses_saya()` → `punya(akses, izin)`).
- Tanpa library animasi; gerak = CSS + IntersectionObserver (`src/components/gerak/`).
- Konfigurasi situs: tabel `pengaturan_situs` (1 baris, publik boleh baca), kolom `tema` jsonb (dibaca `bacaTema()` di `src/lib/tema.ts`).
- Deploy: Vercel otomatis dari `main` (produksi). Branch lain = pratinjau.
- Tes yang ada: pgTAP RLS di `supabase/tests/*.sql` (dijalankan `supabase test db`). Belum ada tes unit aplikasi.
- Supabase lokal: stack Docker yang berjalan milik proyek lain (`portal-22-bandung`, `aplikasi-absensi`) — **jangan disentuh**. Uji migrasi memakai stack terpisah dari salinan kerja sementara dengan port lain.

## Status modul

| Area | Status | Catatan |
| --- | --- | --- |
| Beranda publik | Berfungsi | Editorial terang + sistem gerak (lihat HANDOFF.md). Susunan masih tertanam di kode → dipindah ke widget (Tahap 4). |
| Halaman dalam publik (profil, program, berita, agenda, galeri, SPMB, kontak, sambutan) | Berfungsi | Sistem visual bersama. |
| Halaman publik lain (ekskul, alumni, sertifikat, survei, pengaduan) | Sebagian | Kontras & huruf kapital sudah diperbaiki; tata letak lama belum diselaraskan penuh dengan sistem editorial. |
| Header publik | Berfungsi | Navigasi berkelompok (Profil, Pembelajaran, Kehidupan Siswa, Kabar & Agenda, SPMB, Layanan) + tombol Portal Digital 22. |
| Portal Digital 22 (`/portal-digital`) | Berfungsi | Pintu bidang publik, keputusan akses di server, tujuan kembali aman setelah login/MFA, status akun. |
| Warna penanda bidang | Berfungsi | Token terpusat + tes kontras; dipakai portal, ruang kerja admin, E-Library, SPMB, beranda. Lihat docs/WARNA-BIDANG.md. |
| Login bersama + MFA | Berfungsi | "Guru, Tendik & Manajemen" / Siswa / Orang Tua; MFA TOTP diuji nyata di lokal (daftar, kode salah, tempel, kode benar). |
| Ruang kerja manajemen | Berfungsi | Turunan izin; satu penugasan langsung, beberapa → pemilih. Halaman awal ruang kerja = halaman modul yang ada (belum ada beranda khusus per ruang kerja). |
| Dasbor & sidebar admin | Berfungsi | Terang, keadaan kosong/gagal/libur dibedakan, aktivitas WIB. |
| Portal siswa/orang tua (`/portal`) | Sebagian | Header terang & kontras diperbaiki; isi halaman portal belum didesain ulang. |
| E-Library publik (`/perpustakaan`, `/e-library`) | Berfungsi* | Cari, saring kategori, rekomendasi, sampul, ketersediaan, akses digital berizin, panduan. *Saringan kategori & aturan pinjam butuh migrasi 20261201. Halaman detail buku belum diselaraskan gayanya. |
| E-Library pribadi (`/portal/perpus`) | Berfungsi | Pinjaman/reservasi via login bersama. |
| E-Library petugas (`/admin/perpus`) | Berizin | Sirkulasi, katalog, laporan, literasi, pojok baca (`perpus.kelola/lihat`, `literasi.kelola`). |
| Tema & Tampilan (Admin) | Berfungsi* | Tema, palet, huruf, gerak, slideshow, susunan widget (seret/naik-turun/sembunyi/lepas/tambah), popup & pemandu, pratinjau desktop/ponsel, draf, terapkan, riwayat & pulihkan. *Butuh migrasi 20261202. |
| Mesin tema + widget | Berfungsi* | Sekolah Berwarna (bawaan), Akademik, Modern; Editorial disiapkan. Widget baru: Prestasi. Hanya beranda yang disusun widget. |
| Popup prioritas + panel rutin | Berfungsi* | Satu pengatur overlay; poster/tautan diatur di Admin → Pengumuman. *Butuh migrasi 20261202. |
| Pemandu | Sebagian | Berbasis pilihan & berfungsi; aset karakter ilustrasi belum ada (memakai tombol berikon). |

## Rencana (urutan kerja)

1. Stabilkan sistem visual bersama: kontras & gaya lama di halaman publik/portal.
2. Header "Layanan", label login, dasbor.
3. Ruang kerja (turunan izin, bukan penambah izin) + pemilih ruang kerja; E-Library: filter kategori, panduan, gaya baru.
4. Fondasi tema & widget: token, registri widget (skema zod + versi), renderer beranda dari konfigurasi.
5. Tema Akademik (dasar) + Modern Interaktif; struktur Editorial disiapkan.
6. Pengatur overlay bersama: modal prioritas, panel rutin, pemandu.
7. Admin: Tampilan → Tema → Pratinjau → Sesuaikan → Terapkan; draf terpisah dari publik; riwayat & pemulihan.

## Checkpoint

- **Tahap 0 (audit)** — selesai. Hasil di atas.
- **Tahap 1 (sistem visual)** — selesai: codemod kontras/huruf kapital di 30 berkas publik & portal; header portal terang (`src/app/portal/NavPortal.tsx`).
- **Tahap 2 (header & login)** — selesai: menu "Layanan" (`src/components/Header.tsx`, `src/content/menu.ts`), label "Guru, Tendik & Manajemen".
- **Tahap 3 (ruang kerja)** — selesai: `src/lib/ruang-kerja.ts` (+ tes), `/admin/mulai` (tujuan setelah masuk/MFA), pemilih ruang kerja di sidebar.
- **Tahap 4 (fondasi tema/widget)** — berjalan:
  - selesai: `src/lib/tampilan/{token,widget,konfigurasi,overlay}.ts` + `tampilan.test.ts` (24 tes `npm test` lulus).
  - selesai: migrasi `20261201000000_elibrary_publik.sql`, `20261202000000_tampilan_widget.sql` + `supabase/tests/rls_fase14_test.sql` (7 blok LULUS di stack lokal terisolasi `sman22-web-uji`, port 56321/56322).
  - selesai: `getSitus().tampilan` (konfigurasi terbit), `getPengumuman()` toleran kolom baru (`select *`).
  - selesai: renderer widget `src/components/widget/{Widget,SusunanBeranda,KerangkaPublik}.tsx` + `tema.css`; beranda & layout publik kini membaca konfigurasi terbit.
- **Tahap 5 (tema alternatif)** — selesai: Akademik + Modern Interaktif (`data-tema`), Editorial terdaftar `tersedia:false`.
- **Tahap 6 (overlay & pemandu)** — selesai: `PengaturOverlay` (satu pengatur), `ModalPrioritas`, panel rutin, `Pemandu`; kolom popup di Admin → Pengumuman; poster & tautan juga tampil di /agenda.
- **Tahap 7 (pengaturan)** — selesai: `/admin/tampilan` (Editor: Tema/Susunan/Popup & pemandu/Riwayat, pratinjau desktop/ponsel, simpan draf, terapkan, pulihkan), `/pratinjau/tampilan`, `actions-tampilan.ts`.
- **E-Library** — selesai: `/perpustakaan` (kategori, rekomendasi, panduan, layanan pribadi/petugas), alias `/e-library`.
- **Uji alur nyata** (Chrome headless ↔ dev server ↔ Supabase lokal terisolasi, akun uji lokal): 29/29 LULUS — ruang kerja, URL terlarang, draf/pratinjau/terapkan/pulihkan, widget dilepas tanpa hapus data, modal prioritas, panel rutin, pemandu, MFA TOTP (kode salah, tempel berspasi, kode benar).
  - Perbaikan dari uji: pemetaan `getPengumuman` (poster/tautan sempat hilang), tombol Informasi tertunda saat lambaian, evaluasi awal tidak lagi bergantung rAF, klik-di-luar memakai `composedPath()`.
- **Validasi akhir** — luber 0 pada 360/390/768/1024 (=1280 @125%)/1280/1440 di 6 halaman; keyboard ponsel (390×390) formulir masuk terjangkau; reduced motion tema Modern; konsol tanpa galat (perbaikan hidrasi di formulir akses layanan & `data-scroll-behavior`); build produksi bekerja terhadap DB produksi yang belum dimigrasi.

## Belum selesai / di luar cakupan tahap ini
- Halaman dalam belum disusun dengan widget (hanya beranda). Beranda khusus per ruang kerja belum ada.
- Isi portal siswa/orang tua, halaman detail buku, dan beberapa halaman publik lama belum didesain ulang penuh.
- Aset karakter pemandu belum ada. Contoh popup poster dari brief tidak tersedia di percakapan.
- Belum diuji di Safari/iOS & perangkat fisik; uji alur dilakukan di Chrome headless terhadap Supabase lokal.
- Migrasi Fase 18–19 belum diterapkan di staging/produksi (sengaja; perlu persetujuan).

- **Fase Portal Digital 22** (branch `portal-digital-22`) — selesai: audit referensi, token warna bidang, navigasi berkelompok, tema Sekolah Berwarna + pembuka panel + widget Prestasi, Portal Digital 22 + keputusan akses + `lanjut` aman, aksen ruang kerja, E-Library hijau & SPMB marun. Uji: 36 unit, 14/14 e2e portal, 29/29 e2e regresi, 42 kombinasi halaman×lebar tanpa luber (1 perbaikan di 360px).

## Belum selesai (fase Portal Digital 22)
- Dasbor tiap bidang belum didesain ulang menjadi "ringkasan + tugas + tindakan utama" khusus bidang; saat ini halaman modul lama + pita/aksen bidang.
- Belum ada modul SPMB internal (kartu SPMB menuju informasi publik).
- "Sumber belajar" selain E-Library (materi/kelas digital) hanya dapat diakses dari Pojok Guru/Portal Siswa, belum menjadi kartu tersendiri.
- Aset karakter pemandu belum ada; uji Safari/iOS & perangkat fisik belum dilakukan.

## Fase Buku Tahunan (branch `buku-tahunan`)
| Area | Status | Catatan |
| --- | --- | --- |
| Token desain (Tahap 1) | Selesai | Newsreader + Plus Jakarta Sans, kertas/tinta/marun, `/spesimen`. |
| Beranda tema Buku Tahunan (Tahap 2) | Selesai* | Tema bawaan. *Prestasi, SPMB, alumni butuh migrasi 20261210 + data dari admin. |
| Admin Prestasi & Alumni, SPMB Beranda, Penanggung Jawab Portal | Selesai* | *Butuh migrasi 20261210. |
| Portal Digital 22 ala buku (Tahap 3) | Selesai | Tanpa warna per bidang. |
| Media sementara | Selesai | 10 foto Unsplash (CREDITS.md) untuk data contoh; semua is_placeholder = true. |
| Tahap 4 (GSAP, Embla, animasi) | Selesai | Progressive enhancement, reduced-motion, parallax desktop saja; Lighthouse ponsel 89–90 (simulasi), CLS 0. |
| Navigasi E-Learning / Layanan | Selesai | Menu, footer, akses cepat selaras; URL E-Learning dari CMS, bawaan /pembelajaran/e-learning. |
