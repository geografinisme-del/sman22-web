/**
 * Kartu putar beranda bawaan — sama dengan isi awal migrasi 20261220000000_kartu_beranda.sql.
 * Dipakai bila tabel kartu_beranda belum ada/kosong (mis. sebelum migrasi dijalankan), supaya beranda tetap utuh.
 * Foto /images/* = foto asli sekolah; /media/placeholder/* = foto stok (lihat CREDITS.md) → sementara: true.
 */
export type KartuBeranda = { id: string; label: string; judul: string; deskripsi: string; foto: string; sementara: boolean; url: string };

export const KARTU_BAWAAN: KartuBeranda[] = [
  { id: "k1", label: "Profil", judul: "Mengenal SMAN 22", deskripsi: "Identitas, visi-misi, dan sejarah sekolah.", foto: "/images/gedung.jpg", sementara: false, url: "/profil" },
  { id: "k2", label: "Pembelajaran", judul: "Program dan karakter", deskripsi: "7KAIH, Gerbang Pancawaluya, dan kokurikuler tematik.", foto: "/images/apel-lapangan.jpg", sementara: false, url: "/program" },
  { id: "k3", label: "Pembelajaran", judul: "E-Learning", deskripsi: "Kelas digital, materi, dan tugas daring.", foto: "/media/placeholder/galeri-3.webp", sementara: true, url: "/pembelajaran/e-learning" },
  { id: "k4", label: "Kehidupan Siswa", judul: "Ekskul dan OSIS", deskripsi: "Wadah minat, bakat, dan kepemimpinan siswa.", foto: "/images/keluarga-besar.jpg", sementara: false, url: "/ekskul" },
  { id: "k5", label: "Kehidupan Siswa", judul: "Prestasi", deskripsi: "Kabar capaian siswa dari berbagai lomba.", foto: "/media/placeholder/berita-1.webp", sementara: true, url: "/berita?kategori=Prestasi" },
  { id: "k6", label: "Kehidupan Siswa", judul: "Galeri kegiatan", deskripsi: "Dokumentasi kegiatan siswa dan sekolah.", foto: "/images/kegiatan-aula.jpg", sementara: false, url: "/galeri" },
  { id: "k7", label: "Kabar & Agenda", judul: "Berita dan pengumuman", deskripsi: "Kabar terbaru dan informasi resmi sekolah.", foto: "/images/upacara-pagi.jpg", sementara: false, url: "/berita" },
  { id: "k8", label: "Kabar & Agenda", judul: "Agenda sekolah", deskripsi: "Kegiatan dan tanggal penting sekolah.", foto: "/images/kajian-masjid.jpg", sementara: false, url: "/agenda" },
  { id: "k9", label: "SPMB", judul: "Penerimaan murid baru", deskripsi: "Jalur, persyaratan, dan jadwal resmi.", foto: "/media/placeholder/berita-2.webp", sementara: true, url: "/spmb" },
  { id: "k10", label: "Layanan", judul: "Portal Digital 22", deskripsi: "Pintu masuk guru, siswa, orang tua, dan manajemen.", foto: "/media/placeholder/galeri-1.webp", sementara: true, url: "/portal-digital" },
  { id: "k11", label: "Layanan", judul: "E-Library", deskripsi: "Cari buku dan cek ketersediaannya.", foto: "/media/placeholder/berita-4.webp", sementara: true, url: "/perpustakaan" },
  { id: "k12", label: "Layanan", judul: "Pengaduan dan aspirasi", deskripsi: "Sampaikan saran atau laporan, pantau dengan nomor tiket.", foto: "/media/placeholder/galeri-5.webp", sementara: true, url: "/pengaduan" },
];
