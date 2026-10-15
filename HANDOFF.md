# HANDOFF — Website SMA Negeri 22 Bandung

Catatan serah-terima untuk pengembang/agen berikutnya. Perbarui berkas ini setiap kali ada keputusan desain atau status pekerjaan yang berubah.

## Status

| Pekerjaan | Branch | Status |
| --- | --- | --- |
| Desain ulang editorial (situs publik, masuk, MFA, dasbor, sidebar) | `desain-editorial-sekolah` | Selesai, di-commit, **belum di-push / belum di-merge ke `main`** |
| Sistem gerak (motion) situs publik | `desain-editorial-sekolah` | Selesai, di-commit, belum di-push |
| Platform: ruang kerja, E-Library, mesin tema & widget, popup prioritas, pemandu | `desain-editorial-sekolah` | Selesai & diuji lokal, di-commit, belum di-push. **Butuh 2 migrasi** (lihat bawah) |

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
