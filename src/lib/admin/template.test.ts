import { test } from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { bacaCsv, selCsv, tebakPemisah, tulisCsv, PENANDA_CONTOH } from "./csv-impor.ts";
import { buatTemplateXlsx, hurufKolom, seriTanggal, type KolomTemplate } from "./xlsx-template.ts";

const KOLOM: KolomTemplate[] = [
  { judul: "Nama", jenis: "teks", lebar: 24, contoh: `Ahmad Fauzi ${PENANDA_CONTOH}` },
  { judul: "NISN", jenis: "teks", lebar: 14, contoh: "0081234567" },
  { judul: "Jenis kelamin (L/P)", jenis: "teks", lebar: 18, contoh: "L", pilihan: ["L", "P"] },
  { judul: "Tanggal lahir", jenis: "tanggal", lebar: 14, contoh: "2009-05-17" },
  { judul: "Kelas / Rombel", jenis: "teks", lebar: 14, contoh: "X-1", daftar: "Kelas" },
  { judul: "Tahun masuk", jenis: "umum", lebar: 12, contoh: "2026" },
];

function bukaTemplate() {
  const zip = buatTemplateXlsx({ kolom: KOLOM, daftar: { Kelas: ["X-1", "X-2", "XI-1"] }, petunjuk: [["Nama", "Wajib", "Nama lengkap.", "Ahmad"]], catatan: ["NIK tidak perlu diisi."] });
  const isi = unzipSync(zip);
  return Object.fromEntries(Object.entries(isi).map(([k, v]) => [k, strFromU8(v)]));
}

test("template xlsx: berkas zip lengkap — lembar Data pertama, Petunjuk, Daftar tersembunyi", () => {
  const f = bukaTemplate();
  for (const k of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml"]) assert.ok(f[k], `tidak ada ${k}`);
  const wb = f["xl/workbook.xml"];
  assert.ok(wb.indexOf('name="Data"') < wb.indexOf('name="Petunjuk"'));
  assert.match(wb, /name="Daftar" sheetId="3" state="hidden"/);
});

test("template xlsx: judul tebal berlatar abu, baris judul dibekukan, baris contoh abu", () => {
  const f = bukaTemplate();
  const data = f["xl/worksheets/sheet1.xml"];
  assert.match(data, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  assert.match(data, /<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Nama<\/t>/);
  assert.match(f["xl/styles.xml"], /<font><b\/>/);
  assert.match(f["xl/styles.xml"], /rgb="FFE9ECF1"/);
  // baris contoh memakai gaya font abu (4 teks, 5 tanggal, 6 angka)
  assert.match(data, /<c r="A2" t="inlineStr" s="4">/);
});

test("template xlsx: NISN berformat TEKS (@), tanggal dd/mm/yyyy, tahun berupa angka", () => {
  const f = bukaTemplate();
  const data = f["xl/worksheets/sheet1.xml"];
  assert.match(f["xl/styles.xml"], /<numFmt numFmtId="164" formatCode="dd\/mm\/yyyy"\/>/);
  // kolom B (NISN) bergaya 2 = numFmtId 49 (@) sehingga isian baru juga teks; contoh NISN disimpan sebagai teks "0081234567"
  assert.match(data, /<col min="2" max="2" width="14" style="2" customWidth="1"\/>/);
  assert.match(data, /<c r="B2" t="inlineStr" s="4"><is><t xml:space="preserve">0081234567<\/t>/);
  assert.match(data, /<col min="4" max="4" width="14" style="3" customWidth="1"\/>/);
  assert.match(data, new RegExp(`<c r="D2" s="5"><v>${seriTanggal("2009-05-17")}</v></c>`));
  assert.match(data, /<c r="F2" s="6"><v>2026<\/v><\/c>/);
});

test("template xlsx: validasi isian L/P dan daftar kelas dari lembar Daftar", () => {
  const f = bukaTemplate();
  const data = f["xl/worksheets/sheet1.xml"];
  assert.match(data, /<dataValidations count="2">/);
  assert.match(data, /sqref="C2:C2000"><formula1>&quot;L,P&quot;<\/formula1>/);
  assert.match(data, /sqref="E2:E2000"><formula1>Daftar!\$A\$2:\$A\$4<\/formula1>/);
  assert.match(f["xl/worksheets/sheet3.xml"], /XI-1/);
  assert.match(f["xl/worksheets/sheet2.xml"], /NIK tidak perlu diisi/);
});

test("hurufKolom & seriTanggal", () => {
  assert.deepEqual([0, 25, 26, 27, 51, 52].map(hurufKolom), ["A", "Z", "AA", "AB", "AZ", "BA"]);
  assert.equal(seriTanggal("1900-03-01"), 61);
  assert.equal(seriTanggal("2009-05-17"), 39950);
  assert.equal(seriTanggal("17/05/2009"), null);
});

test("tulisCsv: BOM UTF-8, pemisah titik koma, CRLF, teks ber-; atau \" dibungkus kutip", () => {
  const csv = tulisCsv(["Nama", "Alamat", "Catatan"], [["Ahmad", "Jl. Mawar; No. 1", 'Kata "hebat"']]);
  assert.ok(csv.startsWith("﻿"));
  assert.equal(csv, '﻿Nama;Alamat;Catatan\r\nAhmad;"Jl. Mawar; No. 1";"Kata ""hebat"""\r\n');
  assert.equal(selCsv("=1+1"), "'=1+1");
  assert.equal(selCsv("081234567890"), "081234567890");
});

test("bacaCsv: pemisah ; maupun , dideteksi otomatis, dengan atau tanpa BOM", () => {
  const harap = [["Nama", "NISN", "Alamat"], ["Ahmad", "0081234567", "Jl. A, No. 1"]];
  assert.deepEqual(bacaCsv('﻿Nama;NISN;Alamat\r\nAhmad;0081234567;"Jl. A, No. 1"\r\n'), harap);
  assert.deepEqual(bacaCsv('Nama;NISN;Alamat\nAhmad;0081234567;Jl. A, No. 1\n'), harap);
  assert.deepEqual(bacaCsv('﻿Nama,NISN,Alamat\r\nAhmad,0081234567,"Jl. A, No. 1"\r\n'), harap);
  assert.deepEqual(bacaCsv('Nama,NISN,Alamat\nAhmad,0081234567,"Jl. A, No. 1"\n\n'), harap);
  assert.equal(tebakPemisah('"a;b",c,d'), ",");
  assert.equal(tebakPemisah("a;b;c"), ";");
});

test("bacaCsv membaca kembali tulisCsv (pulang-pergi)", () => {
  const baris = [["Siti; Aminah", '0012"3', "081234567890"]];
  assert.deepEqual(bacaCsv(tulisCsv(["Nama", "NISN", "HP"], baris)), [["Nama", "NISN", "HP"], ...baris]);
});

test("normalisasi impor: NISN & No. HP yang kehilangan angka 0 di depan (dibuka sebagai angka) dipulihkan", async () => {
  const { KOLOM_SISWA, normalisasiBaris } = await import("./induk.ts");
  const peta = Object.fromEntries(KOLOM_SISWA.map((k, i) => [k.kunci, i]));
  const mentah = KOLOM_SISWA.map((k) => (k.kunci === "nama" ? "Siti Aminah" : k.kunci === "nisn" ? 81234567 : k.kunci === "telepon" ? 81234567890 : k.kunci === "telepon_ortu" ? "6281298765432" : ""));
  const { data, catatan } = normalisasiBaris(mentah, peta, "siswa");
  assert.equal(data.nisn, "0081234567");
  assert.equal(data.telepon, "081234567890");
  assert.equal(data.telepon_ortu, "6281298765432");
  assert.ok(catatan.some((c) => c.includes("No. HP siswa")));
});

test("pemetaan kolom: SEMUA judul kolom template siswa & pegawai dikenali otomatis (tanpa salah petakan)", async () => {
  const { KOLOM_PEGAWAI, KOLOM_SISWA, tebakPemetaan } = await import("./induk.ts");
  for (const kolom of [KOLOM_SISWA, KOLOM_PEGAWAI]) {
    const peta = tebakPemetaan(kolom.map((k) => k.label), kolom);
    kolom.forEach((k, i) => assert.equal(peta[k.kunci], i, `${k.label} tidak terpetakan ke kolomnya`));
  }
  // judul ala Dapodik/ekspor lama tetap dikenali lewat sinonim
  const peta = tebakPemetaan(["Nama Peserta Didik", "NISN", "JK", "Rombel Saat Ini", "No HP"], KOLOM_SISWA);
  assert.deepEqual([peta.nama, peta.nisn, peta.jenis_kelamin, peta.kelas, peta.telepon], [0, 1, 2, 3, 4]);
});
