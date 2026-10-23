# Audit foto website — 23 Okt 2026 (Langkah 1, tanpa perubahan)

Diperiksa di production `https://sman22-web.vercel.app` (29 halaman + 5 mega menu + menu HP) dengan Chrome pada
**1440 px layar retina 2x** dan **390 px layar HP 3x** (`scripts/uji-e2e/audit-gambar.mjs`), ditambah data CMS production
(baca-saja) dan pemeriksaan visual potongan 1:1 / 2x (`tangkapan/audit-foto/`).

**Pembesaran** = berapa kali piksel asli diregangkan di layar (ukuran tampil ÷ ukuran asli × kepadatan layar).
≤ 1,0 = tajam; > 1,0 = mulai lembut; ≥ 1,5 = tampak buram/pecah.

Aturan status: **BAIK** bila lebar asli ≥ 1600 px (hero/latar) atau ≥ 1200 px (kartu & foto kegiatan) **dan** tidak tampak
buram saat ditampilkan; selain itu **GANTI** (termasuk slot kosong).

## Foto sumber

| Berkas | Asli (px) | Kondisi visual (potongan 1:1 & 2x) |
|---|---|---|
| `images/gedung.jpg` | 1122×750 | tajam, tetapi resolusi kecil |
| `images/apel-lapangan.jpg` | 1280×720 | **buram**: kompresi berat (tampak seperti cat air) |
| `images/kajian-masjid.jpg` | 960×1280 (tegak) | lembut, berbintik kompresi |
| `images/kegiatan-aula.jpg` | 1600×1200 | **buram**: wajah & rambut melebur (pengurangan derau berat) |
| `images/keluarga-besar.jpg` | 2000×1500 | cukup tajam (terbaik) |
| `images/upacara-pagi.jpg` | 1122×307 (potongan memanjang) | **sangat buram**, melebur |
| `images/kepala-sekolah.jpg` | 425×600 | tajam, resolusi sangat kecil |
| `images/logo.png` | 502×497 | baik (tampil 44 px) — **tidak pecah** |
| `media/placeholder/*` (10 foto stok Unsplash, sudah berlabel) | 1000–2400 lebar | tajam; `galeri-3/4/5` hanya 1000 px |
| `images/hero/model-sintetis.png` (gambar AI) | 1024×1536 | **tidak dipakai** di situs |

## A. Foto dekorasi

| # | Lokasi | Sumber data | Foto saat ini | Tampil (1440 / 390) | Pembesaran terburuk | Status |
|---|---|---|---|---|---|---|
| 1 | Profil — latar judul halaman | kode `profil/page.tsx` | gedung 1122 | 1440×420 / 390×317 | **2,57x** | GANTI |
| 2 | Profil → Sejarah — foto utama 16:9 | kode `sejarah/page.tsx` | gedung 1122 | 896×504 | **1,60x** | GANTI |
| 3 | Beranda — "Tentang kami" 4:3 | kode `langit/Bagian.tsx` | gedung 1122 | 612×400 | 1,09x, < 1200 px | GANTI |
| 4 | Beranda — bento "dalam angka" | kode | keluarga-besar 2000 | 403×440 | 0,60x | BAIK |
| 5 | Halaman masuk Guru & Tendik + kartu pintu GTK | CMS `portal_login` kosong → bawaan | kegiatan-aula 1600 | 632×752 / 403×302 | 1,25x, buram | GANTI |
| 6 | Halaman masuk Siswa + kartu pintu Siswa | idem | apel-lapangan 1280 | 632×752 | **2,09x** | GANTI |
| 7 | Halaman masuk Orang Tua + kartu pintu Orang Tua | idem | gedung 1122 | 632×752 | **2,01x** | GANTI |
| 8 | Tur — Selamat datang (layar penuh) | CMS `tur_sekolah` | keluarga-besar 2000 | 1578×986 | 1,58x | BAIK (batas)¹ |
| 9 | Tur — Gerbang & lapangan | CMS | apel-lapangan 1280 | layar penuh | ±2,5x | GANTI |
| 10 | Tur — Gedung utama | CMS | gedung 1122 | layar penuh | ±2,8x | GANTI |
| 11 | Tur — Masjid sekolah | CMS | kajian-masjid 960 (tegak) | layar penuh | ±3,3x | GANTI |
| 12 | Tur — Aula | CMS | kegiatan-aula 1600 | layar penuh | ±2,0x, buram | GANTI |
| 13 | Tur — Perpustakaan | CMS | **kosong** ("Foto menyusul") | layar penuh | — | GANTI |
| 14 | Mega menu Profil — Sambutan kepala sekolah | kode `menu-langit.ts` | gedung 1122 | 295×221 | 0,59x, < 1200 px | GANTI |
| 15 | Mega menu Profil — Visi dan misi | kode | upacara-pagi 1122×307 | 295×221 | **1,44x** | GANTI |
| 16 | Mega menu Profil — Fasilitas | kode | kajian-masjid 960 | 295×222 | 0,61x, < 1200 px | GANTI |
| 17 | Mega menu Pembelajaran — E-Learning | kode | stok hero-1 2400 | 295×221 | 0,33x | BAIK (sudah stok) |
| 18 | Mega menu Pembelajaran — Kalender akademik | kode | kegiatan-aula 1600 | 295×221 | 0,37x | BAIK |
| 19 | Mega menu Pembelajaran — Kurikulum | kode | gedung 1122 | 295×222 | 0,59x, < 1200 px | GANTI |
| 20 | Mega menu Kehidupan — Prestasi | kode | apel-lapangan 1280 | 295×221 | 0,61x | BAIK |
| 21 | Mega menu Kehidupan — Ekskul dan OSIS | kode | keluarga-besar 2000 | 295×221 | 0,29x | BAIK |
| 22 | Mega menu Kehidupan — Galeri kegiatan | kode | upacara-pagi | 295×222 | **1,45x** | GANTI |
| 23 | Kartu putar beranda — Mengenal SMAN 22 | CMS `kartu_beranda` | gedung 1122 | 260×150 | 0,96x, < 1200 px | GANTI |
| 24 | Kartu putar — Program dan karakter | CMS | apel-lapangan 1280 | 260×150 | 0,73x | BAIK |
| 25 | Kartu putar — E-Learning | CMS | stok galeri-3 1000 | 260×150 | 0,78x, < 1200 px | GANTI |
| 26 | Kartu putar — Ekskul dan OSIS | CMS | keluarga-besar | 260×150 | 0,60x | BAIK |
| 27 | Kartu putar — Prestasi | CMS | stok berita-1 1600 | 260×150 | 0,49x | BAIK (sudah stok) |
| 28 | Kartu putar — Galeri kegiatan | CMS | kegiatan-aula 1600 | 260×150 | 0,50x | BAIK |
| 29 | Kartu putar — Berita dan pengumuman | CMS | upacara-pagi | 260×150 | **1,47x** | GANTI |
| 30 | Kartu putar — Agenda sekolah | CMS | kajian-masjid 960 | 260×150 | 0,81x, < 1200 px | GANTI |
| 31 | Kartu putar — Penerimaan murid baru | CMS | stok berita-2 1200 | 260×150 | 0,65x | BAIK (sudah stok) |
| 32 | Kartu putar — Portal Digital 22 | CMS | stok galeri-1 1600 | 260×150 | 0,49x | BAIK (sudah stok) |
| 33 | Kartu putar — E-Library | CMS | stok berita-4 1200 | 260×150 | 0,65x | BAIK (sudah stok) |
| 34 | Kartu putar — Pengaduan dan aspirasi | CMS | stok galeri-5 1000 | 260×150 | 0,78x, < 1200 px | GANTI |
| 35 | Kartu Profil — Sambutan kepala sekolah | kode `profil/page.tsx` | kepala-sekolah 425 | 295×150 / 358×150 | **2,53x** | GANTI² |
| 36 | Kartu Profil — Visi dan misi | kode | apel-lapangan | 295×150 | 0,84x | BAIK |
| 37 | Kartu Profil — Sejarah | kode | gedung 1122 | 295×150 | 0,96x, < 1200 px | GANTI |
| 38 | Kartu Profil — Guru & Tendik | kode | keluarga-besar | 295×150 | 0,54x | BAIK |
| 39 | Kartu Profil — Fasilitas | kode | kegiatan-aula | 295×150 | 0,67x | BAIK |
| 40 | Kartu Profil — Tata tertib | kode | upacara-pagi | 295×150 | **1,47x** | GANTI |
| 41 | Kartu Pembelajaran — Program dan karakter | kode `pembelajaran/page.tsx` | apel-lapangan | 295×150 | 0,84x | BAIK |
| 42 | Kartu Pembelajaran — E-Learning | kode | stok galeri-3 1000 | 358×150 | 1,07x, < 1200 px | GANTI |
| 43 | Kartu Pembelajaran — Kalender akademik | kode | upacara-pagi | 295×150 | **1,47x** | GANTI |
| 44 | Kartu Pembelajaran — Kurikulum | kode | kegiatan-aula | 295×150 | 0,67x | BAIK |
| 45 | Program — 7KAIH | kode `program.ts` | kajian-masjid 960 | 295×150 | 1,12x, < 1200 px | GANTI |
| 46 | Program — Kokurikuler tematik | kode | kegiatan-aula | 295×150 | 0,67x | BAIK |
| 47 | Gambar pratinjau tautan (Open Graph/SEO) | CMS kosong → gedung | gedung 1122 | 1200×630 disarankan | < 1200 px | GANTI |
| 48 | Logo sekolah | `logo.png` | 502×497 | 44×44 | 0,26x | BAIK (tidak pecah) |

¹ Satu-satunya foto asli yang memenuhi ≥ 1600 px. Di layar penuh retina sedikit lembut (1,58x); diusulkan tetap foto asli.
² Kartu ini memotong foto resmi kepala sekolah. Foto orang tidak diganti foto stok: usulannya kartu memakai ilustrasi
  netral (meja/ruang kepala sekolah), sedangkan foto di halaman **Sambutan** tetap foto asli (280×395, 1,32–1,98x —
  **perlu foto resmi resolusi tinggi dari sekolah**, potret ≥ 1200 px).

## B. Foto dokumentasi kegiatan

| # | Lokasi | Sumber | Foto | Tampil | Pembesaran terburuk | Status |
|---|---|---|---|---|---|---|
| 49 | Galeri — "Upacara bendera" (juga mozaik Kehidupan Siswa di beranda & Profil → Fasilitas) | CMS `galeri` | upacara-pagi 1122×307 | 403×503 | **3,28x**, sangat buram | GANTI (foto utama) |
| 50 | Galeri — "Gedung utama" | CMS | gedung 1122 | 403×503 | **1,34x** | GANTI |
| 51 | Galeri — "Apel pagi di lapangan" | CMS | apel-lapangan 1280 | 403×537 | **1,49x**, buram | GANTI |
| 52 | Galeri — "Kajian bersama di masjid sekolah" | CMS | kajian-masjid 960 | 403×302 | 0,84x, < 1200 px | GANTI |
| 53 | Galeri — "Kegiatan siswa di aula" | CMS | kegiatan-aula 1600 | 403×403 | 0,67x | BAIK (agak lembut) |
| 54 | Galeri — "Keluarga besar" | CMS | keluarga-besar 2000 | 403×252 | 0,40x | BAIK |
| 55 | Berita, Prestasi, Agenda | CMS | **belum ada data** di production | — | — | tidak ada foto untuk diganti |
| 56 | Fasilitas (daftar), Guru & Tendik (publik) | CMS | **kosong** (Fasilitas memakai galeri; Guru & Tendik tampil inisial) | — | — | tetap kosong — foto orang tidak memakai stok |

Galeri tidak memakai album: setiap baris adalah satu foto. Usulan: foto yang diganti tetap ada di arsip dan bisa dibuka
lewat "Lihat foto asli"; "Upacara bendera" yang sangat buram boleh disembunyikan dari grid setelah ada pengganti.

## Temuan lain

- **Label keliru**: 6 baris `tur_sekolah` di production bertanda `is_placeholder = true`, padahal 5 di antaranya foto asli
  sekolah, sehingga foto asli berlabel "Ilustrasi sementara".
- Gambar OG/SEO belum diisi di CMS (memakai `gedung.jpg` 1122 px).
- Logo tidak pecah di ukuran tampil saat ini; untuk cetak/ukuran besar tetap disarankan versi vektor (SVG/PDF) dari sekolah.

## Ringkasan

- **GANTI: 32 slot** — 28 dekorasi + 4 dokumentasi kegiatan (galeri).
- **BAIK: 21 slot** — termasuk 7 slot yang sudah memakai foto stok berlabel.
- Hanya **8 foto sumber** yang dipakai berulang. Foto yang paling bermasalah: `upacara-pagi.jpg` (7 lokasi),
  `gedung.jpg` (10 lokasi), `kajian-masjid.jpg` (6 lokasi), dan `apel-lapangan.jpg` (sebagai latar besar).
- Perlu dari sekolah (bukan stok): foto resmi kepala sekolah resolusi tinggi, foto Guru & Tendik, logo vektor.
