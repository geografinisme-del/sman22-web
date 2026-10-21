/**
 * Pengurai teks CMS sederhana (tanpa HTML): paragraf dipisah baris kosong, "## " = subjudul, "- " = butir daftar.
 * Hasilnya blok terstruktur yang dirender sebagai elemen React biasa (aman dari injeksi HTML). Modul murni.
 */
export type BlokTeks = { jenis: "judul"; teks: string } | { jenis: "paragraf"; teks: string } | { jenis: "daftar"; butir: string[] };

export function uraiTeksCms(isi: string): BlokTeks[] {
  const hasil: BlokTeks[] = [];
  for (const kelompok of isi.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const baris = kelompok.split("\n").map((b) => b.trim()).filter(Boolean);
    let paragraf: string[] = [];
    let daftar: string[] = [];
    const tutupParagraf = () => {
      if (paragraf.length) hasil.push({ jenis: "paragraf", teks: paragraf.join(" ") });
      paragraf = [];
    };
    const tutupDaftar = () => {
      if (daftar.length) hasil.push({ jenis: "daftar", butir: daftar });
      daftar = [];
    };
    for (const b of baris) {
      if (b.startsWith("## ")) {
        tutupParagraf();
        tutupDaftar();
        hasil.push({ jenis: "judul", teks: b.slice(3).trim() });
      } else if (/^[-*] /.test(b)) {
        tutupParagraf();
        daftar.push(b.slice(2).trim());
      } else {
        tutupDaftar();
        paragraf.push(b);
      }
    }
    tutupParagraf();
    tutupDaftar();
  }
  return hasil;
}
