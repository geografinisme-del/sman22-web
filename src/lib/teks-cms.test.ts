import { test } from "node:test";
import assert from "node:assert/strict";
import { uraiTeksCms } from "./teks-cms.ts";

test("paragraf, subjudul, dan daftar diurai tanpa HTML", () => {
  const blok = uraiTeksCms("## Struktur\nBaris satu\nbaris dua\n\n- butir A\n- butir B\n\n<script>x</script>");
  assert.deepEqual(blok, [
    { jenis: "judul", teks: "Struktur" },
    { jenis: "paragraf", teks: "Baris satu baris dua" },
    { jenis: "daftar", butir: ["butir A", "butir B"] },
    { jenis: "paragraf", teks: "<script>x</script>" },
  ]);
});

test("isi kosong menghasilkan daftar kosong; CRLF ditangani", () => {
  assert.deepEqual(uraiTeksCms(""), []);
  assert.deepEqual(uraiTeksCms("a\r\n\r\nb"), [
    { jenis: "paragraf", teks: "a" },
    { jenis: "paragraf", teks: "b" },
  ]);
});
