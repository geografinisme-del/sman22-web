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

/** Halaman penjelasan E-Learning; dipakai selama URL E-Learning di CMS (Tampilan Website → Layanan) kosong. */
export const E_LEARNING_BAWAAN = "/pembelajaran/e-learning";

/**
 * Tujuan menu E-Learning: URL item "E-Learning" pada daftar layanan CMS bila diisi (tautan internal "/…" atau
 * "https://…"), selain itu halaman penjelasan bawaan. Modul murni agar bisa diuji.
 */
export function tautanELearning(layanan: { nama?: string; url?: string }[] | undefined): string {
  const url = layanan?.find((l) => /^e-?learning$/i.test((l.nama ?? "").trim()))?.url?.trim() ?? "";
  if (/^\/(?!\/)[\w\-./?=&#%]*$/.test(url) || /^https:\/\/[^\s<>"]+$/.test(url)) return url;
  return E_LEARNING_BAWAAN;
}
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
      { href: E_LEARNING_BAWAAN, label: "E-Learning", teks: "Kelas digital, materi, dan tugas daring." },
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
      { href: "/perpustakaan", label: "E-Library", teks: "Cari buku dan cek ketersediaan." },
      { href: "/pengaduan", label: "Pengaduan & aspirasi", teks: "Pantau dengan nomor tiket." },
      { href: "/sertifikat", label: "Verifikasi sertifikat", teks: "Cek keaslian sertifikat dan piagam sekolah." },
      { href: "/survei", label: "Survei layanan", teks: "Beri penilaian untuk layanan sekolah." },
    ],
  },
];

/** Navigasi dengan tujuan E-Learning yang sudah diselesaikan dari CMS. */
export function navigasiDengan(eLearning: string): GrupMenu[] {
  if (eLearning === E_LEARNING_BAWAAN) return navigasi;
  return navigasi.map((g) => (g.anak ? { ...g, anak: g.anak.map((a) => (a.href === E_LEARNING_BAWAAN ? { ...a, href: eLearning } : a)) } : g));
}

/** @deprecated dipertahankan untuk kompatibilitas; gunakan grup "Layanan" di `navigasi`. */
export const layanan = navigasi.find((g) => g.label === "Layanan")!.anak!;
