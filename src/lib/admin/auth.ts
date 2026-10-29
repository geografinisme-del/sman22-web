import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAktif } from "@/lib/supabase/config";
import { urlMasuk } from "@/lib/masuk";
import { adaCookiePratinjau, bacaPratinjau } from "@/lib/pratinjau";
import { TANPA_PERAN } from "@/lib/pratinjau-umum";

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
  | "mutu.lihat"
  | "sarpras.inventaris"
  | "humas.lihat"
  | "pengaduan.lihat"
  | "pengaduan.metadata"
  | "pengguna.kelola_dasar";

export type Akses = {
  userId: string;
  email: string;
  nama: string;
  peran: string[];
  izin: Izin[];
  /** peran yang wajib verifikasi dua langkah tetapi sesi ini belum terverifikasi (izinnya ditahan database) */
  peranTertunda: string[];
  /** akun GTK aktif yang belum diberi peran: diperlakukan sebagai "pegawai" (dasbor dasar), admin diberi notifikasi */
  tanpaPeran?: boolean;
  /** "Lihat sebagai…": super admin sedang melihat sebagai peran ini (hanya baca; peran & izin di atas milik peran itu) */
  pratinjau?: { peran: string; label: string; mulai: number };
};

export const NAMA_PERAN: Record<string, string> = {
  super_admin: "Super Admin",
  kepala_sekolah: "Kepala Sekolah",
  waka_kurikulum: "Wakasek Kurikulum",
  waka_kesiswaan: "Wakasek Kesiswaan",
  waka_sarpras: "Wakasek Sarpras",
  waka_humas: "Wakasek Humas",
  pustakawan: "Pustakawan",
  literasi: "Koordinator Literasi",
  keuangan: "Bendahara / Keuangan",
  alumni: "Alumni",
  admin_alumni: "Admin Alumni",
  tim_mutu: "Tim Penjaminan Mutu",
  auditor: "Auditor Internal",
  operator: "Operator / TU",
  piket: "Guru Piket",
  bk: "Guru BK",
  wali_kelas: "Wali Kelas",
  guru: "Guru",
  laboran: "Laboran",
  pegawai: "Pegawai umum",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
  [TANPA_PERAN]: "Akun menunggu verifikasi",
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
  const d = (data ?? {}) as { nama?: string; aktif?: boolean; peran?: string[]; peran_tertunda?: string[]; izin?: Izin[]; pratinjau?: string };
  const jumlahPeran = (d.peran?.length ?? 0) + (d.peran_tertunda?.length ?? 0);
  // "Lihat sebagai…": database baru mengakui pratinjau bila pemanggil super admin AAL2 → peran & izin di atas sudah
  // milik peran yang dilihat (lebih sempit). Cookie milik akun lain diabaikan.
  const p = d.pratinjau ? await bacaPratinjau() : null;
  const pratinjau = p && p.uid === user.id ? { peran: d.pratinjau!, label: NAMA_PERAN[d.pratinjau!] ?? d.pratinjau!, mulai: p.mulai } : undefined;
  // akun aktif tanpa peran = belum diverifikasi admin → hanya halaman "menunggu verifikasi" (tanpa aksi apa pun)
  const akses: Akses | null = d.aktif
    ? { userId: user.id, email: user.email ?? "", nama: d.nama ?? "", peran: d.peran ?? [], izin: d.izin ?? [], peranTertunda: d.peran_tertunda ?? [], tanpaPeran: jumlahPeran === 0, pratinjau }
    : null;
  return { supabase, user, akses };
});

/**
 * Akses SEBENARNYA pengguna (tanpa header pratinjau) — untuk pemilih "Lihat sebagai…" dan pencatatan mulai/selesai.
 * Klien yang dikembalikan juga tanpa header pratinjau: JANGAN dipakai untuk menampilkan data selama pratinjau.
 */
export const aksesAsli = cache(async () => {
  if (!supabaseAktif) return { supabase: null, user: null, superAdmin: false };
  const supabase = await supabaseServer({ asli: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, superAdmin: false };
  const { data } = await supabase.rpc("akses_saya");
  const d = (data ?? {}) as { aktif?: boolean; peran?: string[] };
  // peran super_admin baru muncul di "peran" (bukan "peran_tertunda") bila sesi sudah lolos MFA (AAL2)
  return { supabase, user, superAdmin: Boolean(d.aktif && d.peran?.includes("super_admin")) };
});

export const punya = (akses: Akses | null, izin: Izin) => Boolean(akses?.izin.includes(izin));
export const berperan = (akses: Akses | null, peran: string) => Boolean(akses?.peran.includes(peran));

/** Untuk halaman admin: alihkan ke login bila belum masuk. */
export async function wajibLogin() {
  const hasil = await getAkses();
  if (!hasil.user || !hasil.supabase) redirect(urlMasuk(null, "gtk"));
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

/** Untuk halaman modul yang syaratnya bukan satu izin (lihat lib/admin/akses-modul.ts): URL langsung tetap ditolak. */
export async function wajibBoleh(syarat: (a: Akses) => boolean) {
  const hasil = await wajibLogin();
  if (!hasil.akses || !syarat(hasil.akses)) redirect("/admin?pesan=tanpa-akses");
  return hasil as typeof hasil & { akses: Akses };
}

/** Untuk server action: null bila tidak berhak (jangan pernah percaya tampilan saja). */
export async function aksesAksi(izin?: Izin) {
  // "Lihat sebagai…": SEMUA aksi ditolak di server selama cookie pratinjau ada (sah atau tidak)
  if (await adaCookiePratinjau()) return null;
  const { supabase, akses } = await getAkses();
  if (!supabase || !akses) return null;
  // akun tanpa peran (belum diverifikasi) tidak boleh menjalankan aksi apa pun
  if (akses.tanpaPeran) return null;
  if (izin && !punya(akses, izin)) return null;
  return { supabase, akses };
}
