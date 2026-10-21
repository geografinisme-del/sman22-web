/**
 * Token visual tema publik: palet, font, tingkat gerak, dan tema terdaftar.
 * Tema hanya mengubah TAMPILAN (variabel CSS, tata letak widget) — tidak pernah data, izin, atau fungsi modul.
 * Dasbor admin tidak memakai token ini, sehingga pergantian tema tidak mengubah kebiasaan kerja staf.
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 */

/** Palet tema publik: satu palet "Langit cerah" (nilai sama dengan styles/tokens.css). */
export const PALET = {
  cerah: { label: "Langit cerah", utama: "#1f5fd1", aksen: "#d7f56a", gelap: "#0b1220" },
} as const;
export type KunciPalet = keyof typeof PALET;

/** Font terkurasi (next/font, lihat app/fonts.ts): Plus Jakarta Sans untuk semua teks. */
export const FONT = {
  jakarta: { label: "Plus Jakarta Sans", css: "var(--font-jakarta), system-ui, sans-serif" },
} as const;
export type KunciFont = keyof typeof FONT;

/** Tingkat gerak situs publik (reduced motion pengguna selalu menang). */
export const GERAK = {
  minimal: { label: "Minimal", keterangan: "Tanpa animasi gulir & parallax; hanya respons tombol, kartu putar, dan tur." },
  standar: { label: "Standar", keterangan: "Blok muncul sekali saat digulir; angka beranda menghitung naik." },
  dinamis: { label: "Dinamis", keterangan: "Standar + jarak gerak lebih besar & parallax foto (desktop)." },
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

export const TEMA: Record<"langit", DefinisiTema> = {
  // satu-satunya tema: "Langit cerah + Tur sekolah" (token di styles/tokens.css). Tema lama sudah dihapus;
  // konfigurasi lama (buku, warna, akademik, modern, editorial) otomatis jatuh ke tema ini saat dibaca.
  langit: {
    label: "Langit cerah",
    keterangan: "Langit biru bergradasi, kartu putar 3D, tur sekolah, kartu putih membulat, aksen lime.",
    tersedia: true,
    tata: { hero: ["langit"] },
    bawaan: { palet: "cerah", font: "jakarta", gerak: "standar" },
  },
};
export type KunciTema = keyof typeof TEMA;

/** Variabel CSS publik dari pilihan terkurasi (nilai berasal dari tabel di atas, bukan masukan bebas). */
export function cssToken(palet: KunciPalet, font: KunciFont) {
  const p = PALET[palet] ?? PALET.cerah;
  const f = FONT[font] ?? FONT.jakarta;
  return `--tema-utama:${p.utama};--tema-aksen:${p.aksen};--tema-gelap:${p.gelap};--font-publik:${f.css}`;
}
