import { z } from "zod";

/* =====================================================================
   Jadwal pelajaran — tipe, aturan, dan pembuat jam pelajaran otomatis
   (dipakai di browser DAN server)
   ===================================================================== */

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
export const namaHari = (h: number) => HARI[h] ?? "";

export const JENIS_JAM = {
  pelajaran: "Pelajaran",
  istirahat: "Istirahat",
  ibadah: "Ibadah / Ishoma",
  upacara: "Upacara",
  kegiatan: "Kegiatan (literasi, tadarus, dll.)",
} as const;
export type JenisJam = keyof typeof JENIS_JAM;

export const JENIS_PERUBAHAN = {
  pengganti: "Guru pengganti",
  tugas: "Tugas mandiri (diawasi piket)",
  ditiadakan: "Ditiadakan / kosong",
  pindah_ruang: "Pindah ruang",
} as const;
export type JenisPerubahan = keyof typeof JENIS_PERUBAHAN;

export type Jam = { hari: number; urutan: number; jenis: JenisJam; jp_ke: number | null; jam_mulai: string; jam_selesai: string; label: string };
export type Entri = {
  id: string;
  hari: number;
  jp_ke: number;
  kelas_id: string;
  kelas: string;
  mapel: string;
  kode_mapel: string;
  guru: string | null;
  pegawai_id: string | null;
  ruang: string | null;
  ruang_id: string | null;
};
export type Perubahan = {
  id: string;
  jadwal_id: string;
  tanggal: string;
  jenis: JenisPerubahan;
  pegawai_pengganti_id: string | null;
  ruang_id: string | null;
  catatan: string;
};

export const jamPendek = (t: string) => t.slice(0, 5);

/* ---------------------- Pembuat jam otomatis ---------------------- */

const jam = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM");
export const jedaSchema = z.object({
  setelah: z.coerce.number().int().min(0).max(15),
  menit: z.coerce.number().int().min(5).max(120),
  jenis: z.enum(["istirahat", "ibadah", "kegiatan"]),
  label: z.string().trim().max(60).default(""),
});
export const polaJamSchema = z.object({
  hari: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Pilih minimal satu hari"),
  masuk: jam,
  durasi: z.coerce.number().int().min(20).max(90),
  jumlah: z.coerce.number().int().min(1).max(15),
  awal_jenis: z.enum(["", "upacara", "kegiatan"]).default(""),
  awal_menit: z.coerce.number().int().min(0).max(120).default(0),
  awal_label: z.string().trim().max(60).default(""),
  jeda: z.array(jedaSchema).max(5).default([]),
});
export type PolaJam = z.infer<typeof polaJamSchema>;
export type BarisJam = { jenis: JenisJam; jam_mulai: string; jam_selesai: string; label: string };

const keMenit = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const keJam = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Susun daftar jam satu hari: kegiatan awal, JP berdurasi tetap, dan jeda setelah JP tertentu. */
export function buatJam(p: Omit<PolaJam, "hari">): BarisJam[] {
  const hasil: BarisJam[] = [];
  let t = keMenit(p.masuk);
  const tambah = (jenis: JenisJam, menit: number, label = "") => {
    if (t + menit > 23 * 60 + 59) throw new Error("Jam melewati tengah malam. Kurangi jumlah JP atau durasi.");
    hasil.push({ jenis, jam_mulai: keJam(t), jam_selesai: keJam(t + menit), label });
    t += menit;
  };
  if (p.awal_jenis && p.awal_menit > 0) tambah(p.awal_jenis, p.awal_menit, p.awal_label || JENIS_JAM[p.awal_jenis]);
  const jeda = [...p.jeda].sort((a, b) => a.setelah - b.setelah);
  for (const j of jeda.filter((j) => j.setelah === 0)) tambah(j.jenis, j.menit, j.label || JENIS_JAM[j.jenis]);
  for (let i = 1; i <= p.jumlah; i++) {
    tambah("pelajaran", p.durasi);
    for (const j of jeda.filter((j) => j.setelah === i && i < p.jumlah)) tambah(j.jenis, j.menit, j.label || JENIS_JAM[j.jenis]);
  }
  return hasil;
}

/* ---------------------- Tempel penugasan dari Excel ---------------------- */

export type BarisTempel = { baris: number; kelas: string; mapel: string; guru: string; jp: number };

/** Baris dari Excel/Sheets (dipisah TAB) atau CSV: Kelas | Mapel | Guru (nama/NIP) | JP per minggu */
export function uraiTempel(teks: string): { data: BarisTempel[]; galat: string[] } {
  const data: BarisTempel[] = [];
  const galat: string[] = [];
  teks
    .split(/\r?\n/)
    .map((l) => l.trim())
    .forEach((l, i) => {
      if (!l) return;
      const kol = (l.includes("\t") ? l.split("\t") : l.split(/[;,]/)).map((k) => k.trim().replace(/^"|"$/g, ""));
      if (i === 0 && /kelas/i.test(kol[0]) && /mapel|pelajaran/i.test(kol[1] ?? "")) return; // baris judul
      const [kelas = "", mapel = "", guru = "", jpTeks = ""] = kol;
      const jp = Number(jpTeks.replace(",", "."));
      if (!kelas || !mapel) return galat.push(`Baris ${i + 1}: kelas dan mapel wajib diisi`);
      if (jpTeks && (!Number.isInteger(jp) || jp < 0 || jp > 20)) return galat.push(`Baris ${i + 1}: JP harus angka 0–20`);
      data.push({ baris: i + 1, kelas, mapel, guru, jp: jpTeks ? jp : 2 });
    });
  return { data, galat };
}

/** Kunci pencocokan nama (huruf kecil, tanpa gelar umum & tanda baca) */
export function kunciNama(s: string) {
  return s
    .toLowerCase()
    .replace(/,.*$/, "") // buang gelar di belakang koma
    .replace(/\b(drs?|dra|hj?|ir|prof)\.?\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}
