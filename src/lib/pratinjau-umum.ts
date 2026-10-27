/**
 * Konstanta "Lihat sebagai…" (pratinjau peran) yang aman dipakai di mana saja (proxy, server, klien).
 * Logika tanda tangan cookie ada di lib/pratinjau.ts (khusus server).
 */
/** cookie bertanda tangan (httpOnly) berisi peran yang dipratinjau + pemilik + waktu mulai */
export const COOKIE_PRATINJAU = "sman22_pratinjau";
/** cookie penanda TANPA rahasia (bisa dibaca JS) — hanya untuk pita & penjaga tombol di peramban, bukan otorisasi */
export const COOKIE_LABEL_PRATINJAU = "sman22_pratinjau_label";
/** header ke Supabase/PostgREST; database hanya mematuhinya bila pemanggil super admin AAL2 */
export const HEADER_PRATINJAU = "x-pratinjau-peran";
export const PESAN_PRATINJAU = "Mode pratinjau — perubahan tidak disimpan";
export const DURASI_PRATINJAU_DETIK = 30 * 60;
/** peran "akun menunggu verifikasi" (tanpa peran) — dikenali database sebagai tanpa izin */
export const TANPA_PERAN = "__tanpa_peran__";
/** jalur pengendali pratinjau yang tetap boleh menerima POST selama pratinjau */
export const JALUR_KENDALI_PRATINJAU = "/lihat-sebagai";
