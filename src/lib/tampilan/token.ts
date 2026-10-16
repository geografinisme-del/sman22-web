/**
 * Token visual tema publik: palet, font, tingkat gerak, dan tema terdaftar.
 * Tema hanya mengubah TAMPILAN (variabel CSS, tata letak widget) — tidak pernah data, izin, atau fungsi modul.
 * Dasbor admin tidak memakai token ini, sehingga pergantian tema tidak mengubah kebiasaan kerja staf.
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */

/** Palet terkurasi dari warna logo resmi (merah mahkota, biru dongker cincin, biru langit sayap). */
export const PALET = {
  merah: { label: "Merah logo", utama: "#b3123c", aksen: "#db224c", gelap: "#1f2328" },
  dongker: { label: "Biru dongker logo", utama: "#3b5070", aksen: "#b3123c", gelap: "#1f2328" },
  langit: { label: "Biru langit logo", utama: "#0f6a9c", aksen: "#b3123c", gelap: "#1f2328" },
} as const;
export type KunciPalet = keyof typeof PALET;

/** Font terkurasi (sudah terpasang lewat @fontsource; tidak memuat font eksternal). */
export const FONT = {
  "source-sans": { label: "Source Sans 3", css: '"Source Sans 3 Variable", system-ui, sans-serif' },
  "dm-sans": { label: "DM Sans", css: '"DM Sans Variable", system-ui, sans-serif' },
} as const;
export type KunciFont = keyof typeof FONT;

/** Tingkat gerak situs publik (reduced motion pengguna selalu menang). */
export const GERAK = {
  minimal: { label: "Minimal", keterangan: "Tanpa animasi gulir & parallax; hanya respons tombol." },
  standar: { label: "Standar", keterangan: "Kemunculan bagian sekali saat digulir, sorotan program." },
  dinamis: { label: "Dinamis", keterangan: "Standar + jarak gerak lebih besar & parallax foto." },
} as const;
export type TingkatGerak = keyof typeof GERAK;

export type DefinisiTema = {
  label: string;
  keterangan: string;
  /** false = struktur sudah disiapkan, belum bisa dipilih */
  tersedia: boolean;
  /** tata letak yang didukung tema per jenis widget; [0] = bawaan saat tata letak lain tidak didukung */
  tata: Record<string, string[]>;
  bawaan: { palet: KunciPalet; font: KunciFont; gerak: TingkatGerak };
};

export const TEMA: Record<"warna" | "akademik" | "modern" | "editorial", DefinisiTema> = {
  // tema utama: foto besar + panel teks putih (tanpa lapisan gelap), warna penanda bidang pada layanan
  warna: {
    label: "Sekolah Berwarna",
    keterangan: "Foto kegiatan besar dengan panel teks putih, warna penanda bidang pada layanan, ritme bagian bervariasi.",
    tersedia: true,
    tata: {
      hero: ["panel", "berdampingan", "penuh"],
      layanan: ["kisi", "daftar"],
      profil: ["foto-kiri", "foto-kanan"],
      berita: ["utama-pendamping", "daftar"],
      program: ["sorot", "daftar"],
      galeri: ["mozaik", "kisi"],
    },
    bawaan: { palet: "merah", font: "source-sans", gerak: "standar" },
  },
  akademik: {
    label: "Akademik",
    keterangan: "Dasar terang & informatif: foto berdampingan dengan teks, kartu bergaris tipis, gerak tenang.",
    tersedia: true,
    tata: {
      hero: ["berdampingan"],
      layanan: ["kisi", "daftar"],
      profil: ["foto-kiri", "foto-kanan"],
      berita: ["utama-pendamping", "daftar"],
      program: ["sorot", "daftar"],
      galeri: ["mozaik", "kisi"],
    },
    bawaan: { palet: "merah", font: "source-sans", gerak: "standar" },
  },
  modern: {
    label: "Modern Interaktif",
    keterangan: "Foto pembuka penuh dengan lapisan teks, bidang warna solid, sudut lebih bulat, gerak lebih ekspresif.",
    tersedia: true,
    tata: {
      hero: ["penuh", "berdampingan"],
      layanan: ["kisi", "daftar"],
      profil: ["foto-kanan", "foto-kiri"],
      berita: ["utama-pendamping", "daftar"],
      program: ["sorot", "daftar"],
      galeri: ["mozaik", "kisi"],
    },
    bawaan: { palet: "merah", font: "dm-sans", gerak: "dinamis" },
  },
  // disiapkan: tema Editorial dapat diaktifkan setelah komponen & CSS-nya selesai
  editorial: {
    label: "Editorial (segera)",
    keterangan: "Tipografi besar ala majalah sekolah. Belum dapat dipilih.",
    tersedia: false,
    tata: { hero: ["berdampingan"], berita: ["utama-pendamping"] },
    bawaan: { palet: "dongker", font: "source-sans", gerak: "standar" },
  },
};
export type KunciTema = keyof typeof TEMA;

/** Variabel CSS publik dari pilihan terkurasi (nilai berasal dari tabel di atas, bukan masukan bebas). */
export function cssToken(palet: KunciPalet, font: KunciFont) {
  const p = PALET[palet] ?? PALET.merah;
  const f = FONT[font] ?? FONT["source-sans"];
  return `--tema-utama:${p.utama};--tema-aksen:${p.aksen};--tema-gelap:${p.gelap};--font-publik:${f.css}`;
}
