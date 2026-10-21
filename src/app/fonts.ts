import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Huruf situs (next/font: di-host sendiri saat build, tanpa permintaan ke Google dari peramban).
 * - Semua teks: Plus Jakarta Sans 400–800
 * - Label kecil KAPITAL: JetBrains Mono 500/700 (letter-spacing 0.08em, lihat .label-mono)
 * Dipasang sebagai variabel CSS --font-jakarta & --font-jetbrains di <html> (dipakai styles/tokens.css).
 */
export const fontJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-jetbrains",
});
