import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Huruf situs (next/font: di-host sendiri saat build, tanpa permintaan ke Google dari peramban).
 * - Judul: Newsreader 500–700 (+ italic untuk aksen sesekali)
 * - Isi & menu: Plus Jakarta Sans 400/500/700
 * Dipasang sebagai variabel CSS --font-judul & --font-isi di <html>.
 */
export const fontJudul = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-judul",
});

export const fontIsi = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-isi",
});
