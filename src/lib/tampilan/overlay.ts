/**
 * Satu aturan untuk semua overlay OTOMATIS di halaman publik, agar tidak pernah bertabrakan:
 *   1. Modal pengumuman prioritas (modal, latar redup)      — paling penting
 *   2. Panel informasi rutin (nonmodal, sudut layar)
 *   3. Lambaian pemandu (animasi tombol bantuan sekali, tanpa teks)
 * Overlay yang dibuka pengguna sendiri (klik) tidak diatur di sini.
 * Modul murni agar bisa diuji dengan `node --test`.
 */

export type OverlayOtomatis = "prioritas" | "rutin" | "sapa";

export type Kandidat = {
  /** ada pengumuman prioritas terbit & popup prioritas diaktifkan */
  prioritas: boolean;
  /** ada informasi rutin & panel rutin diaktifkan */
  rutin: boolean;
  /** pemandu diaktifkan admin & tidak dimatikan pengunjung */
  pemandu: boolean;
};

/** Catatan sesi kunjungan (sessionStorage); semua false bila storage tidak tersedia. */
export type Sesi = {
  prioritasTampil: boolean;
  rutinTampil: boolean;
  sapaTampil: boolean;
};

export type Kondisi = {
  /** bagian pembuka sudah sempat terlihat utuh (±1 detik setelah muat) */
  pembukaTerlihat: boolean;
  /** pembuka sudah terlewati saat menggulir */
  lewatPembuka: boolean;
  /** 0–1: posisi gulir terhadap tinggi halaman */
  progres: number;
  /** pengguna sedang mengisi kolom formulir */
  sedangMengisi: boolean;
  /** ada dialog/menu lain yang terbuka (galeri, menu ponsel, detail informasi, dll.) */
  dialogLainTerbuka: boolean;
  /** ada overlay otomatis yang sedang tampil */
  overlayTampil: boolean;
};

export const AMBANG_RUTIN = 0.25;

/** Overlay otomatis yang boleh tampil SEKARANG (paling banyak satu), atau null. */
export function pilihOverlay(k: Kandidat, s: Sesi, c: Kondisi): OverlayOtomatis | null {
  if (c.sedangMengisi || c.dialogLainTerbuka || c.overlayTampil) return null;
  // 1. modal prioritas: sekali per sesi, setelah pembuka terlihat
  if (k.prioritas && !s.prioritasTampil) return c.pembukaTerlihat ? "prioritas" : null;
  // 2. panel rutin: sekali per sesi, setelah pembuka terlewati & ±25% halaman;
  //    tidak otomatis bila modal prioritas sudah tampil di sesi ini (hindari popup berturut-turut)
  if (k.rutin && !s.rutinTampil && !s.prioritasTampil) {
    if (c.lewatPembuka && c.progres >= AMBANG_RUTIN) return "rutin";
    // panel rutin masih menunggu ambang gulir → lambaian pemandu boleh lebih dulu, tetapi hanya di bagian atas
  }
  // 3. lambaian pemandu: sekali per sesi, hanya saat tak ada overlay lain
  if (k.pemandu && !s.sapaTampil && c.pembukaTerlihat && !c.lewatPembuka) return "sapa";
  return null;
}
