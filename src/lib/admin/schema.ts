import { z } from "zod";

/** Validasi semua formulir admin (dipakai di server sebelum menyimpan). */

const teks = (maks: number, label: string) =>
  z
    .string()
    .trim()
    .max(maks, `${label} maksimal ${maks} karakter`);

const wajib = (min: number, maks: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} wajib diisi (minimal ${min} karakter)`)
    .max(maks, `${label} maksimal ${maks} karakter`);

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid");

export const uuid = z.string().uuid("ID tidak valid");

export function buatSlug(judul: string) {
  return judul
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const profilSchema = z.object({
  slogan: teks(200, "Slogan"),
  pernyataan: teks(600, "Kalimat pembuka"),
  alamat: teks(300, "Alamat"),
  telepon: teks(60, "Telepon"),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Format email tidak valid"),
  jam_layanan: teks(120, "Jam layanan"),
  npsn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{8}$/.test(v), "NPSN harus 8 digit angka"),
  akreditasi: teks(40, "Akreditasi"),
  kepala_sekolah: teks(120, "Nama kepala sekolah"),
  sambutan_kutipan: teks(300, "Kutipan"),
  sambutan_isi: teks(5000, "Isi sambutan"),
  visi: teks(1000, "Visi"),
  misi: teks(3000, "Misi"),
  sejarah: teks(8000, "Sejarah"),
  jumlah_siswa: teks(20, "Jumlah siswa"),
  jumlah_guru: teks(20, "Jumlah guru"),
  jumlah_ekskul: teks(20, "Jumlah ekskul"),
});

/** "YYYY-MM-DDTHH:MM" dari input datetime-local (WIB) → ISO dengan zona +07:00, kosong → null */
export const waktuTayang = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Format waktu tidak valid")
  .transform((v) => (v ? `${v}:00+07:00` : null));

export const beritaSchema = z.object({
  id: uuid.optional(),
  judul: wajib(3, 200, "Judul"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Alamat (slug) hanya boleh huruf kecil, angka, dan tanda -"),
  kategori: wajib(2, 40, "Kategori"),
  tanggal,
  ringkasan: teks(400, "Ringkasan"),
  isi: teks(20000, "Isi berita"),
  status: z.enum(["draft", "diajukan", "terbit"], { message: "Status tidak valid" }),
  tayang_mulai: waktuTayang,
});

export const agendaSchema = z.object({
  id: uuid.optional(),
  judul: wajib(3, 200, "Nama kegiatan"),
  tanggal,
  waktu: teks(60, "Waktu"),
  tempat: teks(120, "Tempat"),
});

export const pengumumanSchema = z.object({
  id: uuid.optional(),
  judul: wajib(3, 200, "Judul"),
  isi: teks(2000, "Isi"),
  tanggal,
  penting: z.boolean(),
  aktif: z.boolean(),
  tayang_mulai: waktuTayang,
  tayang_selesai: waktuTayang,
}).refine((d) => !d.tayang_mulai || !d.tayang_selesai || d.tayang_selesai > d.tayang_mulai, { path: ["tayang_selesai"], message: "Harus setelah waktu mulai" });

export const fotoSchema = z.object({
  id: uuid.optional(),
  judul: wajib(2, 200, "Keterangan foto"),
  urutan: z.coerce.number().int("Urutan harus angka bulat").min(0).max(9999),
});

export const TIPE_GAMBAR = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAKS_GAMBAR = 4 * 1024 * 1024; // 4 MB (batas Vercel 4,5 MB per permintaan)

export function cekGambar(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!(TIPE_GAMBAR as readonly string[]).includes(file.type)) return "Foto harus berformat JPG, PNG, atau WEBP";
  if (file.size > MAKS_GAMBAR) return "Ukuran foto maksimal 4 MB";
  return null;
}

/** Periksa isi file benar-benar gambar (bukan sekadar nama/ekstensi). */
export function jenisGambarDariIsi(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  )
    return "image/webp";
  return null;
}

/** Ubah error zod menjadi { namaKolom: pesan } */
export function pesanError(err: z.ZodError) {
  const hasil: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!hasil[k]) hasil[k] = i.message;
  }
  return hasil;
}
