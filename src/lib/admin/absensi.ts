import { z } from "zod";

export const STATUS_SISWA_ABSEN = {
  H: { label: "Hadir", pendek: "H", warna: "bg-emerald-600" },
  T: { label: "Terlambat", pendek: "T", warna: "bg-amber-500" },
  S: { label: "Sakit", pendek: "S", warna: "bg-sky-600" },
  I: { label: "Izin", pendek: "I", warna: "bg-indigo-600" },
  A: { label: "Alpa", pendek: "A", warna: "bg-red-600" },
  PC: { label: "Pulang cepat", pendek: "PC", warna: "bg-slate-600" },
} as const;
export type KodeAbsen = keyof typeof STATUS_SISWA_ABSEN;
export const KODE_ABSEN = Object.keys(STATUS_SISWA_ABSEN) as KodeAbsen[];

export const STATUS_PEGAWAI_ABSEN = {
  H: "Hadir",
  T: "Terlambat",
  S: "Sakit",
  I: "Izin",
  DL: "Dinas luar",
  C: "Cuti",
} as const;

/** Tanggal hari ini menurut WIB (YYYY-MM-DD) */
export function hariIniWIB() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
export function jamSekarangWIB() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}
/** Senin minggu berjalan (WIB) */
export function awalMingguWIB() {
  const [y, m, d] = hariIniWIB().split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const isoDow = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
  t.setUTCDate(t.getUTCDate() - (isoDow - 1));
  return t.toISOString().slice(0, 10);
}
export function geserTanggal(tgl: string, hari: number) {
  const t = new Date(tgl + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + hari);
  return t.toISOString().slice(0, 10);
}
export function awalBulan(tgl: string) {
  return tgl.slice(0, 8) + "01";
}
export const tanggalValid = (s: string | undefined | null): s is string =>
  Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));

export const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid")
  .refine((v) => v <= hariIniWIB(), "Tanggal tidak boleh melewati hari ini");

export const jamSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM");
