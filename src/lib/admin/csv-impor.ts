import Papa from "papaparse";
import { PENANDA_CONTOH } from "./induk.ts";

export { PENANDA_CONTOH };

/**
 * CSV untuk impor/ekspor data induk — aman untuk Excel berbahasa Indonesia.
 * Modul murni (tanpa server-only/alias) agar bisa diuji langsung dengan `node --test`.
 */

const BOM = "\uFEFF";


/** Pemisah yang dipakai berkas: ";" (Excel Indonesia) atau "," — dihitung dari baris pertama, di luar tanda kutip. */
export function tebakPemisah(teks: string): ";" | "," {
  const awal = teks.replace(/^\uFEFF/, "").split(/\r?\n/).find((b) => b.trim() !== "") ?? "";
  let dalamKutip = false;
  let titikKoma = 0;
  let koma = 0;
  for (const c of awal) {
    if (c === '"') dalamKutip = !dalamKutip;
    else if (!dalamKutip && c === ";") titikKoma++;
    else if (!dalamKutip && c === ",") koma++;
  }
  return titikKoma > 0 && titikKoma >= koma ? ";" : ",";
}

/** Baca CSV (pemisah ; atau , — dideteksi otomatis; dengan atau tanpa BOM; baris CRLF/LF). */
export function bacaCsv(teks: string): string[][] {
  const bersih = teks.replace(/^\uFEFF/, "");
  const hasil = Papa.parse<string[]>(bersih, { delimiter: tebakPemisah(bersih), skipEmptyLines: "greedy" });
  return hasil.data.map((b) => b.map((s) => (typeof s === "string" ? s.trim() : s)));
}

/** Satu sel CSV: dibungkus kutip bila memuat ; , " atau baris baru; awalan rumus (= + - @) dinetralkan. */
export function selCsv(v: string | number | null | undefined) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";,\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tulis CSV: BOM UTF-8 + pemisah ";" + baris CRLF — langsung rapi per kolom di Excel berbahasa Indonesia. */
export function tulisCsv(header: string[], baris: (string | number | null | undefined)[][] = []) {
  return BOM + [header, ...baris].map((r) => r.map(selCsv).join(";")).join("\r\n") + "\r\n";
}
