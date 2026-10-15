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

/**
 * Menu "Layanan" di header publik: pintu masuk layanan digital (bukan daftar modul internal).
 * Semua tujuan adalah rute yang memang ada; pilihan peran di halaman masuk tidak memberi izin apa pun.
 */
export const layanan = [
  { href: "/admin/login?sebagai=siswa", label: "Portal Sekolah", teks: "Siswa & orang tua: jadwal, tugas, kehadiran, izin." },
  { href: "/admin/login?sebagai=staf", label: "Portal Manajemen", teks: "Guru, tendik & manajemen: ruang kerja sesuai tugas." },
  { href: "/perpustakaan", label: "E-Library", teks: "Katalog buku, ketersediaan, dan koleksi digital." },
  { href: "/pengaduan", label: "Pengaduan", teks: "Saran & laporan, pantau dengan nomor tiket." },
];
