import { zipSync, strToU8 } from "fflate";
import { PENANDA_CONTOH } from "./csv-impor.ts";

export { PENANDA_CONTOH };

/**
 * Pembuat file template impor .xlsx (Office Open XML) tanpa pustaka berat.
 * Kenapa ditulis sendiri: template perlu VALIDASI ISIAN (daftar pilihan), FORMAT TEKS per kolom (agar NISN/HP tidak
 * kehilangan angka 0 di depan atau berubah jadi 1,23E+09), tanggal dd/mm/yyyy, baris judul dibekukan, dan lembar
 * Petunjuk — fitur yang tidak disediakan pembuat Excel ekspor biasa.
 * Modul ini murni (tanpa server-only/alias) agar bisa diuji langsung dengan `node --test`.
 */

export type JenisKolomTemplate = "teks" | "tanggal" | "umum";
export type KolomTemplate = {
  judul: string;
  jenis: JenisKolomTemplate;
  lebar: number;
  contoh: string;
  /** daftar pilihan langsung (mis. ["L","P"]) atau nama daftar di lembar tersembunyi "Daftar" */
  pilihan?: string[];
  daftar?: string;
  pesan?: string;
};
export type BarisPetunjuk = [string, string, string, string];
export type DataTemplate = {
  kolom: KolomTemplate[];
  /** isi lembar tersembunyi "Daftar": nama daftar → nilai (dipakai validasi kolom yang memakai `daftar`) */
  daftar?: Record<string, string[]>;
  petunjuk: BarisPetunjuk[];
  catatan: string[];
  /** baris maksimum yang diberi validasi & format */
  barisMaks?: number;
};


const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const hurufKolom = (i: number) => {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
/** Nomor seri tanggal Excel (hari sejak 1899-12-30) dari "YYYY-MM-DD"; null bila tidak valid. */
export function seriTanggal(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(t) ? null : Math.round((t - Date.UTC(1899, 11, 30)) / 864e5);
}

// indeks gaya (cellXfs) — lihat GAYA di bawah
const S = { umum: 0, judul: 1, teks: 2, tanggal: 3, contohTeks: 4, contohTanggal: 5, contohUmum: 6, bungkus: 7, judulBesar: 8, tebalBungkus: 9 } as const;
const GAYA = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="11"/><color rgb="FF7A8496"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9ECF1"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC9CFD9"/></left><right style="thin"><color rgb="FFC9CFD9"/></right><top style="thin"><color rgb="FFC9CFD9"/></top><bottom style="thin"><color rgb="FFC9CFD9"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="49" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="164" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const teksSel = (ref: string, nilai: string, gaya: number) => `<c r="${ref}" t="inlineStr" s="${gaya}"><is><t xml:space="preserve">${esc(nilai)}</t></is></c>`;
const angkaSel = (ref: string, nilai: number, gaya: number) => `<c r="${ref}" s="${gaya}"><v>${nilai}</v></c>`;
const KEPALA = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;

function lembarData(d: DataTemplate) {
  const maks = d.barisMaks ?? 2000;
  const gayaKolom = (k: KolomTemplate) => (k.jenis === "teks" ? S.teks : k.jenis === "tanggal" ? S.tanggal : S.umum);
  const cols = d.kolom.map((k, i) => `<col min="${i + 1}" max="${i + 1}" width="${k.lebar}" style="${gayaKolom(k)}" customWidth="1"/>`).join("");
  const judul = d.kolom.map((k, i) => teksSel(`${hurufKolom(i)}1`, k.judul, S.judul)).join("");
  const contoh = d.kolom
    .map((k, i) => {
      const ref = `${hurufKolom(i)}2`;
      if (k.jenis === "tanggal") {
        const n = seriTanggal(k.contoh);
        if (n != null) return angkaSel(ref, n, S.contohTanggal);
      }
      if (k.jenis === "umum" && /^\d+$/.test(k.contoh)) return angkaSel(ref, Number(k.contoh), S.contohUmum);
      return teksSel(ref, k.contoh, S.contohTeks);
    })
    .join("");
  const validasi = d.kolom
    .map((k, i) => {
      const huruf = hurufKolom(i);
      let rumus = "";
      if (k.pilihan?.length) rumus = `"${k.pilihan.join(",")}"`;
      else if (k.daftar && d.daftar?.[k.daftar]?.length) {
        const kol = hurufKolom(Object.keys(d.daftar).indexOf(k.daftar));
        rumus = `Daftar!$${kol}$2:$${kol}$${d.daftar[k.daftar].length + 1}`;
      }
      if (!rumus) return "";
      const galat = k.pesan ?? `Pilih salah satu: ${k.pilihan?.join(", ") ?? "dari daftar"}.`;
      return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorStyle="stop" errorTitle="Isian tidak sesuai" error="${esc(galat)}" promptTitle="${esc(k.judul)}" prompt="${esc(galat)}" sqref="${huruf}2:${huruf}${maks}"><formula1>${esc(rumus)}</formula1></dataValidation>`;
    })
    .filter(Boolean);
  return `${KEPALA}
<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData><row r="1" ht="32" customHeight="1">${judul}</row><row r="2">${contoh}</row></sheetData>
${validasi.length ? `<dataValidations count="${validasi.length}">${validasi.join("")}</dataValidations>` : ""}
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function lembarPetunjuk(d: DataTemplate) {
  const baris: string[] = [];
  let r = 1;
  baris.push(`<row r="${r}" ht="22" customHeight="1">${teksSel(`A${r}`, "Petunjuk pengisian template impor", S.judulBesar)}</row>`);
  r += 2;
  baris.push(`<row r="${r}">${["Kolom", "Wajib?", "Cara mengisi", "Contoh"].map((t, i) => teksSel(`${hurufKolom(i)}${r}`, t, S.judul)).join("")}</row>`);
  for (const p of d.petunjuk) {
    r++;
    baris.push(`<row r="${r}">${p.map((t, i) => teksSel(`${hurufKolom(i)}${r}`, t, i === 0 ? S.tebalBungkus : S.bungkus)).join("")}</row>`);
  }
  r++;
  for (const c of d.catatan) {
    r++;
    baris.push(`<row r="${r}">${teksSel(`A${r}`, "Catatan", S.tebalBungkus)}${teksSel(`C${r}`, c, S.bungkus)}</row>`);
  }
  return `${KEPALA}
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="13" customWidth="1"/><col min="3" max="3" width="70" customWidth="1"/><col min="4" max="4" width="24" customWidth="1"/></cols>
<sheetData>${baris.join("")}</sheetData>
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function lembarDaftar(daftar: Record<string, string[]>) {
  const nama = Object.keys(daftar);
  const panjang = Math.max(0, ...nama.map((n) => daftar[n].length));
  const baris = [`<row r="1">${nama.map((n, i) => teksSel(`${hurufKolom(i)}1`, n, S.judul)).join("")}</row>`];
  for (let j = 0; j < panjang; j++) {
    const r = j + 2;
    baris.push(`<row r="${r}">${nama.map((n, i) => (daftar[n][j] != null ? teksSel(`${hurufKolom(i)}${r}`, daftar[n][j], S.teks) : "")).join("")}</row>`);
  }
  return `${KEPALA}<sheetData>${baris.join("")}</sheetData></worksheet>`;
}

/** Buat file template .xlsx: lembar "Data" (pertama), "Petunjuk", dan "Daftar" (tersembunyi, sumber pilihan). */
export function buatTemplateXlsx(d: DataTemplate): Uint8Array {
  const adaDaftar = Boolean(d.daftar && Object.keys(d.daftar).length);
  const lembar = [
    { nama: "Data", xml: lembarData(d) },
    { nama: "Petunjuk", xml: lembarPetunjuk(d) },
    ...(adaDaftar ? [{ nama: "Daftar", xml: lembarDaftar(d.daftar!), sembunyi: true }] : []),
  ] as { nama: string; xml: string; sembunyi?: boolean }[];
  const berkas: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${lembar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${lembar.map((l, i) => `<sheet name="${esc(l.nama)}" sheetId="${i + 1}"${l.sembunyi ? ' state="hidden"' : ""} r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lembar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${lembar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(GAYA),
  };
  lembar.forEach((l, i) => (berkas[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(l.xml)));
  return zipSync(berkas, { level: 6 });
}
