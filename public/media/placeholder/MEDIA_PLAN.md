# Rencana media sementara — desain "Langit cerah + Tur sekolah"

Folder ini berisi **ilustrasi sementara** (foto stok Unsplash, lihat `CREDITS.md`) sampai foto asli SMA Negeri 22
Bandung tersedia. Foto asli sekolah ada di `public/images/`. Status per 20 Okt 2026.

## Aturan

1. Semua foto/video konten dirender lewat **satu komponen** `<MediaSlot>` (`src/components/MediaSlot.tsx`):
   `src`, `alt`, `caption`, `ratio`, `isPlaceholder`, `focus` (+ `video` untuk tur). Pengecualian: logo sekolah
   (header/footer/portal) dan poster pengumuman (ditampilkan utuh tanpa rasio tetap).
2. Media sementara diberi `is_placeholder = true` di database → label kecil **"Ilustrasi sementara"** di situs.
   Keterangan foto sementara tidak menyebut nama siswa, tanggal, atau peristiwa nyata.
3. Foto lama di `public/images/` dan setiap unggahan admin = **foto asli** (`is_placeholder = false`).
4. Admin → Ringkasan menampilkan jumlah media yang masih sementara (berita, galeri, prestasi, slide hero, kartu
   beranda, tur sekolah, guru & staf, fasilitas). Tombol **"Tandai foto asli"** ada di daftar masing-masing.
5. Tanpa berkas → blok gradien langit dengan "22" samar (bukan kotak abu/ikon rusak); di tur: "Foto menyusul".
6. Foto stok: siswa SMA Indonesia (putih abu-abu) atau suasana tanpa orang; tanpa logo sekolah lain; tanpa wajah
   close-up; WebP, hero ≤ 400 KB, lainnya ≤ 200 KB. Wajib dicatat di `CREDITS.md`.
7. Video (tur): MP4 ≤ 15 detik / 8 MB, muted, loop, playsinline, poster wajib; hanya diputar saat titiknya aktif,
   tidak diputar otomatis bila `prefers-reduced-motion`.

## Slot

| Slot | Dipakai di | Rasio | Sumber saat ini | Sementara? |
| --- | --- | --- | --- | --- |
| Kartu putar (12) | Beranda — hero | 260 × 150 | `kartu_beranda` / `KARTU_BAWAAN`: 6 foto asli `/images/*`, 6 stok (`galeri-1/3/5`, `berita-1/2/4`) | stok = ya |
| Tur sekolah (6 titik) | Beranda — `#tur` | layar penuh / 16:10 di HP | `tur_sekolah` / `TUR_BAWAAN`: foto asli `/images/*`, titik Perpustakaan tanpa foto | ya (titik contoh) |
| Bento "dalam angka" | Beranda | isi kartu | slide hero CMS → visual beranda → `/images/keluarga-besar.jpg` | tidak |
| Kabar dari sekolah | Beranda, `/berita`, artikel | 16:10, 4:3, 3:2 | foto berita (CMS) | per baris |
| Kehidupan siswa (mozaik 1 + 4) | Beranda | isi | galeri (CMS) → fallback `kehidupanSekolah` (foto asli) | per baris |
| Tentang kami | Beranda | 4:3 | `/images/gedung.jpg` | tidak |
| Galeri (masonry + lightbox) | `/galeri`, `/profil/fasilitas` | 4:5, 4:3, 1:1, 3:4, 16:10 bergiliran | galeri (CMS) | per baris |
| PageHero (latar luminosity) | Profil, dll. | isi | `/images/gedung.jpg` | tidak |
| Guru & staf | `/profil/guru-staf` | 4:5 | `staf_publik.foto_url` (kosong → inisial) | per baris |
| Fasilitas | `/profil/fasilitas` | kartu 150 px | `fasilitas.foto_url` | per baris |
| Kartu peran Portal | `/portal-digital` | 4:3 | foto asli: `kegiatan-aula.jpg`, `apel-lapangan.jpg`, `gedung.jpg` | tidak |
| Halaman masuk | `/admin/login` | isi | visual "akun" CMS → `/images/gedung.jpg` | tidak |
| Sampul buku | E-Library | 2:3 | katalog (URL luar) → huruf awal judul | — |

## Berkas stok yang tersedia

`hero-1.webp`, `berita-1.webp` … `berita-4.webp`, `galeri-1.webp` … `galeri-5.webp` — rincian sumber di `CREDITS.md`.
Foto stok hanya dipakai kartu bawaan dan data contoh (`scripts/uji-e2e/seed-buku.sql`), semuanya `is_placeholder = true`.
