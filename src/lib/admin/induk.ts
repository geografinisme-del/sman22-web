import { z } from "zod";

/* =====================================================================
   Validasi & normalisasi Data Induk (dipakai di browser DAN server)
   ===================================================================== */

const opsional = (maks: number, label: string) => z.string().trim().max(maks, `${label} maksimal ${maks} karakter`);
const uuidAtauKosong = z.union([z.literal(""), z.string().uuid()]);
const tanggalAtauKosong = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Tanggal tidak valid (format YYYY-MM-DD)");
const emailAtauKosong = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Format email tidak valid");

export const STATUS_SISWA = ["aktif", "lulus", "mutasi", "keluar", "nonaktif"] as const;
export const STATUS_PEGAWAI = ["aktif", "nonaktif", "mutasi", "pensiun"] as const;
export const TINGKAT = ["X", "XI", "XII"] as const;
export const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"] as const;

export const tahunAjaranSchema = z
  .object({
    id: z.string().uuid().optional(),
    nama: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran: 2026/2027"),
    semester: z.enum(["ganjil", "genap"]),
    tanggal_mulai: tanggalAtauKosong,
    tanggal_selesai: tanggalAtauKosong,
  })
  .refine((d) => {
    const [a, b] = d.nama.split("/").map(Number);
    return b === a + 1;
  }, { message: "Tahun kedua harus satu tahun setelah tahun pertama (mis. 2026/2027)", path: ["nama"] })
  .refine((d) => !d.tanggal_mulai || !d.tanggal_selesai || d.tanggal_selesai > d.tanggal_mulai, {
    message: "Tanggal selesai harus setelah tanggal mulai",
    path: ["tanggal_selesai"],
  });

export const kelasSchema = z.object({
  id: z.string().uuid().optional(),
  tahun_ajaran_id: z.string().uuid("Pilih tahun ajaran"),
  tingkat: z.enum(TINGKAT, { message: "Pilih tingkat" }),
  nama: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Nama kelas wajib diisi")
    .max(30)
    .regex(/^[A-Z0-9 .\-]+$/, "Nama kelas hanya huruf, angka, spasi, titik, atau tanda -")
    .transform((v) => namaKelasBaku(v)),
  program: opsional(60, "Program"),
  wali_kelas_id: uuidAtauKosong,
});

export const siswaSchema = z.object({
  id: z.string().uuid().optional(),
  nisn: z.string().trim().refine((v) => v === "" || /^\d{10}$/.test(v), "NISN harus 10 digit angka"),
  nis: opsional(20, "NIS"),
  nama: z.string().trim().min(2, "Nama wajib diisi").max(150),
  jenis_kelamin: z.enum(["", "L", "P"]),
  tempat_lahir: opsional(80, "Tempat lahir"),
  tanggal_lahir: tanggalAtauKosong,
  agama: opsional(30, "Agama"),
  alamat: opsional(300, "Alamat"),
  telepon: opsional(30, "Telepon"),
  email: emailAtauKosong,
  tahun_masuk: z.string().trim().refine((v) => v === "" || (/^\d{4}$/.test(v) && +v >= 1989 && +v <= 2100), "Tahun masuk tidak valid"),
  status: z.enum(STATUS_SISWA),
  keterangan_status: opsional(300, "Keterangan"),
  kelas_id: uuidAtauKosong,
});

export const pegawaiSchema = z.object({
  id: z.string().uuid().optional(),
  nama: z.string().trim().min(2, "Nama wajib diisi").max(150),
  nip: z.string().trim().refine((v) => v === "" || /^\d{18}$/.test(v), "NIP harus 18 digit angka"),
  nuptk: z.string().trim().refine((v) => v === "" || /^\d{16}$/.test(v), "NUPTK harus 16 digit angka"),
  jenis_kelamin: z.enum(["", "L", "P"]),
  jenis: z.enum(["guru", "tendik"]),
  jabatan: opsional(100, "Jabatan"),
  telepon: opsional(30, "Telepon"),
  email: emailAtauKosong,
  status: z.enum(STATUS_PEGAWAI),
});

export const ortuSchema = z.object({
  siswa_id: z.string().uuid(),
  nama: z.string().trim().min(2, "Nama wajib diisi").max(150),
  hubungan: z.enum(["ayah", "ibu", "wali"]),
  telepon: opsional(30, "Telepon"),
  pekerjaan: opsional(80, "Pekerjaan"),
});

/* =====================================================================
   IMPOR: definisi kolom, sinonim header (termasuk format Dapodik), normalisasi
   ===================================================================== */

export type KolomImpor = { kunci: string; label: string; wajib?: boolean; sinonim: string[]; contoh: string };

export const KOLOM_SISWA: KolomImpor[] = [
  { kunci: "nama", label: "Nama", wajib: true, sinonim: ["nama", "nama siswa", "nama peserta didik", "nama lengkap"], contoh: "Ahmad Fauzi" },
  { kunci: "nisn", label: "NISN", sinonim: ["nisn"], contoh: "0081234567" },
  { kunci: "nis", label: "NIS / NIPD", sinonim: ["nis", "nipd", "nomor induk"], contoh: "232410001" },
  { kunci: "jenis_kelamin", label: "Jenis kelamin (L/P)", sinonim: ["jk", "jenis kelamin", "l/p", "gender"], contoh: "L" },
  { kunci: "tempat_lahir", label: "Tempat lahir", sinonim: ["tempat lahir"], contoh: "Bandung" },
  { kunci: "tanggal_lahir", label: "Tanggal lahir", sinonim: ["tanggal lahir", "tgl lahir", "tgl. lahir"], contoh: "2009-05-17" },
  { kunci: "agama", label: "Agama", sinonim: ["agama"], contoh: "Islam" },
  { kunci: "kelas", label: "Kelas / Rombel", sinonim: ["kelas", "rombel", "rombel saat ini", "rombongan belajar"], contoh: "X-1" },
  { kunci: "tahun_masuk", label: "Tahun masuk", sinonim: ["tahun masuk", "angkatan"], contoh: "2026" },
  { kunci: "alamat", label: "Alamat", sinonim: ["alamat", "alamat jalan"], contoh: "Jl. Contoh No. 1" },
  { kunci: "telepon", label: "No. HP siswa", sinonim: ["hp", "no hp", "telepon", "nomor hp", "no. hp"], contoh: "081234567890" },
  { kunci: "nama_ayah", label: "Nama ayah", sinonim: ["nama ayah", "ayah"], contoh: "Budi" },
  { kunci: "nama_ibu", label: "Nama ibu", sinonim: ["nama ibu", "ibu", "nama ibu kandung"], contoh: "Siti" },
  { kunci: "telepon_ortu", label: "No. HP orang tua", sinonim: ["hp ortu", "no hp orang tua", "telepon orang tua", "hp orang tua"], contoh: "081298765432" },
];

export const KOLOM_PEGAWAI: KolomImpor[] = [
  { kunci: "nama", label: "Nama", wajib: true, sinonim: ["nama", "nama lengkap", "nama ptk", "nama pegawai", "nama guru"], contoh: "Dra. Contoh, M.Pd." },
  { kunci: "nip", label: "NIP", sinonim: ["nip"], contoh: "197001012000031001" },
  { kunci: "nuptk", label: "NUPTK", sinonim: ["nuptk"], contoh: "1234567890123456" },
  { kunci: "jenis_kelamin", label: "Jenis kelamin (L/P)", sinonim: ["jk", "jenis kelamin", "l/p"], contoh: "P" },
  { kunci: "jenis", label: "Jenis (guru/tendik)", sinonim: ["jenis", "jenis ptk", "kategori"], contoh: "guru" },
  { kunci: "jabatan", label: "Jabatan / tugas", sinonim: ["jabatan", "tugas tambahan", "jabatan ptk"], contoh: "Guru Geografi" },
  { kunci: "telepon", label: "No. HP", sinonim: ["hp", "no hp", "telepon", "nomor hp"], contoh: "081234567890" },
  { kunci: "email", label: "Email", sinonim: ["email", "e-mail", "surel"], contoh: "guru@sekolah.sch.id" },
];

const rapikan = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();

/** Cari baris header (Dapodik biasanya punya beberapa baris judul di atasnya). */
export function cariBarisHeader(baris: unknown[][], kolom: KolomImpor[]) {
  let terbaik = 0, skor = -1;
  baris.slice(0, 20).forEach((r, i) => {
    const sel = r.map((c) => rapikan(String(c ?? "")));
    const s = kolom.filter((k) => sel.some((c) => k.sinonim.includes(c))).length;
    if (s > skor) { skor = s; terbaik = i; }
  });
  return terbaik;
}

/** Tebak kolom sumber untuk tiap isian (berdasarkan sinonim header). */
export function tebakPemetaan(header: string[], kolom: KolomImpor[]) {
  const hasil: Record<string, number> = {};
  const h = header.map((x) => rapikan(String(x ?? "")));
  for (const k of kolom) {
    const idx = h.findIndex((c) => k.sinonim.includes(c));
    if (idx >= 0) hasil[k.kunci] = idx;
  }
  return hasil;
}

function keTanggal(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const d = new Date(v.getTime() - v.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{5}$/.test(s)) {
    // nomor seri tanggal Excel
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 864e5);
    return d.toISOString().slice(0, 10);
  }
  return s; // biarkan; validasi akan menandai
}

function keJK(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (["l", "laki-laki", "laki laki", "pria", "lk"].includes(s)) return "L";
  if (["p", "perempuan", "wanita", "pr"].includes(s)) return "P";
  return s.toUpperCase();
}

function keDigit(v: unknown, panjang: number) {
  if (typeof v === "number" && v >= 1e15) {
    // angka ≥16 digit yang disimpan sebagai Number di Excel sudah kehilangan ketelitian
    return { nilai: "", diperbaiki: false, rusak: true };
  }
  let s = String(v ?? "").replace(/\s|'/g, "").replace(/\.0+$/, "");
  if (!s) return { nilai: "", diperbaiki: false, rusak: false };
  if (/^\d+$/.test(s) && s.length < panjang && s.length >= panjang - 3) {
    // Excel sering menghapus angka 0 di depan (mis. NISN 0081234567 → 81234567)
    return { nilai: s.padStart(panjang, "0"), diperbaiki: true, rusak: false };
  }
  s = s.replace(/\D/g, "") || s;
  return { nilai: s, diperbaiki: false, rusak: false };
}

export type BarisImpor = Record<string, string>;

/** Ubah baris mentah menjadi objek bersih sesuai pemetaan. */
export function normalisasiBaris(
  mentah: unknown[],
  pemetaan: Record<string, number>,
  jenis: "siswa" | "pegawai",
): { data: BarisImpor; catatan: string[]; galat: string[] } {
  const kolom = jenis === "siswa" ? KOLOM_SISWA : KOLOM_PEGAWAI;
  const data: BarisImpor = {};
  const catatan: string[] = [];
  const galat: string[] = [];
  const rusak = (label: string) =>
    galat.push(`${label} tersimpan sebagai angka di Excel sehingga digit terakhir hilang. Ubah format kolom ${label} menjadi Teks lalu ketik ulang/ekspor ulang.`);
  for (const k of kolom) {
    const idx = pemetaan[k.kunci];
    const v = idx == null || idx < 0 ? "" : mentah[idx];
    if (k.kunci === "tanggal_lahir") data[k.kunci] = keTanggal(v);
    else if (k.kunci === "jenis_kelamin") data[k.kunci] = keJK(v);
    else if (k.kunci === "nisn") {
      const r = keDigit(v, 10);
      data.nisn = r.nilai;
      if (r.diperbaiki) catatan.push("NISN dilengkapi angka 0 di depan");
    } else if (k.kunci === "nip") {
      const r = keDigit(v, 18);
      data.nip = r.nilai;
      if (r.rusak) rusak("NIP");
    } else if (k.kunci === "nuptk") {
      const r = keDigit(v, 16);
      data.nuptk = r.nilai;
      if (r.rusak) rusak("NUPTK");
    }
    else if (k.kunci === "jenis") {
      const s = String(v ?? "").toLowerCase();
      data.jenis = s.includes("tendik") || s.includes("tenaga") || s.includes("staf") || s.includes("tu") ? "tendik" : "guru";
    } else if (k.kunci === "tahun_masuk") data.tahun_masuk = String(v ?? "").replace(/\D/g, "").slice(0, 4);
    else if (k.kunci === "agama") {
      const s = String(v ?? "").trim();
      data.agama = s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
    } else data[k.kunci] = String(v ?? "").replace(/\s+/g, " ").trim();
  }
  return { data, catatan, galat };
}

export const imporSiswaBaris = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(150, "Nama terlalu panjang"),
  nisn: z.string().refine((v) => v === "" || /^\d{10}$/.test(v), "NISN harus 10 digit"),
  nis: z.string().max(20, "NIS terlalu panjang"),
  jenis_kelamin: z.enum(["", "L", "P"], { message: "Jenis kelamin harus L atau P" }),
  tempat_lahir: z.string().max(80),
  tanggal_lahir: z
    .string()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v >= "1990-01-01" && v <= new Date().toISOString().slice(0, 10)), "Tanggal lahir tidak valid"),
  agama: z.string().max(30),
  kelas: z.string().max(30, "Nama kelas terlalu panjang"),
  tahun_masuk: z.string().refine((v) => v === "" || (+v >= 1989 && +v <= 2100), "Tahun masuk tidak valid"),
  alamat: z.string().max(300),
  telepon: z.string().max(30),
  nama_ayah: z.string().max(150),
  nama_ibu: z.string().max(150),
  telepon_ortu: z.string().max(30),
});

export const imporPegawaiBaris = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(150),
  nip: z.string().refine((v) => v === "" || /^\d{18}$/.test(v), "NIP harus 18 digit"),
  nuptk: z.string().refine((v) => v === "" || /^\d{16}$/.test(v), "NUPTK harus 16 digit"),
  jenis_kelamin: z.enum(["", "L", "P"], { message: "Jenis kelamin harus L atau P" }),
  jenis: z.enum(["guru", "tendik"]),
  jabatan: z.string().max(100),
  telepon: z.string().max(30),
  email: z.string().refine((v) => v === "" || z.string().email().safeParse(v).success, "Email tidak valid"),
});

/** Kunci pembanding kelas: "X 2", "X.2", "10-2", "x-2" dianggap sama */
export const kunciKelas = (s: string) => namaKelasBaku(s).replace(/[^A-Z0-9]/g, "");

/** "x 2", "X.2", "10-2" → "X-2" (sama dengan fungsi nama_kelas_baku di database) */
export function namaKelasBaku(nama: string) {
  const n = nama.trim().toUpperCase();
  const m = n.match(/^(XII|XI|X|12|11|10)/);
  if (!m) return n;
  const tk = { "12": "XII", "11": "XI", "10": "X" }[m[1]] ?? m[1];
  const sisa = n.slice(m[1].length).replace(/^[^A-Z0-9]+/, "");
  return sisa ? `${tk}-${sisa}` : tk;
}

/** CSV aman untuk Excel (dengan BOM, tanda kutip, dan pencegahan formula injection). */
export function keCsv(header: string[], baris: (string | number | null | undefined)[][]) {
  const sel = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // pemisah ";" — Excel berbahasa Indonesia memakai titik koma sehingga tiap nilai masuk kolomnya sendiri
  return "﻿" + [header, ...baris].map((r) => r.map(sel).join(";")).join("\r\n");
}
