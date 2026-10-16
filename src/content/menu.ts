/** Daftar halaman utama (dipakai sitemap & footer). */
export const menu = [
  { href: "/", label: "Beranda" },
  { href: "/profil", label: "Profil" },
  { href: "/program", label: "Program" },
  { href: "/berita", label: "Berita" },
  { href: "/agenda", label: "Agenda" },
  { href: "/galeri", label: "Galeri" },
  { href: "/spmb", label: "SPMB" },
  { href: "/kontak", label: "Kontak" },
];

export type TautanMenu = { href: string; label: string; teks?: string };
export type GrupMenu = { label: string; href?: string; anak?: TautanMenu[] };

/**
 * Navigasi utama situs publik, dikelompokkan agar mudah dipindai.
 * Semua tujuan adalah rute yang ada. "Prestasi" memakai saringan kategori berita.
 */
export const navigasi: GrupMenu[] = [
  {
    label: "Profil",
    anak: [
      { href: "/profil", label: "Profil sekolah", teks: "Identitas, visi-misi, dan sejarah." },
      { href: "/sambutan", label: "Sambutan kepala sekolah" },
      { href: "/kontak", label: "Kontak & lokasi" },
    ],
  },
  {
    label: "Pembelajaran",
    anak: [
      { href: "/program", label: "Program & karakter", teks: "7KAIH, Gerbang Pancawaluya, kokurikuler." },
      { href: "/perpustakaan", label: "E-Library", teks: "Katalog buku & koleksi digital." },
    ],
  },
  {
    label: "Kehidupan Siswa",
    anak: [
      { href: "/ekskul", label: "Ekskul & OSIS" },
      { href: "/galeri", label: "Galeri kegiatan" },
      { href: "/alumni", label: "Alumni" },
    ],
  },
  {
    label: "Kabar & Agenda",
    anak: [
      { href: "/berita", label: "Berita" },
      { href: "/berita?kategori=Prestasi", label: "Prestasi" },
      { href: "/agenda", label: "Agenda & pengumuman" },
    ],
  },
  { label: "SPMB", href: "/spmb" },
  {
    label: "Layanan",
    anak: [
      { href: "/portal-digital", label: "Portal Digital 22", teks: "Pintu masuk guru, siswa, orang tua & manajemen." },
      { href: "/perpustakaan", label: "E-Library", teks: "Cari buku dan cek ketersediaan." },
      { href: "/pengaduan", label: "Pengaduan & aspirasi", teks: "Pantau dengan nomor tiket." },
      { href: "/sertifikat", label: "Verifikasi sertifikat" },
      { href: "/survei", label: "Survei layanan" },
    ],
  },
];

/** @deprecated dipertahankan untuk kompatibilitas; gunakan grup "Layanan" di `navigasi`. */
export const layanan = navigasi.find((g) => g.label === "Layanan")!.anak!;
