/**
 * Warna penanda BIDANG (layanan/ruang kerja) — usulan UI, BUKAN warna resmi sekolah.
 * Identitas sekolah memakai token tema "Langit cerah"; warna bidang hanya untuk navigasi visual:
 * ikon, label, indikator aktif, garis aksen, dan sebagian kepala halaman. Bidang selalu juga dikenali
 * lewat nama & ikon. Warna status (sukses/peringatan/gagal) terpisah dan tidak memakai token ini.
 *
 * Setiap bidang: `solid` (teks putih di atasnya ≥ 4,5:1), `tint` (latar lembut), `teks` (teks gelap di atas
 * tint/putih ≥ 4,5:1), `garis` (border). Kontras diuji di bidang.test.ts.
 * Modul murni (tanpa impor server) — dipakai server, klien, dan `node --test`.
 */

export type WarnaBidang = { solid: string; tint: string; teks: string; garis: string };
export type Bidang = WarnaBidang & {
  label: string;
  /** nama ikon lucide-react */
  ikon: string;
  keterangan: string;
};

export const BIDANG = {
  guru: { label: "Pojok Guru", ikon: "BookOpenCheck", keterangan: "Jadwal mengajar, presensi, jurnal, perangkat ajar, dan kelas digital.", solid: "#1d4ed8", tint: "#eaf1fe", teks: "#173a8a", garis: "#b9cdfa" },
  kurikulum: { label: "Kurikulum", ikon: "GraduationCap", keterangan: "Struktur kurikulum, jadwal pelajaran, perangkat ajar, dan supervisi.", solid: "#4338ca", tint: "#eeedfc", teks: "#312a91", garis: "#c7c3f4" },
  kesiswaan: { label: "Kesiswaan", ikon: "Users", keterangan: "Prestasi, poin karakter, disiplin, serta ekskul & OSIS.", solid: "#b45309", tint: "#fdf1e3", teks: "#7a3a07", garis: "#f3cf9f" },
  sarpras: { label: "Sarpras", ikon: "Building2", keterangan: "Inventaris, peminjaman ruang & barang, dan laporan kerusakan.", solid: "#0f766e", tint: "#e3f5f2", teks: "#0b524d", garis: "#a8dcd5" },
  humas: { label: "Humas", ikon: "Megaphone", keterangan: "Pengaduan, kemitraan, survei, dan komunikasi publik.", solid: "#be185d", tint: "#fde9f2", teks: "#8a1043", garis: "#f5b9d3" },
  tata_usaha: { label: "Tata Usaha", ikon: "FolderOpen", keterangan: "Data induk siswa & pegawai, kelas, dan akun portal.", solid: "#475569", tint: "#eef1f5", teks: "#334155", garis: "#c9d1dc" },
  tpmps: { label: "TPMPS / Mutu", ikon: "BadgeCheck", keterangan: "Indikator mutu, temuan & perbaikan, dan repositori bukti.", solid: "#6d28d9", tint: "#f2ecfe", teks: "#4c1d95", garis: "#d8c6fb" },
  elibrary: { label: "E-Library", ikon: "Library", keterangan: "Katalog buku, ketersediaan, koleksi digital, dan layanan pinjam.", solid: "#15803d", tint: "#e7f6ec", teks: "#14532d", garis: "#b3e2c2" },
  spmb: { label: "SPMB", ikon: "School", keterangan: "Informasi Sistem Penerimaan Murid Baru.", solid: "#8f1d2c", tint: "#fbecee", teks: "#6e1522", garis: "#ecbcc3" },
  bk: { label: "Bimbingan Konseling", ikon: "HeartHandshake", keterangan: "Layanan & kasus konseling dengan kerahasiaan terjaga.", solid: "#0e7490", tint: "#e2f4f8", teks: "#0b5468", garis: "#a9dce8" },
  manajemen: { label: "Manajemen", ikon: "LayoutDashboard", keterangan: "Ringkasan kondisi sekolah untuk kepala sekolah & wakasek.", solid: "#1e3a5f", tint: "#e8eef6", teks: "#1e3a5f", garis: "#bdcbe0" },
  siswa: { label: "Portal Siswa", ikon: "Backpack", keterangan: "Jadwal, tugas, materi, kehadiran, dan pinjaman buku.", solid: "#0369a1", tint: "#e3f2fb", teks: "#075985", garis: "#a9d6f1" },
  ortu: { label: "Portal Orang Tua", ikon: "Home", keterangan: "Kehadiran & perkembangan anak, izin sakit, dan informasi sekolah.", solid: "#8a5a2b", tint: "#f6eee4", teks: "#5f3c1a", garis: "#e2cdb3" },
  sistem: { label: "Administrasi Sistem", ikon: "Settings", keterangan: "Pengguna & peran, log aktivitas, dan tampilan website.", solid: "#52525b", tint: "#f1f1f3", teks: "#3f3f46", garis: "#d4d4d8" },
} satisfies Record<string, Bidang>;

export type KunciBidang = keyof typeof BIDANG;
export const KUNCI_BIDANG = Object.keys(BIDANG) as KunciBidang[];

/** Variabel CSS per bidang: pakai `data-bidang="<kunci>"` pada pembungkus. */
export function cssBidang() {
  return KUNCI_BIDANG.map((k) => {
    const b = BIDANG[k];
    return `[data-bidang="${k}"]{--bidang:${b.solid};--bidang-tint:${b.tint};--bidang-teks:${b.teks};--bidang-garis:${b.garis}}`;
  }).join("");
}

/** Rasio kontras WCAG antara dua warna #rrggbb. */
export function kontras(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Bidang yang paling sesuai untuk sebuah tautan layanan (untuk warna penanda; null = netral). */
export function bidangDariTautan(href: string): KunciBidang | null {
  const p = href.split(/[?#]/)[0];
  const peta: [RegExp, KunciBidang][] = [
    [/^\/spmb/, "spmb"],
    [/^\/(perpustakaan|e-library)/, "elibrary"],
    [/^\/(pengaduan|survei|kontak)/, "humas"],
    [/^\/(ekskul|alumni)/, "kesiswaan"],
    [/^\/(portal-digital|admin)/, "guru"],
    [/^\/(portal|masuk)/, "siswa"],
    [/^\/(program|kurikulum)/, "kurikulum"],
    [/^\/(agenda|berita|sertifikat)/, "tata_usaha"],
  ];
  return peta.find(([r]) => r.test(p))?.[1] ?? null;
}
