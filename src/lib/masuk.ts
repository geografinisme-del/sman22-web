/**
 * Alamat masuk Portal Digital 22 — SATU sumber untuk proxy, guard, halaman masuk, dan kartu "Pilih pintu Anda."
 * Modul murni (tanpa impor server) agar bisa diuji dengan `node --test`.
 *
 * Halaman masuk per peran:  /portal-digital/masuk/gtk | /siswa | /orang-tua
 * Pengunjung belum masuk:   /admin/*, /papan, /cetak, /pratinjau → gtk
 *                           /portal/* milik siswa / orang tua yang jelas → halaman perannya
 *                           /portal/* lain → /portal-digital (pilih pintu) dengan ?lanjut= dibawa
 */
export type PeranMasuk = "gtk" | "siswa" | "orang-tua";
export const PERAN_MASUK: PeranMasuk[] = ["gtk", "siswa", "orang-tua"];
export const LABEL_PERAN_MASUK: Record<PeranMasuk, { pendek: string; panjang: string }> = {
  gtk: { pendek: "Guru & Tendik", panjang: "Guru dan Tenaga Kependidikan" },
  siswa: { pendek: "Siswa", panjang: "Siswa" },
  "orang-tua": { pendek: "Orang Tua", panjang: "Orang Tua" },
};
/** nilai `jenis` lama di aksi masuk (staf | siswa | orang_tua) per halaman */
export const JENIS_LOGIN: Record<PeranMasuk, "staf" | "siswa" | "orang_tua"> = { gtk: "staf", siswa: "siswa", "orang-tua": "orang_tua" };
/** nilai `?sebagai=` lama → halaman masuk baru */
export const DARI_SEBAGAI: Record<string, PeranMasuk> = { staf: "gtk", siswa: "siswa", ortu: "orang-tua", orang_tua: "orang-tua" };

export const alamatMasuk = (peran: PeranMasuk) => `/portal-digital/masuk/${peran}`;

/**
 * Tujuan kembali (?lanjut=) yang aman: HANYA jalur internal yang diawali satu "/" (bukan "//", bukan skema/domain lain),
 * tanpa karakter berbahaya, maks. 300 karakter, dan bukan halaman masuk/akun itu sendiri. Selain itu → null.
 */
export function lanjutAman(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0 || v.length > 300) return null;
  if (!v.startsWith("/") || v.includes("//")) return null;
  if (/[\\\s<>"'`]|%2f%2f|%5c|%0d|%0a|%09/i.test(v) || /^\/[^/]*:/.test(v)) return null;
  if (/^\/(admin\/(login|lupa-sandi|sandi-baru|mfa)|portal-digital\/masuk)(\/|\?|$)/.test(v)) return null;
  return v;
}

/** Area peran sebuah rute: halaman milik GTK, siswa, orang tua, atau null (umum / tidak jelas). */
export function areaRute(path: string): PeranMasuk | null {
  const p = path.split(/[?#]/)[0];
  if (/^\/(admin|papan|cetak|pratinjau)(\/|$)/.test(p)) return "gtk";
  if (/^\/portal\/(scan|kuis|tugas)(\/|$)/.test(p)) return "siswa";
  if (/^\/portal\/(izin|anak)(\/|$)/.test(p)) return "orang-tua";
  return null;
}

/**
 * Alamat masuk untuk tujuan tertentu. `peran` memaksa halaman tertentu; tanpa `peran`, ditentukan dari area tujuan:
 * area jelas → halaman perannya; tidak jelas → /portal-digital (pilih pintu). ?lanjut= selalu dibawa bila aman.
 */
export function urlMasuk(tujuan?: string | null, peran?: PeranMasuk | null): string {
  const lanjut = lanjutAman(tujuan ?? null);
  const p = peran ?? (lanjut ? areaRute(lanjut) : null);
  const dasar = p ? alamatMasuk(p) : "/portal-digital";
  return lanjut ? `${dasar}?lanjut=${encodeURIComponent(lanjut)}` : dasar;
}

/** Peran halaman masuk yang cocok untuk daftar peran akun (untuk pesan "akun ini bukan …"). */
export function peranAkun(peran: string[]): PeranMasuk {
  if (peran.some((p) => p !== "siswa" && p !== "orang_tua")) return "gtk";
  if (peran.includes("siswa")) return "siswa";
  if (peran.includes("orang_tua")) return "orang-tua";
  return "gtk"; // akun tanpa peran = GTK yang belum ditetapkan (dasbor dasar)
}

/** Apakah akun dengan peran ini boleh masuk lewat halaman `halaman`? */
export function cocokHalaman(halaman: PeranMasuk, peran: string[]): boolean {
  if (halaman === "siswa") return peran.includes("siswa");
  if (halaman === "orang-tua") return peran.includes("orang_tua");
  // GTK: semua akun kecuali yang HANYA siswa/orang tua (termasuk akun tanpa peran & alumni seperti sebelumnya)
  return peran.length === 0 || peran.some((p) => p !== "siswa" && p !== "orang_tua");
}

/** Dasbor bawaan sebuah akun setelah masuk. */
export const dasborPeran = (peran: string[]) => (peranAkun(peran) === "gtk" ? "/admin/mulai" : "/portal");
