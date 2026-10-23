/**
 * Foto stok Unsplash LAMA (18 Okt 2026, public/media/placeholder/CREDITS.md) yang masih dipakai bawaan situs.
 * Foto stok baru (23 Okt 2026) dicatat di tabel foto_slot (CMS) beserta lokasinya.
 */
export type KreditFoto = { berkas: string; isi: string; fotografer: string; tautan: string; lokasi: string[]; diunduh: string };

export const KREDIT_STOK_LAMA: KreditFoto[] = [
  { berkas: "/media/placeholder/hero-1.webp", isi: "Upacara bendera di lapangan, dari jauh", fotografer: "Mufid Majnun", tautan: "https://unsplash.com/photos/La3MwNrgEDc", lokasi: ["Mega menu Pembelajaran — E-Learning"], diunduh: "2026-10-18" },
  { berkas: "/media/placeholder/berita-1.webp", isi: "Siswa SMA berseragam putih abu-abu berdiskusi", fotografer: "Ed Us", tautan: "https://unsplash.com/photos/_y4FqRhxkR8", lokasi: ["Kartu putar beranda — Prestasi"], diunduh: "2026-10-18" },
  { berkas: "/media/placeholder/berita-2.webp", isi: "Ruang kelas kosong", fotografer: "Ivan Aleksic", tautan: "https://unsplash.com/photos/PDRFeeDniCk", lokasi: ["Kartu putar beranda — Penerimaan murid baru"], diunduh: "2026-10-18" },
  { berkas: "/media/placeholder/berita-4.webp", isi: "Lorong rak perpustakaan", fotografer: "K8", tautan: "https://unsplash.com/photos/qX1d8KT18kk", lokasi: ["Kartu putar beranda — E-Library"], diunduh: "2026-10-18" },
  { berkas: "/media/placeholder/galeri-1.webp", isi: "Siswa & guru di lapangan sekolah", fotografer: "Fajar Herlambang STUDIO", tautan: "https://unsplash.com/photos/meovJ4hqaao", lokasi: ["Kartu putar beranda — Portal Digital 22"], diunduh: "2026-10-18" },
];
