import { test } from "node:test";
import assert from "node:assert/strict";
import { durasiMp4, hitungTur } from "./tur.ts";

test("awan menutup layar di awal dan hilang pada 10% gulir", () => {
  assert.equal(hitungTur(0, 6).awan, 1);
  assert.equal(hitungTur(0.05, 6).awan, 0.5);
  assert.equal(hitungTur(0.1, 6).awan, 0);
  assert.equal(hitungTur(0.5, 6).awan, 0);
});

test("titik berganti berurutan; crossfade hanya di 40% tengah segmen", () => {
  const n = 6;
  const seg = 0.9 / n;
  const di = (i: number, f: number) => hitungTur(0.1 + seg * (i + f), n);
  assert.equal(di(0, 0.1).aktif, 0);
  assert.deepEqual(di(0, 0.2).bobot.slice(0, 2), [1, 0], "sebelum 30%: belum crossfade");
  const tengah = di(0, 0.5);
  assert.ok(Math.abs(tengah.bobot[0] - 0.5) < 1e-9 && Math.abs(tengah.bobot[1] - 0.5) < 1e-9);
  assert.deepEqual(di(0, 0.8).bobot.slice(0, 2), [0, 1], "setelah 70%: titik berikutnya penuh");
  assert.equal(di(2, 0.9).aktif, 3);
  assert.equal(hitungTur(1, n).aktif, n - 1, "akhir gulir = titik terakhir");
  assert.equal(hitungTur(1, n).bobot[n - 1], 1);
});

test("foto zoom pelan dari 1.12 ke 1.04", () => {
  const awal = hitungTur(0.1, 6).skala[0];
  const nanti = hitungTur(0.1 + 0.15 * 0.9, 6).skala[0];
  assert.ok(awal <= 1.12 && awal > 1.04);
  assert.ok(nanti < awal);
  assert.ok(hitungTur(1, 6).skala[0] >= 1.04 - 1e-9);
});

function mp4(versi: 0 | 1, skala: number, durasi: number) {
  const b = new Uint8Array(200);
  const dv = new DataView(b.buffer);
  dv.setUint32(0, 20);
  b.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
  const o = 40;
  b.set([0x6d, 0x76, 0x68, 0x64], o); // mvhd
  b[o + 4] = versi;
  if (versi === 0) {
    dv.setUint32(o + 4 + 12, skala);
    dv.setUint32(o + 4 + 16, durasi);
  } else {
    dv.setUint32(o + 4 + 20, skala);
    dv.setBigUint64(o + 4 + 24, BigInt(durasi));
  }
  return b;
}

test("durasi MP4 dibaca dari kotak mvhd (versi 0 & 1)", () => {
  assert.equal(durasiMp4(mp4(0, 1000, 12_500)), 12.5);
  assert.equal(durasiMp4(mp4(1, 600, 9000)), 15);
  assert.equal(durasiMp4(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), null, "bukan MP4");
});
