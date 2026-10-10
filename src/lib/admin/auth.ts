import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAktif } from "@/lib/supabase/config";

export type Izin =
  | "konten.kelola"
  | "konten.terbitkan"
  | "data_induk.baca"
  | "data_induk.kelola"
  | "pengguna.kelola"
  | "audit.baca"
  | "absensi.lihat"
  | "absensi.kelola"
  | "absensi.atur"
  | "disiplin.lihat"
  | "disiplin.kelola"
  | "absensi_pegawai.lihat"
  | "absensi_pegawai.kelola"
  | "akun_portal.kelola"
  | "jadwal.kelola"
  | "jadwal.pengganti"
  | "izin_pegawai.setujui"
  | "kesiswaan.lihat"
  | "kesiswaan.kelola"
  | "bk.rujukan"
  | "kalender.kelola"
  | "kurikulum.kelola"
  | "supervisi.kelola"
  | "sarpras.kelola"
  | "sarpras.lihat"
  | "perpus.kelola"
  | "perpus.lihat"
  | "pengaduan.kelola"
  | "pengaduan.rahasia"
  | "humas.kelola"
  | "tamu.catat"
  | "literasi.kelola"
  | "bk.konseling"
  | "bk.agregat"
  | "ekskul.kelola"
  | "ekskul.lihat"
  | "ekskul.anggaran"
  | "alumni.kelola"
  | "alumni.lihat"
  | "mutu.kelola"
  | "mutu.audit"
  | "mutu.lihat";

export type Akses = {
  userId: string;
  email: string;
  nama: string;
  peran: string[];
  izin: Izin[];
  /** peran yang wajib verifikasi dua langkah tetapi sesi ini belum terverifikasi (izinnya ditahan database) */
  peranTertunda: string[];
};

export const NAMA_PERAN: Record<string, string> = {
  super_admin: "Super Admin",
  kepala_sekolah: "Kepala Sekolah",
  wakasek: "Wakasek",
  kurikulum: "Wakasek Kurikulum",
  sarpras: "Wakasek Sarpras",
  pustakawan: "Pustakawan",
  literasi: "Koordinator Literasi",
  keuangan: "Bendahara / Keuangan",
  alumni: "Alumni",
  admin_alumni: "Admin Alumni",
  tim_mutu: "Tim Penjaminan Mutu",
  auditor: "Auditor Internal",
  operator: "Operator / TU",
  humas: "Humas",
  kesiswaan: "Kesiswaan",
  piket: "Guru Piket",
  bk: "Guru BK",
  wali_kelas: "Wali Kelas",
  guru: "Guru",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
};

/** Pengguna yang sedang login + peran & izinnya (dihitung oleh database). */
export const getAkses = cache(async () => {
  if (!supabaseAktif) return { supabase: null, user: null, akses: null };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, akses: null };

  const { data, error } = await supabase.rpc("akses_saya");
  if (error) console.error("[auth] gagal memuat akses:", error.message);
  const d = (data ?? {}) as { nama?: string; aktif?: boolean; peran?: string[]; peran_tertunda?: string[]; izin?: Izin[] };
  const akses: Akses | null =
    d.aktif && (d.peran?.length ?? 0) + (d.peran_tertunda?.length ?? 0) > 0
      ? { userId: user.id, email: user.email ?? "", nama: d.nama ?? "", peran: d.peran ?? [], izin: d.izin ?? [], peranTertunda: d.peran_tertunda ?? [] }
      : null;
  return { supabase, user, akses };
});

export const punya = (akses: Akses | null, izin: Izin) => Boolean(akses?.izin.includes(izin));
export const berperan = (akses: Akses | null, peran: string) => Boolean(akses?.peran.includes(peran));

/** Untuk halaman admin: alihkan ke login bila belum masuk. */
export async function wajibLogin() {
  const hasil = await getAkses();
  if (!hasil.user || !hasil.supabase) redirect("/admin/login");
  return hasil as { supabase: NonNullable<typeof hasil.supabase>; user: NonNullable<typeof hasil.user>; akses: Akses | null };
}

/** Label peran yang bisa dibaca manusia */
export const labelPeran = (list: string[]) => list.map((p) => NAMA_PERAN[p] ?? p).join(", ");

/** Untuk halaman yang butuh izin tertentu. */
export async function wajibIzin(izin: Izin) {
  const hasil = await wajibLogin();
  if (!punya(hasil.akses, izin)) redirect("/admin?pesan=tanpa-akses");
  return hasil as typeof hasil & { akses: Akses };
}

/** Untuk server action: null bila tidak berhak (jangan pernah percaya tampilan saja). */
export async function aksesAksi(izin?: Izin) {
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return null;
  if (izin && !punya(akses, izin)) return null;
  return { supabase, akses };
}
