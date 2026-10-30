/**
 * Menu sidebar & kartu Ringkasan per PERAN — implementasi `docs/matriks-layanan.md` (disetujui 30 Okt 2026).
 * Menu ditentukan PERAN, bukan tautan akun ke data pegawai (halaman sendiri yang menampilkan "akun belum tertaut").
 * Satu akun = gabungan menu semua perannya. Item yang sama (href) hanya tampil sekali: grup bidang menang atas
 * "Layanan saya" & "Mengajar" (mis. pengelola sarpras membuka Peminjaman dari grup Sarpras).
 * Hak akses tetap dijaga server (wajibIzin/wajibBoleh) & RLS — menu tidak menambah kewenangan.
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */

export type ItemMenu = { href: string; label: string };
export type Grup = { judul?: string; item: ItemMenu[] };

const i = (href: string, label: string): ItemMenu => ({ href, label });

// ------------------------------------------------------------------------------------------------ katalog item
export const L = {
  presensi: i("/admin/presensi", "Presensi Saya"),
  kalender: i("/admin/kalender", "Kalender Sekolah"),
  lapKerusakan: i("/admin/sarpras/kerusakan", "Lapor Kerusakan"),
  peminjaman: i("/admin/sarpras/peminjaman", "Peminjaman Ruang/Barang"),
  pinjamanPerpus: i("/admin/perpus", "Pinjaman Perpustakaan Saya"),
  aduanDitugaskan: i("/admin/pengaduan", "Pengaduan Ditugaskan"),
  jadwalSaya: i("/admin/jadwal-saya", "Jadwal Saya"),
  tukarJam: i("/admin/tukar-jam", "Tukar Jam"),
  rujukanSaya: i("/admin/rujukan-bk", "Rujukan BK Saya"),
  lapor: i("/admin/kesiswaan/lapor", "Lapor Pelanggaran/Prestasi"),
};
export const M = {
  jadwalPelajaran: i("/admin/jadwal", "Jadwal Pelajaran"),
  perJp: i("/admin/absensi/jp", "Presensi & Jurnal per Jam"),
  perangkat: i("/admin/perangkat-ajar", "Perangkat Ajar"),
  materi: i("/admin/materi", "Materi & Papan Interaktif"),
  lms: i("/admin/lms", "Kelas Digital (Tugas & Kuis)"),
  struktur: i("/admin/kurikulum", "Struktur Kurikulum"),
  atp: i("/admin/kurikulum/atp", "CP, TP & ATP"),
  kokurikuler: i("/admin/kokurikuler", "Projek Kokurikuler"),
  supervisiSaya: i("/admin/supervisi", "Supervisi Saya"),
  pojokSaya: i("/admin/perpus/pojok", "Pojok Baca Saya"),
};
const AKUN_SAYA: Grup = { judul: "Akun saya", item: [i("/admin/profil-saya", "Profil Saya"), i("/admin/direktori", "Direktori GTK"), i("/admin/keamanan", "Keamanan Akun")] };

const WEBSITE_KELOLA = [
  i("/admin/profil", "Profil Sekolah"), i("/admin/berita", "Berita"), i("/admin/pengumuman", "Pengumuman"), i("/admin/agenda", "Agenda"),
  i("/admin/galeri", "Galeri"), i("/admin/kartu-beranda", "Kartu Beranda"), i("/admin/staf-publik", "Guru & Tendik (publik)"),
  i("/admin/menu", "Menu navigasi"), i("/admin/portal-masuk", "Halaman masuk portal"), i("/admin/fasilitas", "Fasilitas"),
  i("/admin/halaman", "Halaman teks"), i("/admin/tur-sekolah", "Tur Sekolah"), i("/admin/foto-sementara", "Foto sementara"),
  i("/admin/prestasi", "Prestasi & Alumni"), i("/admin/spmb", "SPMB Beranda"), i("/admin/portal-bidang", "Penanggung Jawab Portal"),
  i("/admin/situs", "Tampilan Website"), i("/admin/tampilan", "Tema & Tampilan"),
];
const DATA_INDUK: Grup = { judul: "Data Induk", item: [i("/admin/siswa", "Siswa"), i("/admin/pegawai", "Guru & Pegawai"), i("/admin/kelas", "Kelas"), i("/admin/tahun-ajaran", "Tahun Ajaran")] };
const MUTU: Grup = { judul: "Mutu", item: [i("/admin/mutu", "Mutu & Akreditasi"), i("/admin/mutu/temuan", "Temuan & Perbaikan"), i("/admin/mutu/bukti", "Repositori Bukti")] };
const PENGADUAN_RAHASIA: Grup = { judul: "Pengaduan", item: [i("/admin/pengaduan", "Pengaduan Rahasia & Ditugaskan")] };
const HUMAS_LENGKAP = [i("/admin/humas", "Dasbor Humas"), i("/admin/pengaduan", "Pengaduan"), i("/admin/kemitraan", "Kemitraan & MoU"), i("/admin/survei", "Survei"), i("/admin/kontak-media", "Kontak Media")];
const abs = {
  siswa: i("/admin/absensi", "Absensi Siswa"),
  koreksi: i("/admin/absensi/pengajuan", "Pengajuan Koreksi"),
  izinOrtu: i("/admin/izin-ortu", "Izin dari Orang Tua"),
  rekap: i("/admin/absensi/rekap", "Rekap Absensi"),
  disiplin: i("/admin/absensi/disiplin", "SP & Panggilan Ortu"),
  guru: i("/admin/absensi/guru", "Kehadiran Guru"),
  izinPegawai: i("/admin/izin-pegawai", "Izin Guru & Pegawai"),
  jamKerja: i("/admin/absensi/guru/pengaturan", "Jam Kerja Pegawai"),
  atur: i("/admin/absensi/pengaturan", "Pengaturan Absensi"),
};

// ------------------------------------------------------------------------------------------------ dasar peran
/** PENDIDIK: guru & semua tugas tambahan guru. Peran lain yang tidak terdaftar di sini & di TENDIK mengikuti peran lain. */
export const PERAN_PENDIDIK = ["guru", "wali_kelas", "piket", "bk", "waka_kurikulum", "waka_kesiswaan", "waka_sarpras", "waka_humas", "kepala_sekolah", "literasi"];
export const PERAN_TENDIK = ["operator", "pustakawan", "laboran", "pegawai", "keuangan"];
export const pendidik = (peran: readonly string[]) => peran.some((p) => PERAN_PENDIDIK.includes(p));

// ------------------------------------------------------------------------------------------------ grup bidang per peran
export const BIDANG_PERAN: Record<string, Grup[]> = {
  super_admin: [
    { judul: "Website", item: [i("/admin/persetujuan", "Persetujuan Konten"), ...WEBSITE_KELOLA] },
    DATA_INDUK,
    { judul: "Jadwal", item: [M.jadwalPelajaran, i("/admin/jadwal/pengganti", "Guru Pengganti"), i("/admin/jadwal/tukar", "Persetujuan Tukar Jam"), i("/admin/jadwal/riwayat", "Riwayat Jadwal")] },
    { judul: "Kurikulum", item: [M.struktur, M.atp, i("/admin/perangkat-ajar/review", "Periksa Perangkat"), M.kokurikuler, i("/admin/supervisi", "Supervisi Akademik")] },
    { judul: "Absensi", item: [abs.siswa, abs.koreksi, abs.izinOrtu, abs.rekap, abs.disiplin, abs.guru, abs.izinPegawai, abs.jamKerja, abs.atur] },
    { judul: "Kesiswaan", item: [i("/admin/kesiswaan", "Prestasi & Poin"), i("/admin/bk/laporan", "Statistik BK (angka)"), i("/admin/kesiswaan/pengaturan", "Aturan Poin")] },
    { judul: "Sarpras", item: [i("/admin/sarpras", "Inventaris"), L.peminjaman, i("/admin/sarpras/kerusakan", "Laporan Kerusakan")] },
    { judul: "Perpustakaan", item: [i("/admin/perpus", "Sirkulasi"), i("/admin/perpus/katalog", "Katalog Buku"), i("/admin/perpus/laporan", "Laporan & Denda"), i("/admin/perpus/literasi", "Literasi"), i("/admin/perpus/pojok", "Pojok Baca")] },
    { judul: "Humas", item: [...HUMAS_LENGKAP, i("/admin/buku-tamu", "Buku Tamu")] },
    { judul: "Ekskul & OSIS", item: [i("/admin/ekskul", "Organisasi Siswa"), i("/admin/ekskul/pengajuan", "Pengajuan Kegiatan")] },
    { judul: "Alumni", item: [i("/admin/alumni", "Alumni & Tracer"), i("/admin/alumni/layanan", "Layanan Alumni")] },
    MUTU,
    { judul: "Pengaturan", item: [i("/admin/akun-portal", "Akun Portal Siswa & Ortu"), i("/admin/pengguna", "Pengguna & Peran"), i("/admin/notifikasi/kanal", "WhatsApp & Email"), i("/admin/log", "Log Aktivitas"), i("/admin/bk/log", "Log Akses BK")] },
  ],
  kepala_sekolah: [
    { judul: "Absensi", item: [abs.siswa, abs.rekap, abs.disiplin, abs.guru, abs.izinPegawai] },
    { judul: "Kesiswaan", item: [i("/admin/kesiswaan", "Prestasi & Poin"), i("/admin/bk/laporan", "Statistik BK (angka)")] },
    { judul: "Kurikulum", item: [i("/admin/supervisi", "Supervisi Akademik")] },
    { judul: "Humas", item: HUMAS_LENGKAP },
    { judul: "Sarpras", item: [i("/admin/sarpras", "Inventaris")] },
    { judul: "Perpustakaan", item: [i("/admin/perpus/katalog", "Katalog Buku"), i("/admin/perpus/laporan", "Laporan & Denda")] },
    { judul: "Ekskul & OSIS", item: [i("/admin/ekskul", "Organisasi Siswa"), i("/admin/ekskul/pengajuan", "Pengajuan Kegiatan")] },
    { judul: "Alumni", item: [i("/admin/alumni", "Alumni & Tracer")] },
    MUTU,
    { judul: "Website", item: [i("/admin/persetujuan", "Persetujuan Konten"), i("/admin/situs", "Tampilan Website")] },
    DATA_INDUK,
    { judul: "Pengaturan", item: [i("/admin/log", "Log Aktivitas"), i("/admin/bk/log", "Log Akses BK")] },
  ],
  waka_kurikulum: [
    { judul: "Kurikulum", item: [M.struktur, M.atp, i("/admin/perangkat-ajar/review", "Periksa Perangkat"), M.kokurikuler, i("/admin/supervisi", "Supervisi Akademik")] },
    { judul: "Jadwal", item: [M.jadwalPelajaran, i("/admin/jadwal/pengganti", "Guru Pengganti"), i("/admin/jadwal/tukar", "Persetujuan Tukar Jam"), i("/admin/jadwal/riwayat", "Riwayat Jadwal")] },
    DATA_INDUK,
    MUTU,
    { judul: "Perpustakaan", item: [i("/admin/perpus/katalog", "Katalog Buku"), i("/admin/perpus/laporan", "Laporan & Denda")] },
  ],
  waka_kesiswaan: [
    { judul: "Kesiswaan", item: [i("/admin/kesiswaan", "Prestasi & Poin"), i("/admin/kesiswaan/pengaturan", "Aturan Poin")] },
    { judul: "Absensi", item: [abs.siswa, abs.koreksi, abs.izinOrtu, abs.rekap, abs.disiplin, abs.atur] },
    { judul: "Ekskul & OSIS", item: [i("/admin/ekskul", "Organisasi Siswa"), i("/admin/ekskul/pengajuan", "Pengajuan Kegiatan")] },
    PENGADUAN_RAHASIA,
    DATA_INDUK,
  ],
  waka_sarpras: [{ judul: "Sarpras", item: [i("/admin/sarpras", "Inventaris"), L.peminjaman, i("/admin/sarpras/kerusakan", "Laporan Kerusakan")] }],
  waka_humas: [
    { judul: "Humas", item: [...HUMAS_LENGKAP, i("/admin/buku-tamu", "Buku Tamu")] },
    { judul: "Website", item: WEBSITE_KELOLA },
    { judul: "Alumni", item: [i("/admin/alumni", "Alumni & Tracer"), i("/admin/alumni/layanan", "Layanan Alumni")] },
  ],
  bk: [
    { judul: "Bimbingan Konseling", item: [i("/admin/bk", "Layanan & Kasus BK"), i("/admin/bk/laporan", "Laporan BK (agregat)"), i("/admin/bk/log", "Log Akses BK")] },
    { judul: "Kesiswaan", item: [i("/admin/kesiswaan", "Prestasi & Poin"), i("/admin/rujukan-bk", "Rujukan BK")] },
    { judul: "Absensi", item: [abs.rekap, abs.disiplin] },
    PENGADUAN_RAHASIA,
    DATA_INDUK,
    { judul: "Alumni", item: [i("/admin/alumni", "Alumni & Tracer")] },
  ],
  wali_kelas: [
    {
      judul: "Perwalian",
      item: [i("/admin/kelas-saya", "Kelas Saya"), i("/admin/absensi", "Absensi Kelas"), abs.izinOrtu, abs.koreksi, i("/admin/absensi/rekap", "Rekap Absensi Kelas"), i("/admin/absensi/disiplin", "SP & Panggilan Kelas"), i("/admin/kesiswaan", "Prestasi & Poin Kelas")],
    },
  ],
  piket: [{ judul: "Piket", item: [i("/admin/absensi", "Absensi Harian & Terlambat"), abs.koreksi, abs.izinOrtu, i("/admin/buku-tamu", "Buku Tamu"), i("/admin/jadwal/pengganti", "Guru Pengganti")] }],
  guru: [],
  literasi: [{ judul: "Perpustakaan", item: [i("/admin/perpus/katalog", "Katalog Buku"), i("/admin/perpus/laporan", "Laporan & Denda"), i("/admin/perpus/literasi", "Literasi"), i("/admin/perpus/pojok", "Pojok Baca")] }],
  operator: [
    DATA_INDUK,
    { judul: "Pengaturan", item: [i("/admin/akun-portal", "Akun Portal Siswa & Ortu"), i("/admin/pengguna", "Pengguna & Peran")] },
    { judul: "Absensi", item: [abs.siswa, abs.rekap, abs.guru, abs.izinPegawai, abs.jamKerja] },
    { judul: "Sarpras", item: [i("/admin/sarpras", "Inventaris")] },
    { judul: "Buku Tamu", item: [i("/admin/buku-tamu", "Buku Tamu")] },
  ],
  pustakawan: [{ judul: "Perpustakaan", item: [i("/admin/perpus", "Sirkulasi"), i("/admin/perpus/katalog", "Katalog Buku"), i("/admin/perpus/laporan", "Laporan & Denda"), i("/admin/perpus/literasi", "Literasi"), i("/admin/perpus/pojok", "Pojok Baca")] }],
  laboran: [{ judul: "Laboratorium", item: [i("/admin/sarpras", "Inventaris"), i("/admin/sarpras/peminjaman", "Jadwal & Peminjaman Lab")] }],
  pegawai: [],
  keuangan: [{ judul: "Ekskul & OSIS", item: [i("/admin/ekskul", "Organisasi Siswa"), i("/admin/ekskul/pengajuan", "Pengajuan Kegiatan")] }],
  tim_mutu: [MUTU],
  auditor: [MUTU],
  admin_alumni: [{ judul: "Alumni", item: [i("/admin/alumni", "Alumni & Tracer"), i("/admin/alumni/layanan", "Layanan Alumni")] }],
};

// ------------------------------------------------------------------------------------------------ kartu Ringkasan per peran
export const URUTAN_KARTU = ["kepala", "admin", "tu", "kurikulum", "kesiswaan", "sarpras", "lab", "humas", "bk", "perpus", "literasi", "anggaran", "mutu", "alumni", "wali", "piket", "mengajar", "hariini"] as const;
export type KunciKartu = (typeof URUTAN_KARTU)[number];
export const KARTU_PERAN: Record<string, KunciKartu[]> = {
  super_admin: ["admin"], kepala_sekolah: ["kepala"], waka_kurikulum: ["kurikulum"], waka_kesiswaan: ["kesiswaan"], waka_sarpras: ["sarpras"],
  waka_humas: ["humas"], bk: ["bk"], wali_kelas: ["wali"], piket: ["piket"], guru: [], literasi: ["literasi"], operator: ["tu"],
  pustakawan: ["perpus"], laboran: ["lab"], pegawai: ["hariini"], keuangan: ["anggaran"], tim_mutu: ["mutu"], auditor: ["mutu"], admin_alumni: ["alumni"],
};

/** Kartu Ringkasan untuk gabungan peran; semua pendidik juga mendapat "Jadwal mengajar hari ini". */
export function kartuUntuk(peran: readonly string[]): KunciKartu[] {
  const ada = new Set<KunciKartu>(peran.flatMap((p) => KARTU_PERAN[p] ?? []));
  if (pendidik(peran)) ada.add("mengajar");
  return URUTAN_KARTU.filter((k) => ada.has(k));
}

// ------------------------------------------------------------------------------------------------ menu
/** Item yang bergantung DATA, bukan peran: PIC pengaduan, penanggung jawab pojok baca, pembina organisasi, pemilik indikator mutu. */
export type Dinamis = { picPengaduan?: boolean; pjPojok?: boolean; pembina?: boolean; pemilikMutu?: boolean };

/** Grup menu (tanpa "Ringkasan") untuk gabungan peran. Urutan tampil diatur sidebar; di sini hanya isi & duplikasi. */
export function menuUntuk(peran: readonly string[], d: Dinamis = {}): Grup[] {
  const bidang: Grup[] = [];
  // gabungan peran: grup sejudul digabung; alamat yang sudah ada di grup bidang lain tidak diulang (peran pertama menang)
  const tambah = (g: Grup) => {
    const baru = g.item.filter((it) => !bidang.some((x) => x.item.some((y) => y.href === it.href)));
    const ada = bidang.find((x) => x.judul === g.judul);
    if (ada) ada.item.push(...baru);
    else if (baru.length) bidang.push({ judul: g.judul, item: baru });
  };
  for (const p of peran) for (const g of BIDANG_PERAN[p] ?? []) tambah(g);
  if (d.pembina) tambah({ judul: "Ekskul & OSIS", item: [i("/admin/ekskul", "Organisasi Binaan"), i("/admin/ekskul/pengajuan", "Pengajuan Kegiatan")] });
  if (d.pemilikMutu) tambah(MUTU);

  const guru = pendidik(peran);
  const layanan: ItemMenu[] = [L.presensi, L.kalender, L.lapKerusakan, L.peminjaman, L.pinjamanPerpus, ...(d.picPengaduan ? [L.aduanDitugaskan] : [])];
  if (guru) {
    layanan.splice(1, 0, L.jadwalSaya, L.tukarJam);
    layanan.push(L.rujukanSaya, L.lapor);
  }
  const mengajar: ItemMenu[] = guru ? [M.jadwalPelajaran, M.perJp, M.perangkat, M.materi, M.lms, M.struktur, M.atp, M.kokurikuler, M.supervisiSaya, ...(d.pjPojok ? [M.pojokSaya] : [])] : [];

  // satu href hanya sekali: grup bidang dulu, lalu Layanan saya, lalu Mengajar
  const terpakai = new Set(bidang.flatMap((g) => g.item.map((x) => x.href)));
  const sisa = (daftar: ItemMenu[]) =>
    daftar.filter((x) => {
      if (terpakai.has(x.href)) return false;
      terpakai.add(x.href);
      return true;
    });
  const hasil: Grup[] = [...bidang, { judul: "Layanan saya", item: sisa(layanan) }];
  const ajar = sisa(mengajar);
  if (ajar.length) hasil.push({ judul: "Mengajar", item: ajar });
  hasil.push(AKUN_SAYA);
  return hasil.filter((g) => g.item.length);
}
