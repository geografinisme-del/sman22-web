/**
 * Struktur navigasi "Langit cerah": header (mega menu desktop), menu HP terang, dan footer memakai data yang sama.
 * Label & tujuan tautan TETAP di kode; teks pengantar, keterangan tautan, kartu sorotan, dan teks tombol ajakan HP
 * bisa ditimpa dari CMS (Admin → Menu navigasi, migrasi 20261223) — lihat `gabungMenuCms`.
 * E-Learning: URL dari CMS (`tautanELearning`), bawaan /pembelajaran/e-learning. Modul murni (bisa diuji).
 */
import { E_LEARNING_BAWAAN } from "./menu.ts";

export type Tautan = { href: string; label: string };
export type TautanMenu = Tautan & { keterangan: string };
export type KartuSorotan = { judul: string; keterangan: string; href: string; foto: { src: string; alt: string }; fokus?: { x: number; y: number }; sementara?: boolean };
export type KunciGrup = "profil" | "pembelajaran" | "kehidupan" | "kabar" | "layanan";
export type GrupLangit = {
  kunci: KunciGrup;
  label: string;
  /** label ringkas (dipakai di tempat sempit) */
  pendek: string;
  /** kalimat pengantar di panel mega menu & akordeon HP */
  keterangan: string;
  /** jenis isi kanan panel desktop */
  jenis: "foto" | "kabar" | "layanan";
  /** judul kecil di atas kartu sorotan (opsional) */
  sorotanJudul?: string;
  /** maks. 3 kartu sorotan (jenis "foto") */
  sorotan: KartuSorotan[];
  /** foto kategori (akordeon HP, foto asli sekolah) + caption */
  foto: { src: string; alt: string; caption: string; sementara?: boolean };
  /** tombol lime ajakan utama (akordeon HP) */
  ajakan: Tautan;
  /** tautan "Lihat semua … →" di bawah daftar panel desktop */
  semua: Tautan;
  anak: TautanMenu[];
};

const FOTO = {
  gedung: { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung" },
  upacara: { src: "/images/upacara-pagi.jpg", alt: "Upacara pagi di lapangan sekolah" },
  masjid: { src: "/images/kajian-masjid.jpg", alt: "Kajian bersama di masjid sekolah" },
  aula: { src: "/images/kegiatan-aula.jpg", alt: "Kegiatan siswa di aula sekolah" },
  apel: { src: "/images/apel-lapangan.jpg", alt: "Siswa mengikuti apel di lapangan sekolah" },
  lebar: { src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah" },
  // foto stok (Unsplash, CREDITS.md) — belum ada foto asli pembelajaran yang cukup besar
  hero: { src: "/media/placeholder/hero-1.webp", alt: "Ilustrasi kegiatan sekolah" },
};

export const GRUP_LANGIT: GrupLangit[] = [
  {
    kunci: "profil",
    label: "Profil",
    pendek: "Profil",
    keterangan: "Mengenal SMA Negeri 22 Bandung: kepemimpinan, arah, dan perjalanan sekolah.",
    jenis: "foto",
    sorotan: [
      { judul: "Sambutan kepala sekolah", keterangan: "Pesan dan arah kepemimpinan.", href: "/sambutan", foto: FOTO.gedung },
      { judul: "Visi dan misi", keterangan: "Nilai yang kami pegang.", href: "/profil/visi-misi", foto: FOTO.upacara },
      { judul: "Fasilitas", keterangan: "Ruang belajar, masjid, aula, lapangan.", href: "/profil/fasilitas", foto: FOTO.masjid, fokus: { x: 50, y: 40 } },
    ],
    foto: { ...FOTO.gedung, caption: "Gedung utama" },
    ajakan: { href: "/profil", label: "Lihat profil sekolah" },
    semua: { href: "/profil", label: "Lihat semua profil" },
    anak: [
      { href: "/sambutan", label: "Sambutan kepala sekolah", keterangan: "Pesan dan arah kepemimpinan." },
      { href: "/profil/visi-misi", label: "Visi dan misi", keterangan: "Nilai yang kami pegang." },
      { href: "/profil/sejarah", label: "Sejarah", keterangan: "Perjalanan sejak 1989." },
      { href: "/profil/guru-staf", label: "Guru dan tenaga kependidikan", keterangan: "Direktori GTK." },
      { href: "/profil/fasilitas", label: "Fasilitas", keterangan: "Ruang belajar, masjid, aula, lapangan." },
      { href: "/profil/tata-tertib", label: "Tata tertib", keterangan: "Aturan dan pembiasaan." },
    ],
  },
  {
    kunci: "pembelajaran",
    label: "Pembelajaran",
    pendek: "Pembelajaran",
    keterangan: "Program, kurikulum, dan ruang belajar daring untuk siswa.",
    jenis: "foto",
    sorotanJudul: "Paling sering dibuka",
    sorotan: [
      { judul: "E-Learning", keterangan: "Kelas daring, tugas, materi.", href: E_LEARNING_BAWAAN, foto: FOTO.hero, sementara: true },
      { judul: "Kalender akademik", keterangan: "Semester, ujian, libur.", href: "/pembelajaran/kalender", foto: FOTO.aula },
      { judul: "Kurikulum", keterangan: "Struktur mata pelajaran dan pilihan.", href: "/pembelajaran/kurikulum", foto: FOTO.gedung },
    ],
    foto: { ...FOTO.aula, caption: "Aula sekolah" },
    ajakan: { href: E_LEARNING_BAWAAN, label: "Buka E-Learning" },
    semua: { href: "/pembelajaran", label: "Lihat semua pembelajaran" },
    anak: [
      { href: "/program", label: "Program dan karakter", keterangan: "Pembiasaan dan program unggulan." },
      { href: "/pembelajaran/kurikulum", label: "Kurikulum", keterangan: "Struktur mata pelajaran dan pilihan." },
      { href: "/pembelajaran/kalender", label: "Kalender akademik", keterangan: "Semester, ujian, libur." },
      { href: E_LEARNING_BAWAAN, label: "E-Learning", keterangan: "Kelas daring, tugas, materi." },
    ],
  },
  {
    kunci: "kehidupan",
    label: "Kehidupan Siswa",
    pendek: "Kehidupan Siswa",
    keterangan: "Prestasi, organisasi, dan kegiatan di luar kelas.",
    jenis: "foto",
    sorotan: [
      { judul: "Prestasi", keterangan: "Capaian kota hingga nasional.", href: "/prestasi", foto: FOTO.apel },
      { judul: "Ekskul dan OSIS", keterangan: "Pilihan kegiatan dan organisasi.", href: "/ekskul", foto: FOTO.lebar },
      { judul: "Galeri kegiatan", keterangan: "Foto dan video sekolah.", href: "/galeri", foto: FOTO.upacara },
    ],
    foto: { ...FOTO.apel, caption: "Apel di lapangan" },
    ajakan: { href: "/prestasi", label: "Lihat prestasi terbaru" },
    semua: { href: "/galeri", label: "Lihat semua kegiatan" },
    anak: [
      { href: "/prestasi", label: "Prestasi", keterangan: "Capaian kota hingga nasional." },
      { href: "/ekskul", label: "Ekskul dan OSIS", keterangan: "Pilihan kegiatan dan organisasi." },
      { href: "/galeri", label: "Galeri kegiatan", keterangan: "Foto dan video sekolah." },
    ],
  },
  {
    kunci: "kabar",
    label: "Kabar & Agenda",
    pendek: "Kabar",
    keterangan: "Pilih kategori untuk melihat kabar terbaru.",
    jenis: "kabar",
    sorotan: [],
    foto: { ...FOTO.upacara, caption: "Upacara pagi" },
    ajakan: { href: "/pengumuman", label: "Baca pengumuman terbaru" },
    semua: { href: "/berita", label: "Lihat semua kabar" },
    anak: [
      { href: "/berita", label: "Berita", keterangan: "Kabar kegiatan dan capaian sekolah." },
      { href: "/pengumuman", label: "Pengumuman", keterangan: "Informasi resmi untuk siswa dan orang tua." },
      { href: "/agenda", label: "Agenda dan kalender", keterangan: "Kegiatan yang akan datang." },
    ],
  },
  {
    kunci: "layanan",
    label: "Layanan",
    pendek: "Layanan",
    keterangan: "Layanan publik dan administrasi sekolah dalam satu tempat.",
    jenis: "layanan",
    sorotan: [],
    foto: { ...FOTO.masjid, caption: "Masjid sekolah" },
    ajakan: { href: "/pengaduan", label: "Sampaikan aspirasi" },
    semua: { href: "/kontak", label: "Lihat semua layanan" },
    anak: [
      { href: "/perpustakaan", label: "E-Library", keterangan: "Katalog dan koleksi perpustakaan digital." },
      { href: "/pengaduan", label: "Pengaduan dan aspirasi", keterangan: "Sampaikan masukan secara resmi." },
      { href: "/sertifikat", label: "Verifikasi sertifikat", keterangan: "Cek keaslian dokumen sekolah." },
      { href: "/survei", label: "Survei layanan", keterangan: "Bantu kami memperbaiki layanan." },
    ],
  },
];

/** Kategori kabar di mega menu (urutan sesuai brief). */
export const KATEGORI_KABAR = ["Semua", "Berita", "Pengumuman", "Prestasi", "Agenda"] as const;
export type KategoriKabar = (typeof KATEGORI_KABAR)[number];
export type ItemKabar = { id: string; jenis: Exclude<KategoriKabar, "Semua">; judul: string; tanggal: string; href: string; foto?: string; sementara?: boolean };

/** Chip akses cepat di baris bawah setiap panel mega menu. */
export const CHIP_AKSES: Tautan[] = [
  { href: "/spmb", label: "Info SPMB" },
  { href: "/portal-digital/masuk/siswa", label: "Portal Siswa" },
  { href: "/portal-digital/masuk/orang-tua", label: "Portal Orang Tua" },
  { href: "/portal-digital/masuk/gtk", label: "Guru & Tendik" },
  { href: E_LEARNING_BAWAAN, label: "E-Learning" },
  { href: "/perpustakaan", label: "E-Library" },
];

export type AksesCepat = { untuk: string; tautan: Tautan[] };
/** Akses cepat per pengguna (menu HP). */
export const AKSES_CEPAT: AksesCepat[] = [
  { untuk: "Calon siswa", tautan: [{ href: "/spmb", label: "Info SPMB" }, { href: "/kontak", label: "Tanya panitia" }] },
  { untuk: "Orang tua", tautan: [{ href: "/portal-digital/masuk/orang-tua", label: "Portal Orang Tua" }, { href: "/agenda", label: "Kalender" }] },
  {
    untuk: "Siswa",
    tautan: [
      { href: E_LEARNING_BAWAAN, label: "E-Learning" },
      { href: "/perpustakaan", label: "E-Library" },
      { href: "/portal-digital/masuk/siswa", label: "Portal Siswa" },
    ],
  },
  {
    untuk: "Guru & Tendik",
    tautan: [
      { href: "/portal-digital/masuk/gtk", label: "Pojok Guru" },
      { href: "/portal-digital#judul-manajemen", label: "Ruang kerja manajemen" },
    ],
  },
];

/** Ganti tujuan E-Learning bawaan dengan URL dari CMS di seluruh struktur (anak, sorotan, ajakan, tautan). */
export function denganELearning<T extends { anak?: Tautan[]; tautan?: Tautan[]; sorotan?: KartuSorotan[]; ajakan?: Tautan }>(daftar: T[], eLearning: string): T[] {
  if (eLearning === E_LEARNING_BAWAAN) return daftar;
  const ganti = <U extends { href: string }>(t: U): U => (t.href === E_LEARNING_BAWAAN ? { ...t, href: eLearning } : t);
  return daftar.map((d) => ({
    ...d,
    ...(d.anak ? { anak: d.anak.map(ganti) } : {}),
    ...(d.tautan ? { tautan: d.tautan.map(ganti) } : {}),
    ...(d.sorotan ? { sorotan: d.sorotan.map(ganti) } : {}),
    ...(d.ajakan ? { ajakan: ganti(d.ajakan) } : {}),
  }));
}
export const denganELearningTautan = (daftar: Tautan[], eLearning: string) => (eLearning === E_LEARNING_BAWAAN ? daftar : daftar.map((t) => (t.href === E_LEARNING_BAWAAN ? { ...t, href: eLearning } : t)));

/** Isi CMS menu (semua opsional; kosong = teks bawaan). */
export type MenuCms = {
  grup: Partial<Record<KunciGrup, { pengantar?: string; ajakan?: string }>>;
  /** keterangan tautan per href, per grup */
  keterangan: Partial<Record<KunciGrup, Record<string, string>>>;
  /** kartu sorotan dari CMS (urut); bila ada, menggantikan sorotan bawaan grup itu */
  sorotan: Partial<Record<KunciGrup, KartuSorotan[]>>;
};

/** Timpa teks bawaan dengan isi CMS yang terisi. Label & tujuan tautan tidak pernah diubah. */
export function gabungMenuCms(grup: GrupLangit[], cms: MenuCms): GrupLangit[] {
  return grup.map((g) => {
    const c = cms.grup[g.kunci];
    const ket = cms.keterangan[g.kunci] ?? {};
    const sor = (cms.sorotan[g.kunci] ?? []).slice(0, 3);
    return {
      ...g,
      keterangan: c?.pengantar?.trim() || g.keterangan,
      ajakan: c?.ajakan?.trim() ? { ...g.ajakan, label: c.ajakan.trim() } : g.ajakan,
      anak: g.anak.map((a) => (ket[a.href]?.trim() ? { ...a, keterangan: ket[a.href].trim() } : a)),
      sorotan: g.jenis === "foto" && sor.length ? sor : g.sorotan,
    };
  });
}
