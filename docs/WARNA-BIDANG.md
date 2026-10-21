# Pemetaan warna bidang

Sumber kebenaran: `src/lib/bidang.ts` (diuji di `src/lib/bidang.test.ts`). Warna bidang adalah **usulan UI**, bukan warna resmi sekolah.

## Dua lapisan warna

1. **Identitas sekolah**: merah logo `#b3123c` (token tema `--tema-utama`, palet di `src/lib/tampilan/token.ts`). Dipakai untuk merek, tombol utama situs, dan garis identitas.
2. **Penanda bidang**: membantu navigasi. Dipakai pada ikon, label, indikator aktif, garis aksen, dan pita nama ruang kerja. Permukaan halaman tetap putih/netral.

Warna status (sukses `#047857`, peringatan `#92400e`/`#8a4b00`, gagal `#b91c1c`) terpisah dan tidak boleh memakai token bidang. Bidang selalu juga dikenali lewat **nama dan ikon**, bukan warna saja.

| Bidang | Kunci | Solid (teks putih) | Tint (latar lembut) | Teks gelap | Garis | Ikon |
| --- | --- | --- | --- | --- | --- | --- |
| Pojok Guru (biru) | `guru` | `#1d4ed8` | `#eaf1fe` | `#173a8a` | `#b9cdfa` | BookOpenCheck |
| Kurikulum (indigo) | `kurikulum` | `#4338ca` | `#eeedfc` | `#312a91` | `#c7c3f4` | GraduationCap |
| Kesiswaan (jingga) | `kesiswaan` | `#b45309` | `#fdf1e3` | `#7a3a07` | `#f3cf9f` | Users |
| Sarpras (teal) | `sarpras` | `#0f766e` | `#e3f5f2` | `#0b524d` | `#a8dcd5` | Building2 |
| Humas (rose) | `humas` | `#be185d` | `#fde9f2` | `#8a1043` | `#f5b9d3` | Megaphone |
| Tata Usaha (slate) | `tata_usaha` | `#475569` | `#eef1f5` | `#334155` | `#c9d1dc` | FolderOpen |
| TPMPS / Mutu (violet) | `tpmps` | `#6d28d9` | `#f2ecfe` | `#4c1d95` | `#d8c6fb` | BadgeCheck |
| E-Library (hijau) | `elibrary` | `#15803d` | `#e7f6ec` | `#14532d` | `#b3e2c2` | Library |
| SPMB (merah marun) | `spmb` | `#8f1d2c` | `#fbecee` | `#6e1522` | `#ecbcc3` | School |
| Bimbingan Konseling (cyan gelap) | `bk` | `#0e7490` | `#e2f4f8` | `#0b5468` | `#a9dce8` | HeartHandshake |
| Manajemen (navy) | `manajemen` | `#1e3a5f` | `#e8eef6` | `#1e3a5f` | `#bdcbe0` | LayoutDashboard |
| Portal Siswa (biru langit) | `siswa` | `#0369a1` | `#e3f2fb` | `#075985` | `#a9d6f1` | Backpack |
| Portal Orang Tua (cokelat hangat) | `ortu` | `#8a5a2b` | `#f6eee4` | `#5f3c1a` | `#e2cdb3` | Home |
| Administrasi Sistem (abu) | `sistem` | `#52525b` | `#f1f1f3` | `#3f3f46` | `#d4d4d8` | Settings |

Humas memakai rose kemerahan-merah muda agar tidak tertukar dengan merah identitas maupun marun SPMB.

## Pemakaian

- Pasang `data-bidang="<kunci>"` pada pembungkus. Variabel yang tersedia: `--bidang`, `--bidang-tint`, `--bidang-teks`, `--bidang-garis` (dibuat `cssBidang()` di root layout).
- Area kerja admin: `AksenBidang` memetakan ruang kerja → bidang dan mengganti `--tema-utama` di area konten. Hak akses tidak berubah.
- Halaman milik satu bidang (E-Library, SPMB): `<div className="halaman-bidang" data-bidang="…">`.
- Beranda tema "Sekolah Berwarna": bagian diberi bidang sesuai isi (program → kurikulum, prestasi/kehidupan siswa → kesiswaan, e-library → elibrary, kontak → humas); layanan memakai `bidangDariTautan()`.

## Mengubah warna

Ubah nilai di `src/lib/bidang.ts`, lalu jalankan `npm test`. Tes menolak pasangan yang tidak lolos kontras AA (teks putih di atas solid, teks gelap di atas tint/putih, solid di atas putih) dan warna solid yang kembar.
