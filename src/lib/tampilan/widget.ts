/**
 * Registri widget publik. Widget hanya MENGATUR cara konten tampil (judul, jumlah item, tata letak, gerak);
 * isinya selalu diambil dari modul sumber (berita, pengumuman, agenda, galeri, katalog, profil) —
 * tidak ada konten yang digandakan ke konfigurasi. Menghapus widget dari halaman tidak menghapus data sumber.
 * Widget dasbor pribadi TIDAK terdaftar di sini (daftar & izin terpisah).
 */
import { z } from "zod";

/** Area penempatan yang didukung. "global" = elemen mengambang/overlay di semua halaman publik. */
export type Area = "beranda" | "global";

const judul = z.string().trim().max(80).catch("");
const jumlah = (min: number, maks: number, bawaan: number) => z.number().int().min(min).max(maks).catch(bawaan);
const pilihan = <T extends [string, ...string[]]>(nilai: T, bawaan: T[number]) => z.enum(nilai).catch(bawaan);

export const DEFINISI_WIDGET = {
  hero: {
    label: "Pembuka / slideshow",
    sumber: "Slide & teks pembuka (Tampilan Website)",
    area: "beranda",
    instans: "satu",
    wajib: true,
    kosong: "Foto bawaan sekolah dipakai bila belum ada slide.",
    skema: z.object({ tata: pilihan(["berdampingan", "penuh", "panel", "majalah"], "majalah") }),
  },
  pengumuman: {
    label: "Pengumuman",
    sumber: "Pengumuman aktif",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Menampilkan “Belum ada pengumuman terbaru.”",
    skema: z.object({ judul, jumlah: jumlah(1, 6, 3) }),
  },
  layanan: {
    label: "Akses layanan",
    sumber: "Daftar Akses layanan (Tema & Tampilan)",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Disembunyikan bila daftar kosong.",
    skema: z.object({ judul, jumlah: jumlah(2, 8, 6), tata: pilihan(["kisi", "daftar"], "kisi") }),
  },
  profil: {
    label: "Profil / sambutan",
    sumber: "Profil sekolah",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Hanya fakta yang sudah diisi yang tampil.",
    skema: z.object({ judul, tata: pilihan(["foto-kiri", "foto-kanan"], "foto-kiri"), paralaks: z.boolean().catch(true) }),
  },
  berita: {
    label: "Berita",
    sumber: "Berita terbit",
    area: "beranda",
    instans: "banyak",
    wajib: false,
    kosong: "Menampilkan “Belum ada berita yang diterbitkan.”",
    skema: z.object({ judul, jumlah: jumlah(1, 7, 4), kategori: z.string().trim().max(40).catch(""), tata: pilihan(["utama-pendamping", "daftar"], "utama-pendamping") }),
  },
  angka: {
    label: "Pita angka sekolah",
    sumber: "Profil sekolah (tahun berdiri, jumlah siswa, guru, ekskul, alumni PTN)",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Disembunyikan bila kurang dari dua angka terisi.",
    skema: z.object({}),
  },
  spmb: {
    label: "SPMB",
    sumber: "Pengaturan SPMB (Admin → SPMB)",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Tampil hanya bila SPMB diaktifkan.",
    skema: z.object({ judul }),
  },
  prestasi: {
    label: "Prestasi & alumni",
    sumber: "Tabel prestasi + angka alumni PTN (profil); tema lain: berita kategori Prestasi",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Disembunyikan bila belum ada prestasi atau angka alumni.",
    skema: z.object({ judul, jumlah: jumlah(2, 8, 4) }),
  },
  agenda: {
    label: "Agenda",
    sumber: "Agenda & kalender umum",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Menampilkan “Belum ada agenda terjadwal.”",
    skema: z.object({ judul, jumlah: jumlah(1, 8, 4) }),
  },
  program: {
    label: "Program sekolah",
    sumber: "Program unggulan (7KAIH, Pancawaluya, dll.)",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Program unggulan selalu tersedia.",
    skema: z.object({ judul, tata: pilihan(["sorot", "daftar"], "sorot") }),
  },
  galeri: {
    label: "Galeri & kehidupan siswa",
    sumber: "Galeri foto + ekskul",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Disembunyikan bila belum ada foto.",
    skema: z.object({ judul, jumlah: jumlah(3, 8, 4), tata: pilihan(["mozaik", "kisi"], "mozaik"), ekskul: z.boolean().catch(true) }),
  },
  perpus: {
    label: "Pencarian e-library",
    sumber: "Katalog perpustakaan",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Kolom cari tetap tampil; rekomendasi disembunyikan bila belum ada.",
    skema: z.object({ judul, rekomendasi: jumlah(0, 6, 4) }),
  },
  kontak: {
    label: "Kontak & lokasi",
    sumber: "Profil sekolah (kontak)",
    area: "beranda",
    instans: "satu",
    wajib: false,
    kosong: "Menampilkan “Kontak resmi sedang dilengkapi.”",
    skema: z.object({ judul, peta: z.boolean().catch(true) }),
  },
} as const;

export type JenisWidget = keyof typeof DEFINISI_WIDGET;
export const JENIS_WIDGET = Object.keys(DEFINISI_WIDGET) as JenisWidget[];

export type WidgetInstans = {
  id: string;
  jenis: JenisWidget;
  tampil: boolean;
  pengaturan: Record<string, unknown>;
};

/** Pengaturan bawaan suatu jenis widget (hasil skema dengan objek kosong). */
export const pengaturanBawaan = (jenis: JenisWidget) => DEFINISI_WIDGET[jenis].skema.parse({}) as Record<string, unknown>;

/** Susunan beranda bawaan (urutan sesuai panduan isi beranda). */
export const SUSUNAN_BAWAAN: WidgetInstans[] = (
  ["hero", "angka", "berita", "pengumuman", "agenda", "spmb", "prestasi", "galeri", "program", "layanan", "kontak", "profil", "perpus"] as JenisWidget[]
).map((jenis) => ({ id: jenis, jenis, tampil: jenis !== "perpus" && jenis !== "profil", pengaturan: pengaturanBawaan(jenis) }));

/** Widget berpasangan: bila bersebelahan & keduanya tampil, dirender dalam satu bagian dua kolom. */
export const PASANGAN: [JenisWidget, JenisWidget][] = [
  ["pengumuman", "layanan"],
  ["berita", "agenda"],
  ["pengumuman", "agenda"],
  ["galeri", "program"],
  ["layanan", "kontak"],
];
