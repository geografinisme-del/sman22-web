/**
 * Rincian program unggulan yang ditampilkan di beranda & halaman program.
 * Foto hanya dipasangkan bila isi fotonya memang sesuai programnya (keterangan menyebut apa yang terlihat).
 */

/** Tujuh kebiasaan dalam program 7 Kebiasaan Anak Indonesia Hebat */
export const KEBIASAAN_7KAIH = ["Bangun pagi", "Beribadah", "Berolahraga", "Makan sehat dan bergizi", "Gemar belajar", "Bermasyarakat", "Tidur cepat"];

/** Nilai Gerbang Pancawaluya (pendidikan karakter Jawa Barat) */
export const PANCAWALUYA = [
  { nilai: "Cageur", arti: "Sehat jasmani dan rohani." },
  { nilai: "Bageur", arti: "Berperilaku baik dan peduli sesama." },
  { nilai: "Bener", arti: "Jujur, lurus, dan bertanggung jawab." },
  { nilai: "Pinter", arti: "Cerdas dan terus belajar." },
  { nilai: "Singer", arti: "Kreatif, terampil, dan cekatan." },
];

/** Foto asli sekolah per kode program (tanpa foto bila belum ada yang sesuai) */
export const FOTO_PROGRAM: Record<string, { src: string; alt: string; keterangan: string }> = {
  "7KAIH": { src: "/images/kajian-masjid.jpg", alt: "Siswa mengikuti kajian bersama di masjid sekolah", keterangan: "Kajian bersama di masjid sekolah" },
  KT: { src: "/images/kegiatan-aula.jpg", alt: "Siswa mengikuti kegiatan di aula sekolah", keterangan: "Kegiatan siswa di aula sekolah" },
};
