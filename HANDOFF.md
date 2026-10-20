# HANDOFF — Website SMA Negeri 22 Bandung

Catatan serah-terima untuk pengembang/agen berikutnya. Perbarui berkas ini setiap kali ada keputusan desain atau status pekerjaan yang berubah.

## Status

| Pekerjaan | Branch | Status |
| --- | --- | --- |
| Desain ulang editorial (situs publik, masuk, MFA, dasbor, sidebar) | `desain-editorial-sekolah` | Selesai, di-commit, **belum di-push / belum di-merge ke `main`** |
| Sistem gerak (motion) situs publik | `desain-editorial-sekolah` | Selesai, di-commit, belum di-push |
| Platform: ruang kerja, E-Library, mesin tema & widget, popup prioritas, pemandu | `main` (sudah di produksi) | Kode tayang; **2 migrasi belum dijalankan di produksi** (lihat bawah) |
| Portal Digital 22, warna bidang, tema "Sekolah Berwarna", navigasi berkelompok | `portal-digital-22` | Selesai & diuji lokal, di-commit, **belum di-push** |
| "Langit cerah + Tur sekolah" — Tahap A (token, header + menu, hero + kartu putar) & Tahap B (tur sekolah + admin, angka, SPMB, footer) | `langit-cerah` (dari `buku-tahunan`) | Tahap A–B selesai & diuji lokal, di-push ke **pratinjau**; menunggu "lanjut" sebelum Tahap C. Migrasi 20261210, 20261220, 20261221 belum di produksi |
| "Buku tahunan yang hidup": token (Tahap 1), beranda majalah (Tahap 2), Portal Digital 22 (Tahap 3), gerak GSAP/Embla (Tahap 4) | `buku-tahunan` | Selesai & diuji lokal, di-push ke **pratinjau** Vercel (bukan produksi); migrasi 20261210 belum di produksi |

Detail status per modul: **MODULE_STATUS.md**.

Push ke `main` memicu deploy produksi Vercel. Jangan push/merge tanpa persetujuan pemilik. Push branch fitur hanya membuat pratinjau.

## Arah visual (tetap berlaku)

- Latar putih dan putih hangat (#faf8f5), teks arang (#1f2328), satu aksen dari logo (#b3123c, **pilihan sementara**).
- Satu font sans-serif per tema (Akademik: Source Sans 3; Modern: DM Sans — keduanya terpasang lokal), tanpa italic dekoratif. Teks isi ≥16px.
- Palet terkurasi dari logo: merah (#b3123c), biru dongker (#3b5070), biru langit (#0f6a9c); semua ≥ 4,5:1 di atas putih (diuji).
- Hanya foto asli sekolah. Tanpa orbit, sparkle, glow, gradasi gelap, atau model sintetis sebagai fokus.
- Jangan mengarang alamat, akreditasi, statistik, kutipan, atau dokumentasi kegiatan.

## Sistem gerak

### Token (src/app/globals.css)

| Token | Nilai | Untuk |
| --- | --- | --- |
| `--gerak-cepat` | 180ms | tombol, menu, tautan, ikon panah |
| `--gerak-panel` | 280ms | panel informasi, dialog, bottom sheet |
| `--gerak-muncul` | 500ms | kemunculan bagian saat scroll |
| `--gerak-jeda` | 70ms | jeda antaritem, maksimal 4 item per kelompok |
| `--ease-keluar` | `cubic-bezier(0.22, 1, 0.36, 1)` | semua gerak; melambat di akhir, tanpa bounce |

### Keputusan

1. **Tanpa library animasi baru.** Proyek belum memakai Motion/GSAP/AOS. Kebutuhannya cukup dengan CSS + IntersectionObserver. Dialog memakai `<dialog>` bawaan browser (pola yang sudah dipakai galeri), bukan Radix. Scroll tetap native.
2. **Konten tidak pernah menunggu animasi.**
   - Atribut `data-muncul` hanya penanda.
   - `PengamatMuncul` (src/components/gerak/PengamatMuncul.tsx, dipasang sekali di layout situs) baru menyembunyikan elemen yang **masih di bawah layar** saat JS berjalan.
   - Tanpa JS, saat reduced motion, atau untuk konten yang sudah terlihat, tidak ada yang disembunyikan.
   - Animasi berjalan sekali; elemen dilepas dari observer setelah muncul.
   - Pola yang tersedia: `data-muncul` (pudar + naik 16px), `data-muncul="foto"` (terbuka dari bingkai), `data-muncul="kelompok"` (anak-anak bertahap).
3. **Pembuka beranda memakai CSS saja** (tidak bergantung hidrasi).
   - Urutan: identitas/judul (0ms) → deskripsi/tombol (140ms) → bingkai foto (260ms). Total ±780ms.
   - Foto utama dimuat dengan `priority`. Yang dianimasikan hanya `clip-path` bingkainya, jadi foto tetap terlihat.
   - Pergantian foto: crossfade 520ms di bingkai tetap, tanpa autoplay, tombol sebelumnya/berikutnya dan penghitung tetap ada.
4. **Bagian khas: "Program dan pembiasaan karakter"** (src/components/beranda/SorotProgram.tsx).
   - Desktop ≥1024px dengan tinggi ≥680px: foto (tinggi maks. `min(64vh, 520px)`) menempel di `top: 104px` hanya di dalam bagian ini.
   - Program yang melintasi pita baca (42–52% tinggi layar) disorot (garis kiri + nomor beraksen). Foto dan keterangannya berganti dengan crossfade 500ms.
   - Program tanpa dokumentasi sendiri (Gerbang Pancawaluya, Pojok Baca, Mitigasi) memakai foto suasana "Apel pagi di lapangan sekolah". Keterangannya menyebut isi foto, tidak mengklaim sebagai dokumentasi program.
   - Layar pendek: sticky dan pergantian foto mati.
   - Ponsel: susunan vertikal biasa, foto program (yang punya) tampil di tempatnya.
5. **Parallax hanya satu foto** (gedung di "Mengenal sekolah kami"), desktop saja, geser total ±10px (≤20px), mati saat reduced motion. Lapisan foto dilebihkan 12px atas-bawah agar tepi tidak kosong.
6. **Panel "Informasi sekolah"** (src/components/gerak/PanelInformasi.tsx).
   - Kapan muncul:
     - Hanya dirender bila ada pengumuman aktif dari CMS. RLS sudah menyaring `aktif`, `deleted_at`, dan rentang tayang.
     - Berita belum punya penanda "penting", jadi tidak diikutkan.
     - Muncul setelah bagian pembuka terlewati dan ±30% halaman digulir. Paling banyak sekali otomatis per sesi (`sessionStorage`, hanya ID pengumuman).
   - Perilaku:
     - Nonmodal: tidak mengambil fokus, tidak menggelapkan latar, tidak mengunci scroll, `z-index` di bawah header, tidak hilang sendiri.
     - Disembunyikan sementara saat kolom isian sedang difokus.
     - Setelah ditutup, tersisa tombol "Informasi" untuk membukanya lagi. Bila ditutup lewat keyboard, fokus pindah ke tombol itu.
     - Storage yang diblokir tidak membuat halaman gagal (try/catch).
   - Ponsel: teaser satu baris di bawah layar (memperhitungkan safe-area). Panel penuh baru muncul setelah teaser diketuk.
   - "Baca informasi" membuka `DialogInformasi`:
     - Modal `<dialog>` dengan judul, tombol tutup, fokus terkurung, Escape menutup, dan fokus kembali ke pemicu.
     - Ponsel: bottom sheet maks. 85dvh, isi bergulir.
     - Teks panjang dipotong dan diarahkan ke halaman asli `/agenda#pengumuman-<id>` (anchor baru di halaman Agenda).
7. **Microinteraction:**
   - Panah tombol/tautan bergeser 3px.
   - Garis tautan tumbuh saat disorot/difokus; garis tipis tetap ada.
   - Indikator menu tumbuh dari kiri.
   - Gambar kartu berita dan galeri membesar maks. 1,025 di bingkai tetap.
   - Ikon akses layanan berubah warna.
   - Foto dan keterangan galeri berganti dengan pudar 260ms.
   - Isi `<details>` turun 200ms.
   - Semua efek hover punya padanan `:focus-visible`.
8. **Reduced motion:** semua animasi/transisi dipersingkat menjadi ±0ms (globals.css). PengamatMuncul dan parallax tidak berjalan. Konten tampil langsung dan semua kontrol tetap berfungsi.
9. **Halaman akun (masuk, MFA) dan dasbor admin** tidak memakai gerak ekspresif. Hanya transisi singkat bawaan.

### Ritme tata letak

- Berita beranda: satu berita utama + pendamping bergambar kecil (tampil saat ada berita terbit).
- Kehidupan siswa: mozaik satu foto besar + tiga pendamping.
- Profil: bila visi, misi, dan sejarah belum diisi, ketiganya diringkas menjadi satu bidang pendek. Anchor `#visi-misi` dan `#sejarah` tetap ada. Foto sambutan mengecil bila naskah belum ada.

## Cara menguji gerak

Pengujian otomatis dijalankan lewat Chrome headless (CDP). Skripnya ada di scratchpad sesi, bukan di repo. Yang diperiksa:
- Kemunculan saat muat.
- Gulir lambat, cepat, dan kembali ke atas.
- Animasi tidak berulang.
- Sorotan per program, sticky, layar pendek.
- Reduced motion, tanpa JS, parallax.
- Panel informasi (muncul sekali, tetap tertutup, tombol buka kembali, fokus keyboard).
- Dialog (modal, Escape, kembalinya fokus), teaser dan bottom sheet ponsel.
- Luber 360–1440px, CLS, dan koneksi lambat.

Panel informasi hanya bisa diuji dengan pengumuman aktif. Produksi saat ini **tidak punya pengumuman aktif**, jadi panel memang tidak tampil di sana.

Untuk menguji lokal tanpa mengubah data produksi, tambahkan data contoh sementara di `src/app/(situs)/page.tsx`, lalu hapus sebelum commit.

## Yang perlu dilengkapi pemilik konten

- Alamat lengkap, telepon, email, NPSN, akreditasi, visi, misi, sejarah, naskah sambutan.
- Foto kegiatan berizin untuk Gerbang Pancawaluya, Pojok Baca & Literasi, Mitigasi Bencana (saat ini memakai foto suasana).
- Data SPMB resmi, berita, pengumuman.
- Keputusan final warna aksen.

## Platform (fase berikutnya) — keputusan

### Migrasi yang WAJIB dijalankan sebelum fitur baru aktif di produksi
1. `supabase/migrations/20261201000000_elibrary_publik.sql` — RPC kategori katalog, saringan kategori, aturan pinjam ringkas (baca saja).
2. `supabase/migrations/20261202000000_tampilan_widget.sql` — `tampilan_draf` (RLS: hanya `konten.kelola`), `riwayat_tampilan` (append-only), `terbitkan_tampilan()`, kolom popup di `pengumuman`.

Keduanya sudah diterapkan dari nol di stack lokal terisolasi + `supabase/tests/rls_fase14_test.sql` (7 blok LULUS). **Uji dulu di staging.**
Tanpa migrasi, aplikasi tetap berjalan: tema bawaan Akademik, katalog tanpa saringan kategori, editor tema menampilkan pesan "jalankan migrasi" (sudah diuji terhadap database produksi yang belum dimigrasi).

### Mesin tema & widget (`src/lib/tampilan/`)
- Pemisahan: token (`token.ts`) · registri widget + skema zod (`widget.ts`) · konfigurasi berversi + migrasi versi + operasi editor (`konfigurasi.ts`) · komponen widget (`src/components/widget/Widget.tsx`) · renderer (`SusunanBeranda.tsx`) · kerangka publik (`KerangkaPublik.tsx`).
- Konfigurasi terbit: `pengaturan_situs.tema.tampilan` (publik). Draf: `tampilan_draf` (tidak bisa dibaca publik). Riwayat: `riwayat_tampilan`.
- Data dari mana pun selalu lewat `bacaKonfigurasi()` (tidak pernah melempar; nilai tak dikenal dibuang; versi lama dimigrasikan). Tidak ada HTML/JS bebas.
- Widget hanya mengatur tampilan; isi selalu dari modul sumber. Melepas widget tidak menghapus data.
- Area: `beranda` (widget bagian) & `global` (popup, pemandu — diatur di tab Popup & pemandu). Instans: `satu`/`banyak` (berita boleh beberapa, mis. per kategori). Pembuka wajib & selalu pertama.
- Tema tidak mendukung tata letak tertentu → `tataEfektif()` memakai bawaan tema + peringatan di editor/pratinjau; pilihan widget tetap tersimpan.
- Tema publik dipasang di `.situs-publik` (`data-tema`, `data-gerak`, variabel CSS). **Dasbor admin tidak terpengaruh.** Kartu "Warna" lama disembunyikan (nilainya tetap dipakai root/dasbor).
- Tema: Akademik (dasar), Modern Interaktif (pembuka foto penuh, bidang warna solid, sudut 16px, DM Sans, gerak dinamis), Editorial terdaftar `tersedia:false` (siap ditambah: isi `TEMA.editorial.tata`, CSS `[data-tema="editorial"]`, set `tersedia:true`).
- Tingkat gerak: minimal (tanpa reveal), standar, dinamis (jarak 20px + parallax satu foto). Reduced motion pengunjung selalu menang.
- Slideshow otomatis: jeda 7–15 detik, tombol jeda, berhenti permanen setelah interaksi, mati saat reduced motion/tab tersembunyi.

### Overlay (satu pengatur: `src/lib/tampilan/overlay.ts` → `PengaturOverlay.tsx`)
- Urutan: modal prioritas > panel rutin > lambaian pemandu; tidak pernah bersamaan; tidak saat mengisi formulir/dialog lain terbuka.
- Modal prioritas: pengumuman aktif + `prioritas`, sekali per sesi setelah pembuka terlihat (±1,2 detik), `<dialog>` modal (fokus terkurung, Escape, kunci gulir, fokus kembali ke posisi sebelumnya/konten utama), poster utuh (`object-fit: contain`) + teks alternatif wajib (dicek DB) + tautan tindakan (`/…` atau `https://`).
- Panel rutin: pengumuman non-prioritas + berita ≤14 hari; tidak otomatis bila modal prioritas sudah tampil di sesi itu; tombol "Informasi" untuk membuka lagi.
- Pemandu: belum ada aset karakter → tombol "Bantuan" berikon tangan (melambai sekali). Pilihan peran hanya menunjuk rute yang ada; tidak memberi izin. Bisa disembunyikan pengunjung (localStorage).
- Contoh popup poster yang disebut di brief tidak terlampir di percakapan; implementasi mengikuti spesifikasi tertulis.

### Ruang kerja (`src/lib/ruang-kerja.ts`)
- Diturunkan dari izin database (hanya izin `*.kelola`/setara), tidak menambah kewenangan. `/admin/mulai` = tujuan setelah masuk/MFA: satu ruang kerja → langsung; pimpinan/beberapa/tanpa → Ringkasan; pemilih di sidebar bila ≥2.
- Ruang kerja: Kurikulum, Kesiswaan, Sarpras, Humas, Website, Tata Usaha, TPMPS, Perpustakaan, BK. Peran Operator memiliki `jadwal.kelola` sehingga juga mendapat ruang kerja Kurikulum (sesuai izinnya).

### E-Library
- Publik `/perpustakaan` (alias `/e-library`): cari, saring kategori, rekomendasi, sampul, ketersediaan, versi digital mengikuti hak akses database, panduan & aturan pinjam.
- Pribadi: `/portal/perpus` (login bersama). Petugas: `/admin/perpus` (ruang kerja Perpustakaan). Tidak ada pembaca digital/peminjaman tiruan.

### Pengujian
- `npm test` — 24 tes unit (validasi konfigurasi, fallback tema, operasi widget, pemilihan overlay, kontras palet, ruang kerja).
- `supabase/tests/rls_fase14_test.sql` — RLS draf/riwayat/terbit, katalog publik, batasan poster/tautan.
- `scripts/uji-e2e/` — uji alur nyata (29/29 LULUS lokal), keyboard ponsel, galat konsol, rekaman gulir.

## Portal Digital 22 & identitas berwarna — keputusan

### Referensi (diamati langsung 16 Okt 2026)
- sman6bdg.sch.id: hero foto besar berlapis gelap, header melayang berbentuk pil dengan dropdown, strip statistik, berita utama + daftar, prestasi berupa kartu tinggi, kotak hitam "Pojok Digital 6", footer hitam. Dropdown & hover **tidak** dibuka/diamati.
- pojokdigital6: judul besar di atas foto buram, 9 kartu kaca tinggi dalam satu baris geser horizontal (Guru, SPMB, Kurikulum, Kesiswaan, Humas, Sarpras, BK, Manajemen, Admin), tiap kartu menuju aplikasi terpisah. Teks kartu tertulis ganda di DOM (kemungkinan efek balik saat hover) — efeknya **tidak** diamati.
- Diadaptasi: foto dokumentasi besar, navigasi berkelompok, akses SPMB jelas, berita utama + daftar, pintu bidang yang terlihat sebelum masuk. Tidak disalin: identitas/teks/foto/statistik SMAN 6, kartu tinggi bergeser horizontal, kaca/blur, kontras samar, aplikasi terpisah per bidang (di sini satu login).

### Keputusan
- **Warna bidang**: token terpusat `src/lib/bidang.ts` (+ tes kontras), dokumentasi `docs/WARNA-BIDANG.md`. Identitas tetap merah logo.
- **Navigasi publik**: Profil · Pembelajaran · Kehidupan Siswa · Kabar & Agenda · SPMB · Layanan + tombol "Portal Digital 22" (`src/content/menu.ts`, `Header.tsx`). Menu ringkas di bawah 1240px.
- **Tema "Sekolah Berwarna"** (`warna`) kini bawaan: pembuka `panel` (foto besar + panel teks putih tanpa lapisan gelap), widget baru `prestasi` (berita kategori Prestasi; disembunyikan bila kosong), garis aksen bidang per bagian sesuai isi. Akademik & Modern tetap bisa dipilih; konfigurasi lama tetap valid.
- **Portal Digital 22** (`/portal-digital`): kelompok Warga sekolah / Ruang kerja manajemen / Layanan belajar & informasi / Administrasi sistem (hanya bagi `pengguna.kelola`). Kartu → `/portal-digital/buka/<bidang>` yang memutuskan di server (`putuskanPintu` di `src/lib/portal-digital.ts`): belum masuk → login bersama + `lanjut` aman; berwenang → ruang kerja; tidak berwenang → penjelasan. `lanjutAman()` mencegah open redirect; dipakai login & MFA.
- **Aksen ruang kerja**: `AksenBidang` (pita "Ruang kerja · …" + warna tombol utama), struktur kerja sama, hak tidak berubah.
- **E-Library**: aksen hijau, pencarian di kepala halaman. **SPMB**: aksen marun.
- Struktur Kurikulum (`/admin/kurikulum`) memang dapat dibaca semua staf (desain lama); ruang kerja Kurikulum = izin kelola.

### Pengujian tambahan
- `npm test`: 36 tes (termasuk kontras warna bidang & keputusan pintu/lanjut aman).
- `scripts/uji-e2e/uji-portal.mjs`: 14/14 lulus lokal. `uji-alur.mjs` (regresi): 29/29 lulus.

## Buku Tahunan (branch `buku-tahunan`) — keputusan

Konsep: majalah/koran sekolah, bukan SaaS. Mockup acuan: `Beranda.pdf` & `Portal Digital 22.pdf` dari pemilik.

### Token (Tahap 1, `src/app/globals.css`)
- Newsreader (judul) + Plus Jakarta Sans (isi) via `next/font` (`src/app/fonts.ts`).
- `--color-brand` #7a1f36 (marun dari rona logo; brief menyarankan #7A1F2B — ganti di satu token bila pemilik memilih itu),
  `--color-paper` #f5f0e6, `--color-ink` #1c1a17, `--color-ink-muted` #5b554c, `--color-accent` #b8892b (jarang), `--color-rule` #d9d0bf.
- Sudut 0–4px, tanpa bayangan, paragraf maks. 65ch, isi 18px/1,6. Halaman `/spesimen` (404 di produksi) menampilkan semua token.

### Beranda (Tahap 2) — tema `buku` (bawaan baru), `src/components/buku/`
- `SusunanBuku.tsx` memetakan widget → bagian: hero foto 80vh (gradasi bawah, 1 tombol + 1 tautan, keterangan kanan bawah),
  pita angka (dari profil; sembunyi bila < 2 angka), Kabar dari Sekolah (1 utama 3:2 + 4 kecil tanpa kartu),
  Pengumuman + Agenda (agenda hanya ≥ hari ini WIB), blok SPMB marun (hanya bila `spmb_info.aktif`),
  Prestasi (tabel `prestasi`, saring tingkat tanpa JS wajib) + alumni PTN, Kehidupan siswa (mozaik 1+4, keterangan unik),
  Akses cepat (daftar teks) + kontak + peta. Footer marun "Dikelola oleh Tim TIK".
- Tombol/panel "Informasi" mengambang dimatikan di tema buku; pengumuman terpenting tampil di pita marun di atas header.
- Bagian tanpa data disembunyikan (tidak ada "Belum ada…"). Berita tanpa foto tampil tanpa kotak gambar.
- Semua bagian dirender di server; hanya slideshow hero & saringan prestasi yang memakai JS (konten tetap terbaca tanpa JS).

### Media sementara
- `<MediaSlot>` (`src/components/MediaSlot.tsx`): foto, ilustrasi berlabel "Ilustrasi sementara", atau fallback blok krem bergaris emas + "22".
- Kolom `is_placeholder` (bawaan **false** — menyimpang dari brief yang meminta true, karena foto lama & unggahan admin adalah foto asli).
- Ringkasan admin menampilkan jumlah media sementara; tombol "Tandai foto asli" di Berita, Galeri, Prestasi.
- `public/media/placeholder/`: 10 foto Unsplash (WebP, hero ≤ 400 KB, lainnya ≤ 200 KB) — sumber & fotografer di `CREDITS.md`.
  Hanya dipakai data contoh `scripts/uji-e2e/seed-buku.sql` (semua `is_placeholder = true`, menolak jalan di database tanpa data [UJI]).

### Portal Digital 22 (Tahap 3)
- 3 kartu foto (Guru, Siswa, Orang Tua), ruang kerja manajemen = daftar 2 kolom satu warna (inisial atau foto PJ bulat),
  "Terbuka untuk umum" = baris teks. Warna per bidang & pita pelangi tidak dipakai lagi di portal.
- Penanggung jawab diatur di Admin → Penanggung Jawab Portal (`portal_bidang`).

### Migrasi baru
3. `supabase/migrations/20261210000000_buku_tahunan.sql` — `prestasi`, `spmb_info`, `portal_bidang`, kolom alumni PTN di `profil_sekolah`,
   `is_placeholder`. Uji: `supabase/tests/rls_fase20_test.sql`. Tanpa migrasi, beranda tetap jalan (bagian terkait disembunyikan) dan halaman admin menampilkan pesan "jalankan migrasi".

### Gerak (Tahap 4) — `src/components/buku/`
- `GerakBuku.tsx` (pembungkus ringan) memuat `MesinGerak.tsx` (GSAP + ScrollTrigger + CustomEase, `useGSAP`) sebagai
  potongan terpisah **setelah LCP foto hero tercatat** dan peramban senggang; pengguna reduced-motion tidak mengunduhnya.
- Easing tunggal `cubic-bezier(0.22, 1, 0.36, 1)` (CustomEase "buku"). Semua keadaan awal diset di dalam `useGSAP`;
  CSS tidak pernah menyembunyikan konten. `gsap.matchMedia`: animasi hanya `(prefers-reduced-motion: no-preference)`,
  parallax hanya `(min-width: 900px) and (hover: hover)`; dibersihkan saat unmount.
- Isi: pembuka hero (foto 1.08→1 1,6 s; baris judul naik dari masker `.bk-masker` 0,8 s stagger 0,12 s), garis emas
  160px (`.bk-garis-emas`) di Kabar/Prestasi/Kehidupan, buka-klip foto berita & galeri (sekali), hitung naik pita angka
  (bukan tahun berdiri), garis luar "22" SPMB (stroke-dashoffset, scrub), parallax hero (lapisan 0→140px/700px; lapisan
  `.hb-lapisan` 160px lebih tinggi lewat media query yang sama) & teks hero (0→-60px, opacity 1→0,25 /600px), parallax
  "22" SPMB (+90→-90px), dan foto di dalam bingkai (berita utama & mozaik Kehidupan Siswa: foto 1.2x, geser
  -5%→5% foto besar / -9%→9% foto kecil; bingkai & keterangan diam). Pemicu di bawah lipatan dibuat saat senggang.
- Hover: zoom foto 1.04 memakai properti CSS `scale` (bukan `transform`) agar tidak bentrok dengan transform GSAP;
  tombol terangkat 1px (`translate`, 0,2 s); keduanya mati saat reduced-motion.
- Video hero tanpa atribut `autoplay`: diputar lewat JS hanya bila gerak diizinkan (poster tetap tampil).
- Pembuka hero hanya dijalankan bila halaman dibuka di atas dan mesin siap < 4 s (perangkat lambat tidak melihat teks
  "hilang lalu muncul"). Teks isi, daftar pengumuman, dan footer tidak dianimasikan.
- `HeaderMengecil.tsx`: atribut `data-kecil` pada header setelah gulir 24px (transisi CSS 0,3 s).
- Embla: `HeroFoto.tsx` (aktif hanya bila > 1 foto) & `GeserGaleri.tsx` (slider < 1024px, aktif saat mendekati layar;
  tanpa JS = gulir-geser CSS scroll-snap; ≥ 1024px tetap mozaik).
- Next 16: `priority` pada `next/image` sudah usang → hero memakai `loading="eager"` + `fetchPriority="high"`.
  Prefetch dimatikan pada tautan hero/pita & logo (logo = halaman yang sedang dibuka).
- Uji: `scripts/uji-e2e/uji-gerak.mjs` (tanpa JS, reduced-motion, 390px tanpa parallax) &
  `scripts/tangkap-gulir.mjs` (tangkapan posisi gulir + cek celah hero / elemen tersembunyi / luber).
- Lighthouse ponsel (build produksi lokal, 18 Okt 2026): simulasi 89–90 (4 dari 5 putaran), throttling nyata 85–87,
  CLS 0. Satu putaran 76 karena lukisan pertama Chrome headless lokal tertunda ±1 s (juga terjadi di /kontak; bukan kode).

### Navigasi (19 Okt 2026)
- `src/content/menu.ts`: Layanan = E-Library, Pengaduan & aspirasi, Verifikasi sertifikat, Survei layanan (Portal
  Digital 22 hanya lewat tombol di kanan header). Pembelajaran = Program & karakter, **E-Learning**.
- Tujuan E-Learning: item "E-Learning" di daftar Layanan CMS (Admin → Tampilan Website, kolom `pengaturan_situs.layanan`,
  sudah ada sejak migrasi cms_lanjutan). Bila URL-nya kosong/tidak aman → `/pembelajaran/e-learning` (penjelasan +
  tombol "Masuk lewat Portal Digital 22"). Diselesaikan di server oleh `tautanELearning()` dan diteruskan ke Header,
  footer, dan akses cepat beranda (`menu.test.ts`).
- Footer: kolom Jelajahi, Pembelajaran, Layanan, SPMB. Akses cepat beranda berkelompok Pembelajaran / Layanan;
  setiap tujuan muncul sekali.

## Langit cerah + Tur sekolah (branch `langit-cerah`) — keputusan

Pengerjaan bertahap (A–D); setiap tahap berhenti untuk persetujuan pemilik ("lanjut").
Keputusan pemilik 20 Okt 2026: Guru & staf memakai tabel CMS publik baru (Tahap C); item menu yang halamannya
belum ada diarahkan ke halaman terdekat (ditandai `// sementara` di `src/content/menu-langit.ts`); YouTube hanya
tampil bila URL-nya diisi di CMS; dikerjakan di branch baru.

### Tahap A
- **Token**: `src/styles/tokens.css` (satu sumber; juga `@theme inline` Tailwind). Huruf: Plus Jakarta Sans 400–800
  (`--font-jakarta`) + JetBrains Mono 500/700 untuk `.label-mono`. Nama token lama (`--color-brand`, `--color-paper`,
  kelas `text-merah`, `bg-krem`, `font-serif`, …) dipetakan ke nilai baru di `globals.css` — dihapus di Tahap C.
  Teks biru kecil memakai `--blue-teks` #1F5FD1 (5,6:1); #2F7DF6 hanya untuk elemen besar/grafis (4,2:1).
- **Tema**: `langit` satu-satunya tema yang bisa dipilih; tema lama `tersedia: false` (konfigurasi lama → langit).
  Palet `cerah`. Uji: `tampilan.test.ts`.
- **Header + menu** (`src/components/langit/`): `SiteHeader` (transparan di atas `[data-hero-langit]`, lalu putih 90% +
  blur), `FullMenu` (`<dialog>` bawaan: Esc, fokus terkunci, fokus kembali ke pemicu; tata letak tidak bergeser saat
  grup aktif berganti), `SiteFooter` (struktur = menu, `id="navigasi-situs"` = tujuan tautan menu tanpa JS),
  `dataMenu()` (E-Learning dari CMS, alamat/jam dari profil, Instagram/YouTube hanya bila URL https diisi).
  Dipakai semua halaman lewat `KerangkaPublik` + halaman 404. Pita pengumuman & tombol "Informasi" tidak ada lagi.
- **Hero + kartu putar**: `HeroLangit`, `KartuPutar` (rAF sendiri; geometri murni di `src/lib/cincin.ts` + tes),
  `MasukBertahap` (Web Animations, dilewati bila reduced-motion/hidrasi lambat). Tombol "Tur sekolah" muncul di
  Tahap B (butuh `#tur`). Kartu dari tabel `kartu_beranda` (migrasi `20261220000000_kartu_beranda.sql`; tanpa tabel →
  12 kartu bawaan di `src/content/kartu-beranda.ts`). Admin: `/admin/kartu-beranda`.
- Pointer: cincin `pointer-events: none` (hanya kartu & panggung); pointer baru ditangkap setelah seret > 6px agar klik
  tetap sampai ke tautan; `dragstart` bawaan dicegah.
- Uji: `scripts/uji-e2e/uji-langit.mjs` (18 cek), `uji-menu.mjs` (struktur menu, Esc, footer, 24 tautan),
  `uji-gerak.mjs` (tanpa JS / reduced-motion / 390), `supabase/tests/rls_langit_test.sql`.
- Pencarian sementara: kotak cari menu → `/berita?q=` (halaman pencarian penuh di Tahap C).

### Tahap B
- **Tur sekolah** (`src/components/langit/TurSekolah.tsx`, `TurPembungkus.tsx`, `MesinTur.tsx`; logika murni `src/lib/tur.ts`
  + tes): dirender server sebagai daftar (tanpa JS / HP / reduced motion). `TurPembungkus` memuat `MesinTur` (GSAP +
  ScrollTrigger, `useGSAP`, `gsap.matchMedia`) saat section mendekati layar; desktop ≥ 900px dengan gerak → section
  sticky setinggi (n+1)×100vh: awan 10% pertama, crossfade di 40% tengah tiap segmen, zoom 1.12 → 1.04, kartu kiri
  bawah, penanda kanan, video hanya diputar saat titiknya aktif. Titik pertama bernomor 00 (pembuka).
- **Data**: tabel `tur_sekolah` + bucket `tur-sekolah` (migrasi `20261221000000_tur_sekolah.sql`; trigger maks 8 aktif;
  video wajib poster; foto wajib alt). Tanpa tabel → titik bawaan `src/content/tur-bawaan.ts`; tabel kosong → section
  disembunyikan. Widget `tur` (konfigurasi tampilan versi 2; konfigurasi versi 1 otomatis mendapat tur setelah hero).
- **Admin `/admin/tur-sekolah`**: unggah langsung browser → Storage (URL bertanda tangan, `mintaUnggahanTur`) ke `masuk/`;
  saat simpan server memproses — foto → WebP maks 2400px (`sharp`), poster maks 1920px, video MP4 ≤ 15 detik / 8 MB
  diperiksa dari isi berkas (`durasiMp4`, kotak mvhd) lalu dipindah ke `video/`; berkas lama dihapus. Titik fokus
  dengan klik pratinjau, pratinjau desktop/HP, urutan seret-lepas + tombol panah, aktif/nonaktif 3–8.
- **Bento "SMAN 22 dalam angka"** (`BentoAngka.tsx`): tahun berdiri (konten), siswa aktif & ekskul & kutipan/nama kepala
  sekolah (formulir Profil), persen lulusan ke PT & jabatan (kolom baru, formulir "Angka beranda" di halaman Profil).
  Kartu tanpa data tidak tampil.
- **Ajakan SPMB** (`CtaSpmb.tsx`): hanya bila `spmb_info.aktif`; posisi bawaan di akhir beranda.
- Uji: `scripts/uji-e2e/uji-tur.mjs` (16 cek: unggah foto & kompres, tolak video 20 detik, ganti ke video tanpa deploy,
  tur awan → titik terakhir, video hanya saat aktif, HP daftar, urutan, batas minimal 3; keadaan dikembalikan),
  `scripts/tangkap-tur.mjs`, `supabase/tests/rls_tur_test.sql`. Berkas media uji sintetis dibuat dengan ffmpeg.
