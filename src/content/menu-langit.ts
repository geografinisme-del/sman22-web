/**
 * Struktur navigasi "Langit cerah": header (pil tengah), menu layar penuh, dan footer memakai data yang sama.
 * Tautan yang halamannya baru dibuat di Tahap C sementara diarahkan ke halaman terdekat yang sudah ada
 * (keputusan pemilik, 20 Okt 2026) — ditandai `// sementara` dan diganti saat halamannya tersedia.
 * E-Learning: URL dari CMS (`tautanELearning`), bawaan /pembelajaran/e-learning. Modul murni (bisa diuji).
 */
import { E_LEARNING_BAWAAN } from "./menu.ts";

export type Tautan = { href: string; label: string };
export type GrupLangit = {
  kunci: "profil" | "pembelajaran" | "kehidupan" | "kabar" | "layanan";
  label: string;
  /** label ringkas di pil header */
  pendek: string;
  keterangan: string;
  /** foto pratinjau menu layar penuh (foto asli sekolah) */
  foto: { src: string; alt: string };
  anak: Tautan[];
};

export const GRUP_LANGIT: GrupLangit[] = [
  {
    kunci: "profil",
    label: "Profil",
    pendek: "Profil",
    keterangan: "Mengenal SMA Negeri 22 Bandung: kepemimpinan, arah, dan perjalanan sekolah.",
    foto: { src: "/images/gedung.jpg", alt: "Gedung utama SMA Negeri 22 Bandung" },
    anak: [
      { href: "/sambutan", label: "Sambutan kepala sekolah" },
      { href: "/profil#visi-misi", label: "Visi dan misi" }, // sementara
      { href: "/profil#sejarah", label: "Sejarah" }, // sementara
      { href: "/profil", label: "Guru dan staf" }, // sementara (Tahap C: tabel CMS staf_publik)
      { href: "/galeri", label: "Fasilitas" }, // sementara
    ],
  },
  {
    kunci: "pembelajaran",
    label: "Pembelajaran",
    pendek: "Pembelajaran",
    keterangan: "Program karakter, kurikulum, dan kelas digital.",
    foto: { src: "/images/apel-lapangan.jpg", alt: "Siswa mengikuti apel di lapangan sekolah" },
    anak: [
      { href: "/program", label: "Program dan karakter" },
      { href: E_LEARNING_BAWAAN, label: "E-Learning" },
      { href: "/agenda", label: "Kalender akademik" }, // sementara
      { href: "/program", label: "Kurikulum" }, // sementara
    ],
  },
  {
    kunci: "kehidupan",
    label: "Kehidupan Siswa",
    pendek: "Kehidupan Siswa",
    keterangan: "Prestasi, organisasi siswa, dan dokumentasi kegiatan.",
    foto: { src: "/images/keluarga-besar.jpg", alt: "Keluarga besar SMA Negeri 22 Bandung di halaman sekolah" },
    anak: [
      { href: "/berita?kategori=Prestasi", label: "Prestasi" }, // sementara
      { href: "/ekskul", label: "Ekskul dan OSIS" },
      { href: "/galeri", label: "Galeri kegiatan" },
    ],
  },
  {
    kunci: "kabar",
    label: "Kabar & Agenda",
    pendek: "Kabar",
    keterangan: "Berita, pengumuman resmi, dan kalender kegiatan sekolah.",
    foto: { src: "/images/upacara-pagi.jpg", alt: "Upacara pagi di lapangan sekolah" },
    anak: [
      { href: "/berita", label: "Berita" },
      { href: "/agenda#judul-pengumuman", label: "Pengumuman" }, // sementara
      { href: "/agenda", label: "Agenda dan kalender" },
    ],
  },
  {
    kunci: "layanan",
    label: "Layanan",
    pendek: "Layanan",
    keterangan: "Layanan publik sekolah. Portal Digital 22 ada di tombol kanan atas.",
    foto: { src: "/images/kegiatan-aula.jpg", alt: "Kegiatan siswa di aula sekolah" },
    anak: [
      { href: "/perpustakaan", label: "E-Library" },
      { href: "/pengaduan", label: "Pengaduan dan aspirasi" },
      { href: "/sertifikat", label: "Verifikasi sertifikat" },
      { href: "/survei", label: "Survei layanan" },
    ],
  },
];

/** Grup yang tampil sebagai pil di header (urutan sesuai brief). */
export const PIL_HEADER: GrupLangit["kunci"][] = ["profil", "pembelajaran", "kabar", "layanan"];

export type AksesCepat = { untuk: string; tautan: Tautan[] };
export const AKSES_CEPAT: AksesCepat[] = [
  { untuk: "Calon siswa", tautan: [{ href: "/spmb", label: "Info SPMB" }, { href: "/kontak", label: "Tanya panitia" }] },
  { untuk: "Orang tua", tautan: [{ href: "/portal-digital/buka/ortu", label: "Portal Orang Tua" }, { href: "/agenda", label: "Kalender" }] },
  {
    untuk: "Siswa",
    tautan: [
      { href: E_LEARNING_BAWAAN, label: "E-Learning" },
      { href: "/perpustakaan", label: "E-Library" },
      { href: "/portal-digital/buka/siswa", label: "Portal Siswa" },
    ],
  },
  {
    untuk: "Guru dan staf",
    tautan: [
      { href: "/portal-digital/buka/guru", label: "Pojok Guru" },
      { href: "/portal-digital#judul-manajemen", label: "Ruang kerja manajemen" },
    ],
  },
];

/** Ganti tujuan E-Learning bawaan dengan URL dari CMS di seluruh struktur. */
export function denganELearning<T extends { anak?: Tautan[]; tautan?: Tautan[] }>(daftar: T[], eLearning: string): T[] {
  if (eLearning === E_LEARNING_BAWAAN) return daftar;
  const ganti = (t: Tautan) => (t.href === E_LEARNING_BAWAAN ? { ...t, href: eLearning } : t);
  return daftar.map((d) => ({ ...d, ...(d.anak ? { anak: d.anak.map(ganti) } : {}), ...(d.tautan ? { tautan: d.tautan.map(ganti) } : {}) }));
}
