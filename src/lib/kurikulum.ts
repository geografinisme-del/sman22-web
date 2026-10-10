import { z } from "zod";

/* Modul Kurikulum — label & validasi (browser + server) */

export const TINGKAT = ["X", "XI", "XII"] as const;
export type Tingkat = (typeof TINGKAT)[number];
export const faseTingkat = (t: string) => (t === "X" ? "E" : "F");

export const KELOMPOK = { umum: "Umum (wajib)", pilihan: "Pilihan", mulok: "Muatan lokal" } as const;

export const JENIS_PERANGKAT = {
  prota: "Program Tahunan (Prota)",
  promes: "Program Semester (Promes)",
  atp: "Alur Tujuan Pembelajaran (ATP)",
  modul_ajar: "Modul Ajar",
  bahan_ajar: "Bahan Ajar",
  asesmen: "Instrumen Asesmen",
  lainnya: "Lainnya",
} as const;
export type JenisPerangkat = keyof typeof JENIS_PERANGKAT;

export const STATUS_PERANGKAT: Record<string, { label: string; warna: string }> = {
  draf: { label: "Draf", warna: "bg-black/5 text-black/60 ring-black/10" },
  diajukan: { label: "Diperiksa", warna: "bg-sky-50 text-sky-900 ring-sky-200" },
  revisi: { label: "Perlu revisi", warna: "bg-amber-50 text-amber-900 ring-amber-200" },
  disetujui: { label: "Disetujui", warna: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  belum: { label: "Belum ada", warna: "bg-red-50 text-red-800 ring-red-200" },
};

export const DIMENSI = {
  keimanan: "Keimanan & ketakwaan",
  kewargaan: "Kewargaan",
  penalaran_kritis: "Penalaran kritis",
  kreativitas: "Kreativitas",
  kolaborasi: "Kolaborasi",
  kemandirian: "Kemandirian",
  kesehatan: "Kesehatan",
  komunikasi: "Komunikasi",
} as const;
export type Dimensi = keyof typeof DIMENSI;

export const TEMA_KOKURIKULER = [
  "Gaya Hidup Berkelanjutan",
  "Kearifan Lokal",
  "Bhinneka Tunggal Ika",
  "Bangunlah Jiwa dan Raganya",
  "Suara Demokrasi",
  "Berekayasa dan Berteknologi untuk Membangun NKRI",
  "Kewirausahaan",
  "Lainnya",
];

/** Instrumen supervisi akademik (skor 1–4 per butir; nilai = rata-rata × 25) */
export const INSTRUMEN_SUPERVISI: { bagian: string; butir: { kode: string; teks: string }[] }[] = [
  {
    bagian: "Perencanaan",
    butir: [
      { kode: "p1", teks: "Modul ajar memuat tujuan pembelajaran yang jelas dan sesuai ATP" },
      { kode: "p2", teks: "Langkah pembelajaran berpusat pada peserta didik & berdiferensiasi" },
      { kode: "p3", teks: "Rencana asesmen (diagnostik, formatif, sumatif) & KKTP tersedia" },
    ],
  },
  {
    bagian: "Pelaksanaan",
    butir: [
      { kode: "l1", teks: "Membuka pembelajaran: apersepsi & menyampaikan tujuan" },
      { kode: "l2", teks: "Menguasai materi dan mengaitkan dengan kehidupan nyata" },
      { kode: "l3", teks: "Menerapkan model/strategi aktif (diskusi, proyek, inkuiri)" },
      { kode: "l4", teks: "Memanfaatkan media & teknologi (papan interaktif, materi digital)" },
      { kode: "l5", teks: "Mengelola kelas dan melibatkan seluruh peserta didik" },
      { kode: "l6", teks: "Menutup pembelajaran: refleksi & tindak lanjut" },
    ],
  },
  {
    bagian: "Asesmen",
    butir: [
      { kode: "a1", teks: "Melakukan asesmen formatif selama pembelajaran" },
      { kode: "a2", teks: "Memberi umpan balik yang membangun" },
    ],
  },
];
export const SKALA_SKOR = { 1: "Perlu bimbingan", 2: "Cukup", 3: "Baik", 4: "Sangat baik" } as const;
export const predikatSupervisi = (n: number | null) =>
  n == null ? "—" : n >= 91 ? "Sangat baik" : n >= 76 ? "Baik" : n >= 61 ? "Cukup" : "Perlu pembinaan";

/* ---------------- Slide materi digital ---------------- */
const teksSlide = z.string().trim().max(3000).default("");
export const slideSchema = z.discriminatedUnion("jenis", [
  z.object({ jenis: z.literal("isi"), judul: z.string().trim().max(150).default(""), isi: teksSlide }),
  z.object({ jenis: z.literal("gambar"), judul: z.string().trim().max(150).default(""), url: z.string().trim().regex(/^https:\/\/\S+$/, "URL gambar harus https://").max(500), isi: teksSlide }),
  z.object({ jenis: z.literal("video"), judul: z.string().trim().max(150).default(""), url: z.string().trim().regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\/\S+$/, "Tautan video YouTube").max(500) }),
  z.object({
    jenis: z.literal("soal"),
    judul: z.string().trim().max(150).default(""),
    pertanyaan: z.string().trim().min(3).max(1000),
    pilihan: z.array(z.string().trim().max(300)).min(2).max(5),
    kunci: z.number().int().min(0).max(4),
    pembahasan: z.string().trim().max(1000).default(""),
  }),
]);
export type Slide = z.infer<typeof slideSchema>;
export const slidesSchema = z.array(slideSchema).max(60);

/** ID video YouTube dari tautan (untuk embed youtube-nocookie) */
export function idYoutube(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

/** Semester berjalan menurut bulan (Juli–Desember = 1) */
export const semesterSekarang = (tgl: string) => (Number(tgl.slice(5, 7)) >= 7 ? 1 : 2);
