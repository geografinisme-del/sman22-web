/**
 * Ruang kerja manajemen = pintu masuk ke kelompok menu sesuai tugas.
 * Ruang kerja DITURUNKAN dari izin yang sudah dihitung database (akses_saya) dan TIDAK menambah
 * kewenangan apa pun: berpindah ruang kerja hanya berpindah halaman; setiap halaman & data tetap
 * dijaga izinnya sendiri di server (wajibIzin/punya) dan RLS.
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */
import type { Izin } from "./admin/auth";

export type RuangKerja = {
  kunci: string;
  label: string;
  /** halaman awal ruang kerja (rute yang benar-benar ada) */
  href: string;
  /** awalan rute yang dianggap bagian ruang kerja ini (untuk menandai yang aktif) */
  awalan: string[];
  /** cukup salah satu izin kelola ini (izin "lihat" saja tidak menjadikan seseorang petugas ruang kerja) */
  izin: Izin[];
  keterangan: string;
};

export const RUANG_KERJA: RuangKerja[] = [
  { kunci: "kurikulum", label: "Kurikulum", href: "/admin/kurikulum", awalan: ["/admin/kurikulum", "/admin/jadwal", "/admin/perangkat-ajar", "/admin/supervisi", "/admin/kokurikuler"], izin: ["kurikulum.kelola", "jadwal.kelola", "supervisi.kelola"], keterangan: "Struktur kurikulum, jadwal, perangkat ajar, supervisi." },
  { kunci: "kesiswaan", label: "Kesiswaan", href: "/admin/kesiswaan", awalan: ["/admin/kesiswaan", "/admin/absensi/disiplin", "/admin/ekskul"], izin: ["kesiswaan.kelola", "disiplin.kelola", "ekskul.kelola"], keterangan: "Prestasi, poin, disiplin, ekskul & OSIS." },
  { kunci: "sarpras", label: "Sarpras", href: "/admin/sarpras", awalan: ["/admin/sarpras"], izin: ["sarpras.kelola"], keterangan: "Inventaris, peminjaman ruang/barang, laporan kerusakan." },
  { kunci: "humas", label: "Humas", href: "/admin/humas", awalan: ["/admin/humas", "/admin/pengaduan", "/admin/kemitraan", "/admin/survei", "/admin/kontak-media", "/admin/buku-tamu"], izin: ["humas.kelola", "pengaduan.kelola"], keterangan: "Pengaduan, kemitraan, survei, kontak media." },
  { kunci: "website", label: "Website", href: "/admin/berita", awalan: ["/admin/berita", "/admin/pengumuman", "/admin/agenda", "/admin/galeri", "/admin/kartu-beranda", "/admin/tur-sekolah", "/admin/staf-publik", "/admin/fasilitas", "/admin/halaman", "/admin/prestasi", "/admin/spmb", "/admin/portal-bidang", "/admin/profil", "/admin/persetujuan", "/admin/situs", "/admin/tampilan"], izin: ["konten.kelola", "konten.terbitkan"], keterangan: "Berita, pengumuman, agenda, galeri, tampilan website." },
  { kunci: "tata_usaha", label: "Tata Usaha", href: "/admin/siswa", awalan: ["/admin/siswa", "/admin/pegawai", "/admin/kelas", "/admin/tahun-ajaran", "/admin/akun-portal"], izin: ["data_induk.kelola", "akun_portal.kelola"], keterangan: "Data induk siswa, pegawai, kelas, akun portal." },
  { kunci: "tpmps", label: "Penjaminan Mutu (TPMPS)", href: "/admin/mutu", awalan: ["/admin/mutu"], izin: ["mutu.kelola", "mutu.audit"], keterangan: "Indikator mutu, temuan & perbaikan, repositori bukti." },
  { kunci: "perpustakaan", label: "Perpustakaan", href: "/admin/perpus", awalan: ["/admin/perpus"], izin: ["perpus.kelola", "literasi.kelola"], keterangan: "Sirkulasi, katalog, literasi, pojok baca." },
  { kunci: "bk", label: "Bimbingan Konseling", href: "/admin/bk", awalan: ["/admin/bk"], izin: ["bk.konseling"], keterangan: "Layanan & kasus BK (kerahasiaan dijaga)." },
];

/** Peran pimpinan selalu mulai dari Ringkasan (gambaran seluruh sekolah). */
const PERAN_PIMPINAN = ["super_admin", "kepala_sekolah", "wakasek"];

type AksesMinimal = { peran: string[]; izin: readonly string[] };

/** Ruang kerja yang boleh dibuka pengguna ini (urutan tetap). */
export function ruangKerjaUntuk(akses: AksesMinimal | null): RuangKerja[] {
  if (!akses) return [];
  return RUANG_KERJA.filter((r) => r.izin.some((i) => akses.izin.includes(i)));
}

/**
 * Tujuan setelah masuk:
 * - pimpinan → Ringkasan;
 * - tepat satu ruang kerja → langsung ke ruang kerja itu;
 * - beberapa ruang kerja → Ringkasan (dengan pemilih ruang kerja di sidebar);
 * - guru tanpa ruang kerja khusus → Ringkasan.
 */
export function tujuanAwal(akses: AksesMinimal | null): string {
  if (!akses) return "/admin";
  if (akses.peran.some((p) => PERAN_PIMPINAN.includes(p))) return "/admin";
  const r = ruangKerjaUntuk(akses);
  return r.length === 1 ? r[0].href : "/admin";
}

/** Ruang kerja yang sedang dibuka berdasarkan alamat halaman (null = Ringkasan/umum). */
export function ruangKerjaAktif(path: string, daftar: RuangKerja[]): RuangKerja | null {
  let terbaik: { r: RuangKerja; panjang: number } | null = null;
  for (const r of daftar)
    for (const a of r.awalan)
      if ((path === a || path.startsWith(a + "/")) && (!terbaik || a.length > terbaik.panjang)) terbaik = { r, panjang: a.length };
  return terbaik?.r ?? null;
}
