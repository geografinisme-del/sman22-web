import { z } from "zod";

/* Kalender kegiatan sekolah — label, warna, validasi (dipakai di browser & server) */

export const JENIS_KEGIATAN = {
  akademik: { label: "Akademik", warna: "bg-sky-100 text-sky-900 ring-sky-200", titik: "bg-sky-500" },
  ujian: { label: "Ujian / asesmen", warna: "bg-amber-100 text-amber-900 ring-amber-200", titik: "bg-amber-500" },
  kegiatan: { label: "Kegiatan", warna: "bg-emerald-100 text-emerald-900 ring-emerald-200", titik: "bg-emerald-500" },
  rapat: { label: "Rapat", warna: "bg-violet-100 text-violet-900 ring-violet-200", titik: "bg-violet-500" },
  libur: { label: "Libur", warna: "bg-red-100 text-red-900 ring-red-200", titik: "bg-red-500" },
} as const;
export type JenisKegiatan = keyof typeof JENIS_KEGIATAN;

export const SASARAN = {
  umum: "Umum — tampil di website",
  warga: "Warga sekolah — guru, siswa & orang tua (perlu login)",
  pegawai: "Guru & pegawai saja",
} as const;
export type Sasaran = keyof typeof SASARAN;

export type Kegiatan = {
  id: string;
  judul: string;
  jenis: JenisKegiatan;
  mulai: string;
  selesai: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  lokasi: string;
  keterangan: string;
  sasaran: Sasaran;
  kbm_libur: boolean;
};
export const KOLOM_KEGIATAN = "id, judul, jenis, mulai, selesai, jam_mulai, jam_selesai, lokasi, keterangan, sasaran, kbm_libur";

const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid").refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid");
const jam = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM")]);

export const kegiatanSchema = z
  .object({
    judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
    jenis: z.enum(Object.keys(JENIS_KEGIATAN) as [JenisKegiatan, ...JenisKegiatan[]]),
    mulai: tgl,
    selesai: z.union([z.literal(""), tgl]),
    jam_mulai: jam,
    jam_selesai: jam,
    lokasi: z.string().trim().max(150),
    keterangan: z.string().trim().max(1000),
    sasaran: z.enum(Object.keys(SASARAN) as [Sasaran, ...Sasaran[]]),
    kbm_libur: z.boolean(),
  })
  .transform((d) => ({ ...d, selesai: d.selesai || d.mulai, jam_mulai: d.jam_mulai || null, jam_selesai: d.jam_selesai || null }))
  .refine((d) => d.selesai >= d.mulai, { path: ["selesai"], message: "Harus sama atau setelah tanggal mulai" })
  .refine((d) => (Date.parse(d.selesai) - Date.parse(d.mulai)) / 864e5 <= 92, { path: ["selesai"], message: "Maksimal 3 bulan" })
  .refine((d) => !d.jam_mulai || !d.jam_selesai || d.jam_selesai > d.jam_mulai, { path: ["jam_selesai"], message: "Harus setelah jam mulai" });

/** "Senin, 3 Nov" atau "3–7 Nov 2026" */
export function rentangTanggal(mulai: string, selesai: string) {
  const f = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", { timeZone: "UTC", ...o });
  if (mulai === selesai) return f(mulai, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const samaBulan = mulai.slice(0, 7) === selesai.slice(0, 7);
  return samaBulan
    ? `${f(mulai, { day: "numeric" })}–${f(selesai, { day: "numeric", month: "long", year: "numeric" })}`
    : `${f(mulai, { day: "numeric", month: "short" })} – ${f(selesai, { day: "numeric", month: "short", year: "numeric" })}`;
}

export const jamKegiatan = (k: Pick<Kegiatan, "jam_mulai" | "jam_selesai">) =>
  k.jam_mulai ? `${k.jam_mulai.slice(0, 5)}${k.jam_selesai ? `–${k.jam_selesai.slice(0, 5)}` : ""}` : "";
