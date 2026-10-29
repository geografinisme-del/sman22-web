/**
 * Portal Digital 22 — pintu masuk layanan & ruang kerja sekolah.
 * Kartu bidang boleh terlihat publik (nama + fungsi), tetapi MEMILIH kartu tidak memberi hak apa pun:
 * keputusan memakai izin/peran yang dihitung database (akses_saya), dan halaman tujuan tetap memeriksa
 * izinnya sendiri di server. Satu sistem masuk untuk semua bidang.
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */
import { BIDANG, type KunciBidang } from "./bidang.ts";
import { RUANG_KERJA } from "./ruang-kerja.ts";
import { DARI_SEBAGAI, lanjutAman, urlMasuk } from "./masuk.ts";

export { lanjutAman };

type AksesMinimal = { peran: string[]; izin: readonly string[] };
export type Sebagai = "staf" | "siswa" | "orang_tua";
export type Grup = "warga" | "manajemen" | "belajar" | "sistem";

export const GRUP: Record<Grup, { judul: string; keterangan: string }> = {
  warga: { judul: "Warga sekolah", keterangan: "Masuk sesuai peran Anda di sekolah." },
  manajemen: { judul: "Ruang kerja manajemen", keterangan: "Untuk pengelola bidang. Akses mengikuti penugasan akun." },
  belajar: { judul: "Layanan belajar & informasi", keterangan: "Terbuka untuk umum; layanan pribadi tersedia setelah masuk." },
  sistem: { judul: "Administrasi sistem", keterangan: "Hanya untuk pengelola sistem." },
};

/** Peran staf yang boleh membuka dasbor admin (sama dengan pemeriksaan di layout panel). */
export const PERAN_STAF = ["super_admin", "kepala_sekolah", "waka_kurikulum", "waka_kesiswaan", "waka_sarpras", "waka_humas", "pustakawan", "literasi", "keuangan", "admin_alumni", "tim_mutu", "auditor", "operator", "piket", "bk", "wali_kelas", "guru"];
const PERAN_PIMPINAN = ["super_admin", "kepala_sekolah"];

export type Pintu = {
  bidang: KunciBidang;
  grup: Grup;
  /** "publik" = halaman terbuka; "masuk" = perlu akun & syarat */
  jenis: "publik" | "masuk";
  href: string;
  sebagai?: Sebagai;
  /** teks tombol */
  tindakan: string;
  /** syarat akses (hanya untuk jenis "masuk") */
  boleh?: (a: AksesMinimal) => boolean;
  /** kartu hanya ditampilkan bila syarat terpenuhi (mis. administrasi sistem) */
  tersembunyi?: boolean;
};

const izinRuang = (kunci: string) => {
  const r = RUANG_KERJA.find((x) => x.kunci === kunci);
  if (!r) throw new Error(`ruang kerja ${kunci} tidak ada`);
  return { href: r.href, boleh: (a: AksesMinimal) => r.izin.some((i) => a.izin.includes(i)) };
};
const punyaPeran = (daftar: string[]) => (a: AksesMinimal) => a.peran.some((p) => daftar.includes(p));

export const PINTU: Pintu[] = [
  { bidang: "guru", grup: "warga", jenis: "masuk", href: "/admin", sebagai: "staf", tindakan: "Masuk", boleh: punyaPeran(PERAN_STAF) },
  { bidang: "siswa", grup: "warga", jenis: "masuk", href: "/portal", sebagai: "siswa", tindakan: "Masuk", boleh: punyaPeran(["siswa"]) },
  { bidang: "ortu", grup: "warga", jenis: "masuk", href: "/portal", sebagai: "orang_tua", tindakan: "Masuk", boleh: punyaPeran(["orang_tua"]) },
  { bidang: "kurikulum", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("kurikulum") },
  { bidang: "kesiswaan", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("kesiswaan") },
  { bidang: "sarpras", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("sarpras") },
  { bidang: "humas", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("humas") },
  { bidang: "tata_usaha", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("tata_usaha") },
  { bidang: "tpmps", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("tpmps") },
  { bidang: "bk", grup: "manajemen", jenis: "masuk", sebagai: "staf", tindakan: "Buka ruang kerja", ...izinRuang("bk") },
  { bidang: "manajemen", grup: "manajemen", jenis: "masuk", href: "/admin", sebagai: "staf", tindakan: "Buka ringkasan", boleh: punyaPeran(PERAN_PIMPINAN) },
  { bidang: "elibrary", grup: "belajar", jenis: "publik", href: "/perpustakaan", tindakan: "Buka katalog" },
  { bidang: "spmb", grup: "belajar", jenis: "publik", href: "/spmb", tindakan: "Lihat informasi" },
  { bidang: "sistem", grup: "sistem", jenis: "masuk", href: "/admin/pengguna", sebagai: "staf", tindakan: "Buka", boleh: (a) => a.izin.includes("pengguna.kelola"), tersembunyi: true },
];

export type Keputusan =
  | { aksi: "buka"; href: string }
  | { aksi: "masuk"; href: string }
  | { aksi: "tolak"; judul: string; alasan: string };

/**
 * Putuskan apa yang terjadi saat kartu bidang dipilih.
 * `akses` = null & `masukAkun` = false → belum masuk. `masukAkun` true tetapi akses null → akun belum aktif/diberi peran.
 */
export function putuskanPintu(bidang: string, akses: AksesMinimal | null, masukAkun: boolean): Keputusan | null {
  const p = PINTU.find((x) => x.bidang === bidang);
  if (!p) return null;
  if (p.jenis === "publik") return { aksi: "buka", href: p.href };
  const label = BIDANG[p.bidang].label;
  if (!masukAkun) {
    return { aksi: "masuk", href: urlMasuk(`/portal-digital/buka/${p.bidang}`, DARI_SEBAGAI[p.sebagai ?? "staf"]) };
  }
  if (!akses) return { aksi: "tolak", judul: "Akun belum aktif", alasan: "Akun Anda sudah masuk, tetapi belum diberi peran atau sedang dinonaktifkan. Hubungi admin sekolah." };
  if (p.boleh?.(akses)) return { aksi: "buka", href: p.href };
  return {
    aksi: "tolak",
    judul: `Belum ada akses ke ${label}`,
    alasan: `Akun Anda tidak memiliki penugasan untuk ${label}. Memilih kartu tidak menambah hak akses; penugasan diatur oleh admin sekolah.`,
  };
}

/** Kartu yang ditampilkan: kartu tersembunyi hanya muncul bila pengguna berhak. */
export function pintuTerlihat(akses: AksesMinimal | null) {
  return PINTU.filter((p) => !p.tersembunyi || (akses && p.boleh?.(akses)));
}
