# Rencana media sementara — tema "Buku Tahunan"

Folder ini untuk **ilustrasi sementara** sampai foto asli sekolah tersedia. Status saat ini:
**belum ada berkas stok yang diunduh** (perlu persetujuan pemilik proyek). Semua slot memakai foto asli
sekolah yang sudah ada di `public/images/` atau fallback blok krem (#E3D9C6, garis emas tipis, "22" samar).

## Aturan

1. Semua media publik dirender lewat `<MediaSlot>` (`src/components/MediaSlot.tsx`).
2. Media sementara diberi `is_placeholder = true` di database → tampil label **"Ilustrasi sementara"**.
3. Foto unggahan admin otomatis dianggap asli (`is_placeholder = false`).
4. Admin → Ringkasan menampilkan jumlah media yang masih sementara; tombol **"Tandai foto asli"** ada di
   daftar Berita, Galeri, dan Prestasi.
5. Gambar sintetis (AI) **tidak boleh** menampilkan wajah yang bisa dikira siswa/guru asli, seragam/logo
   sekolah, papan nama, atau teks. Utamakan suasana: ruang kelas kosong, tangan menulis, buku, lapangan dari jauh.
6. Setiap berkas stok wajib dicatat di `CREDITS.md` (sumber, penulis, lisensi, URL).
7. Video hero hanya dipakai bila berkasnya ada: muted, loop, playsinline, dengan poster; disembunyikan saat
   `prefers-reduced-motion`.

## Slot

| Berkas | Dipakai di | Rasio / ukuran | Prompt / kata kunci (EN) |
| --- | --- | --- | --- |
| `hero-1.jpg` | Beranda — hero | 16:9, 2400 px | Wide shot of an Indonesian public high school courtyard at golden hour, students seen from far behind walking, warm natural light, documentary photography, no readable text, no logos |
| `hero-loop.mp4` | Beranda — video hero (opsional) | 16:9, 1920 px, ≤ 8 s, ≤ 4 MB, tanpa audio | Slow dolly shot across an empty school corridor with sunlight through windows, calm, documentary, seamless loop |
| `berita-1.jpg` | Kabar utama | 3:2, 1600 px | Students' hands working on a science experiment on a wooden lab bench, shallow depth of field, no faces |
| `berita-2.jpg` | Kabar kecil | 3:2, 800 px | Stack of textbooks and notebooks on a classroom desk by a window, morning light |
| `berita-3.jpg` | Kabar kecil | 3:2, 800 px | School flag ceremony seen from behind at a distance, soft morning haze, no identifiable faces |
| `berita-4.jpg` | Kabar kecil | 3:2, 800 px | Basketball on an outdoor school court with long shadows, late afternoon |
| `galeri-1.jpg` | Kehidupan siswa (besar) | 4:5, 1600 px | Group of teenagers in a school hall seen from behind during a performance, stage lights, candid |
| `galeri-2.jpg` … `galeri-5.jpg` | Kehidupan siswa (kecil) | 1:1, 800 px | Candid school-life details: library shelves, art supplies, sports shoes on a field, musical instruments — no faces, no text |
| `portal-guru.jpg` | Portal — kartu Guru | 4:3, 1200 px | Teacher's desk with lesson plans, laptop and coffee, warm light, no faces |
| `portal-siswa.jpg` | Portal — kartu Siswa | 4:3, 1200 px | Backpacks and notebooks on a school bench, bright daylight |
| `portal-ortu.jpg` | Portal — kartu Orang Tua | 4:3, 1200 px | School gate in the morning seen from the street, parents' silhouettes far away |

Saat ini kartu Portal memakai foto asli: `kegiatan-aula.jpg` (Guru), `apel-lapangan.jpg` (Siswa), `gedung.jpg` (Orang Tua).
