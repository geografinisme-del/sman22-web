/**
 * ============================================================
 *  ISI WEBSITE ADA DI FILE INI
 * ============================================================
 *  CATATAN: Setelah Supabase disambungkan (lihat PANDUAN-CMS.md),
 *  profil, berita, agenda, pengumuman, dan galeri diubah lewat
 *  halaman /admin — bukan di file ini lagi. File ini tetap dipakai
 *  untuk: nama & logo sekolah, media sosial, foto hero, program
 *  unggulan, tautan layanan, dan info SPMB.
 *
 *  Tanpa Supabase, seluruh isi website diambil dari file ini.
 *
 *  - Teks bertanda "[ISI ...]" wajib diganti dengan data asli.
 *    (Di beranda, angka statistik "[ISI]" otomatis disembunyikan.)
 *  - Berita/agenda/pengumuman bertanda "Contoh" boleh dihapus
 *    atau diganti dengan yang asli.
 *  - Foto: simpan di folder public/images/ lalu tulis
 *    gambar: "/images/nama-file.jpg"
 *
 *  Pada tahap berikutnya (Modul 02 CMS + Supabase), isi ini
 *  akan dipindah ke database dan bisa diubah lewat halaman admin.
 * ============================================================
 */

export const sekolah = {
  nama: "SMA Negeri 22 Bandung",
  namaPendek: "SMAN 22 Bandung",
  tahunBerdiri: 1989,
  slogan: "[ISI slogan/moto sekolah]",
  deskripsi:
    "Website resmi SMA Negeri 22 Bandung — informasi profil, berita, agenda, pengumuman, dan layanan sekolah.",
  alamat: "[ISI alamat lengkap sekolah]",
  kota: "Kota Bandung, Jawa Barat",
  telepon: "[ISI nomor telepon]",
  email: "[ISI email sekolah]",
  jamLayanan: "Senin–Jumat, 07.00–15.00 WIB",
  npsn: "[ISI NPSN]",
  akreditasi: "[ISI akreditasi]",
  kepalaSekolah: "Evi Vironita, S.Pd.",
  fotoKepalaSekolah: "/images/kepala-sekolah.jpg",
  logo: "/images/logo.png",
  mapsQuery: "SMA Negeri 22 Bandung",
  sosialMedia: [
    { nama: "Instagram", akun: "@sman22bdg", url: "https://www.instagram.com/sman22bdg" },
    { nama: "X / Twitter", akun: "@sman22bandung", url: "https://x.com/sman22bandung" },
    { nama: "YouTube", akun: "", url: "" },
  ],
  /** Ganti dengan alamat website setelah online, mis. https://sman22-web.vercel.app */
  urlSitus: "https://sman22-web.vercel.app",
};

export const statistik = [
  { label: "Tahun berdiri", nilai: "1989" },
  { label: "Peserta didik", nilai: "[ISI]" },
  { label: "Guru & tendik", nilai: "[ISI]" },
  { label: "Ekstrakurikuler", nilai: "[ISI]" },
];

/** Bagian pembuka beranda. Foto berganti pelan setiap 7 detik. */
export const hero = {
  label: `Sejak ${sekolah.tahunBerdiri} · Kota Bandung`,
  judulAwal: "Tumbuh berkarakter,",
  judulMiring: "bersinar",
  judulAkhir: "bersama.",
  teks: "Ruang belajar yang hangat untuk menumbuhkan iman, ilmu, dan kepedulian generasi muda Bandung.",
  tombolUtama: { label: "Kenali sekolah kami", href: "/profil" },
  tombolKedua: { label: "Informasi SPMB", href: "/spmb" },
  foto: [
    { src: "/images/gedung.jpg", alt: "Gedung SMA Negeri 22 Bandung", posisi: "center 60%" },
    { src: "/images/keluarga-besar.jpg", alt: "Guru dan siswa SMA Negeri 22 Bandung di lapangan sekolah", posisi: "center 55%" },
    { src: "/images/apel-lapangan.jpg", alt: "Apel pagi siswa di lapangan sekolah", posisi: "center 60%" },
  ],
};

/** Kalimat besar di bawah hero */
export const pernyataan =
  "Sejak 1989, SMA Negeri 22 Bandung menjadi rumah belajar bagi ribuan siswa — tempat karakter ditempa, prestasi dirayakan, dan persahabatan tumbuh.";

export const sambutan = {
  judul: "Sambutan Kepala Sekolah",
  kutipan: "[ISI satu kalimat kutipan kepala sekolah]",
  paragraf: [
    "[ISI sambutan kepala sekolah — paragraf 1]",
    "[ISI sambutan kepala sekolah — paragraf 2]",
  ],
};

export const visi = "[ISI visi sekolah]";
export const misi = ["[ISI misi 1]", "[ISI misi 2]", "[ISI misi 3]"];
export const sejarah = ["[ISI sejarah singkat sekolah]"];

export const programUnggulan = [
  {
    nama: "7 Kebiasaan Anak Indonesia Hebat",
    ringkas: "Pembiasaan karakter harian melalui jurnal, bukti kegiatan, dan refleksi.",
  },
  {
    nama: "Gerbang Pancawaluya",
    ringkas: "Penguatan nilai Cageur, Bageur, Bener, Pinter, Singer dalam kegiatan sekolah.",
  },
  {
    nama: "Kokurikuler Tematik",
    ringkas: "Proyek lintas mapel yang menghasilkan karya, refleksi, dan pameran.",
  },
  {
    nama: "Pojok Baca & Literasi",
    ringkas: "Gerakan membaca, jurnal baca, dan tantangan literasi.",
  },
  {
    nama: "Mitigasi Bencana",
    ringkas: "Simulasi, jalur evakuasi, dan tim siaga untuk sekolah yang aman.",
  },
];

export type Berita = {
  slug: string;
  judul: string;
  tanggal: string; // format YYYY-MM-DD
  kategori: string;
  ringkasan: string;
  isi: string[];
  gambar?: string;
};

export const berita: Berita[] = [
  {
    slug: "contoh-berita-kegiatan",
    judul: "Contoh: Judul berita kegiatan sekolah",
    tanggal: "2026-10-01",
    kategori: "Kegiatan",
    ringkasan: "Ini contoh ringkasan berita. Ganti dengan berita asli sekolah.",
    isi: [
      "Ini contoh isi berita. Setiap paragraf ditulis sebagai satu baris teks di dalam tanda kutip.",
      "Hapus contoh ini dan tambahkan berita asli dengan pola yang sama.",
    ],
    gambar: "/images/kegiatan-aula.jpg",
  },
  {
    slug: "contoh-berita-prestasi",
    judul: "Contoh: Siswa meraih prestasi tingkat kota",
    tanggal: "2026-09-20",
    kategori: "Prestasi",
    ringkasan: "Contoh ringkasan berita prestasi siswa.",
    isi: ["Contoh isi berita prestasi. Ganti dengan berita asli."],
    gambar: "/images/keluarga-besar.jpg",
  },
  {
    slug: "contoh-berita-kajian",
    judul: "Contoh: Kajian bersama di masjid sekolah",
    tanggal: "2026-09-10",
    kategori: "Keagamaan",
    ringkasan: "Contoh ringkasan berita kegiatan keagamaan.",
    isi: ["Contoh isi berita. Ganti dengan berita asli."],
    gambar: "/images/kajian-masjid.jpg",
  },
];

export type Agenda = { judul: string; tanggal: string; waktu?: string; tempat?: string };

export const agenda: Agenda[] = [
  { judul: "Contoh: Rapat orang tua kelas X", tanggal: "2026-10-15", waktu: "08.00 WIB", tempat: "Aula" },
  { judul: "Contoh: Penilaian Tengah Semester", tanggal: "2026-10-20" },
  { judul: "Contoh: Simulasi mitigasi bencana", tanggal: "2026-11-05", waktu: "09.00 WIB", tempat: "Lapangan" },
];

export type Pengumuman = { judul: string; tanggal: string; isi: string; penting?: boolean };

export const pengumuman: Pengumuman[] = [
  {
    judul: "Website sekolah versi uji coba",
    tanggal: "2026-10-05",
    isi: "Fitur lain akan ditambahkan bertahap.",
    penting: true,
  },
];

export type FotoGaleri = { judul: string; gambar?: string };

export const galeri: FotoGaleri[] = [
  { judul: "Gedung utama SMA Negeri 22 Bandung", gambar: "/images/gedung.jpg" },
  { judul: "Kajian bersama di masjid sekolah", gambar: "/images/kajian-masjid.jpg" },
  { judul: "Kegiatan siswa di aula", gambar: "/images/kegiatan-aula.jpg" },
  { judul: "Apel pagi di lapangan", gambar: "/images/apel-lapangan.jpg" },
  { judul: "Keluarga besar SMA Negeri 22 Bandung", gambar: "/images/keluarga-besar.jpg" },
  { judul: "Upacara bendera", gambar: "/images/upacara-pagi.jpg" },
];

/** Foto untuk bagian "Kehidupan di sekolah" di beranda (4 foto, susunan majalah). */
export const kehidupanSekolah = [
  { judul: "Kajian bersama", keterangan: "Masjid sekolah", gambar: "/images/kajian-masjid.jpg" },
  { judul: "Belajar & berdiskusi", keterangan: "Aula", gambar: "/images/kegiatan-aula.jpg" },
  { judul: "Disiplin setiap pagi", keterangan: "Lapangan upacara", gambar: "/images/apel-lapangan.jpg" },
  { judul: "Satu keluarga besar", keterangan: "Guru, tendik & siswa", gambar: "/images/keluarga-besar.jpg" },
];

/** Tautan layanan. Kosongkan url jika belum tersedia (akan tampil "Segera hadir"). */
export const layanan = [
  { nama: "Absensi Digital", keterangan: "Kehadiran siswa harian", url: "" },
  { nama: "Informasi SPMB", keterangan: "Penerimaan murid baru", url: "/spmb" },
  { nama: "E-Learning", keterangan: "Kelas digital", url: "" },
  { nama: "Pengaduan", keterangan: "Saran & pengaduan masyarakat", url: "/kontak" },
];

export const spmb = {
  tahun: "2027/2028",
  catatan:
    "Ketentuan resmi SPMB mengikuti pengumuman Dinas Pendidikan Provinsi Jawa Barat. Halaman ini akan diperbarui saat jadwal resmi terbit.",
  jalur: ["[ISI jalur 1]", "[ISI jalur 2]", "[ISI jalur 3]"],
  persyaratan: ["[ISI persyaratan 1]", "[ISI persyaratan 2]"],
  tautanResmi: "",
};
