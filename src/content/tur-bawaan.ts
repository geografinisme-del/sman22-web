/**
 * Titik tur sekolah bawaan — sama dengan isi awal migrasi 20261221000000_tur_sekolah.sql.
 * Dipakai HANYA bila tabel tur_sekolah belum ada (mis. sebelum migrasi). Bila tabel ada tetapi tidak ada titik
 * aktif, section tur disembunyikan.
 */
export type TitikTur = {
  id: string;
  label: string;
  judul: string;
  deskripsi: string;
  tombol?: { teks: string; url: string };
  media: { tipe: "foto" | "video"; url: string; poster?: string } | null;
  fokus: { x: number; y: number };
  alt: string;
  sementara: boolean;
};

export const TUR_BAWAAN: TitikTur[] = [
  { id: "t1", label: "Selamat datang", judul: "Selamat datang di SMAN 22", deskripsi: "Mulai dari halaman sekolah, tempat warga sekolah berkumpul.", media: { tipe: "foto", url: "/images/keluarga-besar.jpg" }, fokus: { x: 50, y: 55 }, alt: "Warga sekolah berkumpul di halaman SMA Negeri 22 Bandung", sementara: true },
  { id: "t2", label: "Gerbang & lapangan", judul: "Gerbang dan lapangan", deskripsi: "Lapangan tempat apel dan upacara pagi.", media: { tipe: "foto", url: "/images/apel-lapangan.jpg" }, fokus: { x: 50, y: 45 }, alt: "Siswa mengikuti apel di lapangan sekolah", sementara: true },
  { id: "t3", label: "Gedung utama", judul: "Gedung utama", deskripsi: "Gedung utama sekolah di bagian depan kompleks.", media: { tipe: "foto", url: "/images/gedung.jpg" }, fokus: { x: 50, y: 50 }, alt: "Gedung utama SMA Negeri 22 Bandung", sementara: true },
  { id: "t4", label: "Masjid sekolah", judul: "Masjid sekolah", deskripsi: "Tempat ibadah dan kegiatan keagamaan warga sekolah.", media: { tipe: "foto", url: "/images/kajian-masjid.jpg" }, fokus: { x: 50, y: 45 }, alt: "Kegiatan kajian di masjid sekolah", sementara: true },
  { id: "t5", label: "Aula", judul: "Aula", deskripsi: "Ruang pertemuan untuk kegiatan bersama.", media: { tipe: "foto", url: "/images/kegiatan-aula.jpg" }, fokus: { x: 50, y: 40 }, alt: "Kegiatan siswa di aula sekolah", sementara: true },
  { id: "t6", label: "Perpustakaan", judul: "Perpustakaan", deskripsi: "Ruang baca dan layanan E-Library sekolah.", tombol: { teks: "Buka E-Library", url: "/perpustakaan" }, media: null, fokus: { x: 50, y: 50 }, alt: "", sementara: true },
];
