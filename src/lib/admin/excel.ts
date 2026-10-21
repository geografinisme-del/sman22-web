import "server-only";
import writeXlsxFile from "write-excel-file/node";
import type { Cell, SheetData } from "write-excel-file";

/**
 * Pembuat file Excel (.xlsx) bersama untuk semua ekspor & template impor.
 *
 * Kenapa bukan CSV: Excel berbahasa Indonesia memakai pemisah ";" sehingga CSV
 * berkoma terbuka menumpuk di satu kolom, dan NISN/NIP berubah jadi notasi ilmiah.
 * File .xlsx selalu terbuka rapi: satu kategori per kolom, judul dibekukan,
 * lebar kolom pas, angka induk tetap teks, tanggal tetap tanggal.
 */

export type JenisKolom = "teks" | "angka" | "uang" | "tanggal" | "persen";
export type KolomXlsx = { judul: string; jenis?: JenisKolom; lebar?: number };
export type NilaiXlsx = string | number | boolean | Date | null | undefined;
export type LembarXlsx = { nama: string; kolom: KolomXlsx[]; baris: NilaiXlsx[][] };

const WARNA_JUDUL = "var(--blue-teks)";
const WARNA_GARIS = "#D9DEE8";
const WARNA_SELANG = "#F5F7FC";

const tanggalIso = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function keSel(v: NilaiXlsx, jenis: JenisKolom, selang: boolean): Cell {
  const gaya = {
    borderColor: WARNA_GARIS,
    borderStyle: "thin" as const,
    alignVertical: "top" as const,
    ...(selang ? { backgroundColor: WARNA_SELANG } : {}),
  };
  if (v == null || v === "") return { value: "", type: String, ...gaya };
  if (jenis === "angka" || jenis === "persen" || jenis === "uang") {
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (Number.isFinite(n)) {
      const format = jenis === "persen" ? "0.0%" : jenis === "uang" ? '"Rp"#,##0' : undefined;
      // nilai persen selalu diberikan dalam skala 0–100
      return { value: jenis === "persen" ? n / 100 : n, type: Number, format, ...gaya };
    }
  }
  if (jenis === "tanggal") {
    const d = v instanceof Date ? v : tanggalIso.test(String(v)) ? new Date(String(v).length === 10 ? `${v}T00:00:00Z` : String(v)) : null;
    if (d && !Number.isNaN(d.getTime())) {
      const adaJam = !(String(v).length === 10);
      return { value: d, type: Date, format: adaJam ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy", ...gaya };
    }
  }
  if (typeof v === "boolean") return { value: v ? "Ya" : "Tidak", type: String, ...gaya };
  // teks: nomor induk (NISN/NIP/HP) tetap utuh, tidak berubah jadi notasi ilmiah
  return { value: String(v), type: String, wrap: String(v).length > 60, ...gaya };
}

function lebarOtomatis(k: KolomXlsx, baris: NilaiXlsx[][], i: number) {
  if (k.lebar) return k.lebar;
  if (k.jenis === "tanggal") return Math.max(13, k.judul.length + 2);
  if (k.jenis === "uang") return Math.max(16, k.judul.length + 2);
  const terpanjang = baris.slice(0, 500).reduce((m, b) => Math.max(m, String(b[i] ?? "").length), 0);
  return Math.min(60, Math.max(8, k.judul.length + 2, terpanjang + 2));
}

/** Buat buku kerja .xlsx dari satu atau beberapa lembar. Baris 1 selalu judul kolom. */
export async function bukuXlsx(lembar: LembarXlsx[]): Promise<Buffer> {
  const data: SheetData[] = lembar.map((l) => [
    l.kolom.map((k) => ({
      value: k.judul,
      type: String,
      fontWeight: "bold" as const,
      color: "#FFFFFF",
      backgroundColor: WARNA_JUDUL,
      borderColor: WARNA_JUDUL,
      borderStyle: "thin" as const,
      alignVertical: "center" as const,
      wrap: true,
      height: 30,
    })),
    ...l.baris.map((b, r) => l.kolom.map((k, i) => keSel(b[i], k.jenis ?? "teks", r % 2 === 1))),
  ]);
  return writeXlsxFile(data, {
    buffer: true,
    sheets: lembar.map((l) => l.nama.replace(/[\\/?*[\]:]/g, " ").slice(0, 31)),
    columns: lembar.map((l) => l.kolom.map((k, i) => ({ width: lebarOtomatis(k, l.baris, i) }))),
    stickyRowsCount: 1,
    fontFamily: "Calibri",
    fontSize: 11,
  });
}

/** Lembar "Info": keterangan ekspor (judul, waktu, filter, jumlah baris). */
export function lembarInfo(judul: string, rincian: [string, NilaiXlsx][]): LembarXlsx {
  const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date());
  return {
    nama: "Info",
    kolom: [{ judul: "Keterangan", lebar: 24 }, { judul: "Isi", lebar: 60 }],
    baris: [["Laporan", judul], ["Sekolah", "SMA Negeri 22 Bandung"], ["Diekspor", `${waktu} WIB`], ...rincian.map(([a, b]) => [a, b ?? "—"])],
  };
}

/** Tanggal hari ini (WIB) untuk nama file, mis. 2026-10-11. */
export const tanggalFile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

/** Respons unduhan .xlsx */
export function kirimXlsx(isi: Buffer, namaFile: string) {
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile.replace(/[^\w.-]+/g, "-")}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
