// Spesifikasi docs/matriks-layanan.md (disetujui 30 Okt 2026): menu tiap peran harus PERSIS seperti di bawah.
import { test } from "node:test";
import assert from "node:assert/strict";
import { kartuUntuk, menuUntuk } from "./menu-peran.ts";

const AKUN = ["Profil Saya", "Direktori GTK", "Keamanan Akun"];
const LAY_TENDIK = ["Presensi Saya", "Kalender Sekolah", "Lapor Kerusakan", "Peminjaman Ruang/Barang", "Pinjaman Perpustakaan Saya"];
const LAY_PENDIDIK = ["Presensi Saya", "Jadwal Saya", "Tukar Jam", "Kalender Sekolah", "Lapor Kerusakan", "Peminjaman Ruang/Barang", "Pinjaman Perpustakaan Saya", "Rujukan BK Saya", "Lapor Pelanggaran/Prestasi"];
const MENGAJAR = ["Jadwal Pelajaran", "Presensi & Jurnal per Jam", "Perangkat Ajar", "Materi & Papan Interaktif", "Kelas Digital (Tugas & Kuis)", "Struktur Kurikulum", "CP, TP & ATP", "Projek Kokurikuler", "Supervisi Saya"];
const tanpa = (daftar: string[], ...buang: string[]) => daftar.filter((x) => !buang.includes(x));
const DATA_INDUK = ["Siswa", "Guru & Pegawai", "Kelas", "Tahun Ajaran"];
const MUTU = ["Mutu & Akreditasi", "Temuan & Perbaikan", "Repositori Bukti"];
const HUMAS = ["Dasbor Humas", "Pengaduan", "Kemitraan & MoU", "Survei", "Kontak Media"];
const WEBSITE = ["Profil Sekolah", "Berita", "Pengumuman", "Agenda", "Galeri", "Kartu Beranda", "Guru & Tendik (publik)", "Menu navigasi", "Halaman masuk portal", "Fasilitas", "Halaman teks", "Tur Sekolah", "Foto sementara", "Prestasi & Alumni", "SPMB Beranda", "Penanggung Jawab Portal", "Tampilan Website", "Tema & Tampilan"];
const pendidikDasar = (bidang: Record<string, string[]>, layanan = LAY_PENDIDIK, mengajar = MENGAJAR) => ({ ...bidang, "Layanan saya": layanan, Mengajar: mengajar, "Akun saya": AKUN });
const tendikDasar = (bidang: Record<string, string[]>, layanan = LAY_TENDIK) => ({ ...bidang, "Layanan saya": layanan, "Akun saya": AKUN });

const MATRIKS: Record<string, Record<string, string[]>> = {
  guru: pendidikDasar({}),
  wali_kelas: pendidikDasar({ Perwalian: ["Kelas Saya", "Absensi Kelas", "Izin dari Orang Tua", "Pengajuan Koreksi", "Rekap Absensi Kelas", "SP & Panggilan Kelas", "Prestasi & Poin Kelas"] }),
  piket: pendidikDasar({ Piket: ["Absensi Harian & Terlambat", "Pengajuan Koreksi", "Izin dari Orang Tua", "Buku Tamu", "Guru Pengganti"] }),
  bk: pendidikDasar(
    {
      "Bimbingan Konseling": ["Layanan & Kasus BK", "Laporan BK (agregat)", "Log Akses BK"],
      Kesiswaan: ["Prestasi & Poin", "Rujukan BK"],
      Absensi: ["Rekap Absensi", "SP & Panggilan Ortu"],
      Pengaduan: ["Pengaduan Rahasia & Ditugaskan"],
      "Data Induk": DATA_INDUK,
      Alumni: ["Alumni & Tracer"],
    },
    tanpa(LAY_PENDIDIK, "Rujukan BK Saya"),
  ),
  waka_kurikulum: pendidikDasar(
    {
      Kurikulum: ["Struktur Kurikulum", "CP, TP & ATP", "Periksa Perangkat", "Projek Kokurikuler", "Supervisi Akademik"],
      Jadwal: ["Jadwal Pelajaran", "Guru Pengganti", "Persetujuan Tukar Jam", "Riwayat Jadwal"],
      "Data Induk": DATA_INDUK,
      Mutu: MUTU,
      Perpustakaan: ["Katalog Buku", "Laporan & Denda"],
    },
    LAY_PENDIDIK,
    ["Presensi & Jurnal per Jam", "Perangkat Ajar", "Materi & Papan Interaktif", "Kelas Digital (Tugas & Kuis)"],
  ),
  waka_kesiswaan: pendidikDasar({
    Kesiswaan: ["Prestasi & Poin", "Aturan Poin"],
    Absensi: ["Absensi Siswa", "Pengajuan Koreksi", "Izin dari Orang Tua", "Rekap Absensi", "SP & Panggilan Ortu", "Pengaturan Absensi"],
    "Ekskul & OSIS": ["Organisasi Siswa", "Pengajuan Kegiatan"],
    Pengaduan: ["Pengaduan Rahasia & Ditugaskan"],
    "Data Induk": DATA_INDUK,
  }),
  waka_sarpras: pendidikDasar({ Sarpras: ["Inventaris", "Peminjaman Ruang/Barang", "Laporan Kerusakan"] }, tanpa(LAY_PENDIDIK, "Lapor Kerusakan", "Peminjaman Ruang/Barang")),
  waka_humas: pendidikDasar({ Humas: [...HUMAS, "Buku Tamu"], Website: WEBSITE, Alumni: ["Alumni & Tracer", "Layanan Alumni"] }),
  kepala_sekolah: pendidikDasar(
    {
      Absensi: ["Absensi Siswa", "Rekap Absensi", "SP & Panggilan Ortu", "Kehadiran Guru", "Izin Guru & Pegawai"],
      Kesiswaan: ["Prestasi & Poin", "Statistik BK (angka)"],
      Kurikulum: ["Supervisi Akademik"],
      Humas: HUMAS,
      Sarpras: ["Inventaris"],
      Perpustakaan: ["Katalog Buku", "Laporan & Denda"],
      "Ekskul & OSIS": ["Organisasi Siswa", "Pengajuan Kegiatan"],
      Alumni: ["Alumni & Tracer"],
      Mutu: MUTU,
      Website: ["Persetujuan Konten", "Tampilan Website"],
      "Data Induk": DATA_INDUK,
      Pengaturan: ["Log Aktivitas", "Log Akses BK"],
    },
    LAY_PENDIDIK,
    tanpa(MENGAJAR, "Supervisi Saya"),
  ),
  literasi: pendidikDasar({ Perpustakaan: ["Katalog Buku", "Laporan & Denda", "Literasi", "Pojok Baca"] }),
  operator: tendikDasar({
    "Data Induk": DATA_INDUK,
    Pengaturan: ["Akun Portal Siswa & Ortu", "Pengguna & Peran"],
    Absensi: ["Absensi Siswa", "Rekap Absensi", "Kehadiran Guru", "Izin Guru & Pegawai", "Jam Kerja Pegawai"],
    Sarpras: ["Inventaris"],
    "Buku Tamu": ["Buku Tamu"],
  }),
  pustakawan: tendikDasar({ Perpustakaan: ["Sirkulasi", "Katalog Buku", "Laporan & Denda", "Literasi", "Pojok Baca"] }, tanpa(LAY_TENDIK, "Pinjaman Perpustakaan Saya")),
  laboran: tendikDasar({ Laboratorium: ["Inventaris", "Jadwal & Peminjaman Lab"] }, tanpa(LAY_TENDIK, "Peminjaman Ruang/Barang")),
  pegawai: tendikDasar({}),
  keuangan: tendikDasar({ "Ekskul & OSIS": ["Organisasi Siswa", "Pengajuan Kegiatan"] }),
  tim_mutu: tendikDasar({ Mutu: MUTU }),
  auditor: tendikDasar({ Mutu: MUTU }),
  admin_alumni: tendikDasar({ Alumni: ["Alumni & Tracer", "Layanan Alumni"] }),
};

const sebagaiObjek = (peran: string[], d = {}) => Object.fromEntries(menuUntuk(peran, d).map((g) => [g.judul ?? "", g.item.map((x) => x.label)]));

for (const [peran, harap] of Object.entries(MATRIKS)) {
  test(`menu ${peran} persis sesuai matriks`, () => {
    assert.deepEqual(sebagaiObjek([peran]), harap);
  });
}

test("menu super admin: semua grup bidang; Layanan saya hanya Presensi & Kalender (lainnya ada di grup bidang)", () => {
  const m = sebagaiObjek(["super_admin"]);
  assert.deepEqual(Object.keys(m), ["Website", "Data Induk", "Jadwal", "Kurikulum", "Absensi", "Kesiswaan", "Sarpras", "Perpustakaan", "Humas", "Ekskul & OSIS", "Alumni", "Mutu", "Pengaturan", "Layanan saya", "Akun saya"]);
  assert.deepEqual(m["Layanan saya"], ["Presensi Saya", "Kalender Sekolah"]);
});

test("setiap alamat hanya sekali dalam menu (gabungan peran guru + wali kelas + piket + waka kesiswaan)", () => {
  const semua = menuUntuk(["guru", "wali_kelas", "piket", "waka_kesiswaan"]).flatMap((g) => g.item.map((x) => x.href));
  assert.equal(semua.length, new Set(semua).size);
});

test("item dinamis: PIC pengaduan & penanggung jawab pojok baca (guru); BK tetap memakai grup Pengaduan", () => {
  const g = sebagaiObjek(["guru"], { picPengaduan: true, pjPojok: true });
  assert.ok(g["Layanan saya"].includes("Pengaduan Ditugaskan"));
  assert.deepEqual(g.Mengajar.at(-1), "Pojok Baca Saya");
  const b = sebagaiObjek(["bk"], { picPengaduan: true });
  assert.ok(!b["Layanan saya"].includes("Pengaduan Ditugaskan"));
  const t = sebagaiObjek(["pegawai"], { picPengaduan: true });
  assert.ok(t["Layanan saya"].includes("Pengaduan Ditugaskan"));
});

test("kartu Ringkasan: setiap peran punya kartu; pendidik juga 'mengajar'", () => {
  for (const p of Object.keys(MATRIKS).concat("super_admin")) assert.ok(kartuUntuk([p]).length > 0, p);
  assert.deepEqual(kartuUntuk(["guru"]), ["mengajar"]);
  assert.deepEqual(kartuUntuk(["piket"]), ["piket", "mengajar"]);
  assert.deepEqual(kartuUntuk(["pustakawan"]), ["perpus"]);
  assert.deepEqual(kartuUntuk(["pegawai"]), ["hariini"]);
  assert.deepEqual(kartuUntuk(["operator"]), ["tu"]);
  assert.deepEqual(kartuUntuk(["laboran"]), ["lab"]);
  assert.deepEqual(kartuUntuk(["kepala_sekolah"]), ["kepala", "mengajar"]);
});
