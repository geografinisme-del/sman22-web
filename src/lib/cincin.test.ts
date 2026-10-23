import { test } from "node:test";
import assert from "node:assert/strict";
import { normalSudut, phiKartu, sudutTerdekat, tampilKartu } from "./cincin.ts";

test("normalSudut ke -180..180", () => {
  assert.equal(normalSudut(190), -170);
  assert.equal(normalSudut(-190), 170);
  assert.equal(normalSudut(720), 0);
});

test("kartu depan membesar 1.38x, kartu jauh tersembunyi, z-index menurun", () => {
  const n = 12;
  const depan = tampilKartu(0, 0, n, 760);
  assert.equal(depan.near, 1);
  assert.match(depan.transform, /translateZ\(-640px\) scale\(1\.38\)/);
  assert.equal(depan.opacity, 1);
  const samping = tampilKartu(2, 0, n, 760); // phi = 60°
  assert.ok(samping.opacity > 0 && samping.opacity < 1);
  assert.equal(samping.near, 0);
  const belakang = tampilKartu(6, 0, n, 760); // phi = 180°
  assert.equal(belakang.opacity, 0);
  assert.ok(depan.z > samping.z && samping.z > belakang.z);
});

test("putar ke kartu memakai jalur terpendek", () => {
  const n = 12;
  // kartu 11 (330°) dari theta 0 → -330 setara +30: putar 30°, bukan 330°
  const t = sudutTerdekat(0, -11 * 30);
  assert.equal(t, 30);
  assert.equal(phiKartu(11, t, n), 0);
});

test("putaran otomatis dihitung dari waktu: 10 detik di luar layar = maju 50°", async () => {
  const { sudutOtomatis } = await import("./cincin.ts");
  assert.equal(sudutOtomatis(0, 1000, 1000, 5), 0);
  assert.equal(sudutOtomatis(0, 1000, 11000, 5), -50);
  assert.equal(sudutOtomatis(30, 5000, 4000, 5), 30, "waktu mundur tidak memutar balik");
});

test("kartu depan & geser satu kartu", async () => {
  const { kartuDepan, sudutGeserSatu } = await import("./cincin.ts");
  assert.equal(kartuDepan(0, 12), 0);
  assert.equal(kartuDepan(-30, 12), 1);
  assert.equal(kartuDepan(-359, 12), 0);
  assert.equal(kartuDepan(29, 12), 11);
  assert.equal(sudutGeserSatu(-31, 12, 1), -60);
  assert.equal(sudutGeserSatu(-31, 12, -1), 0);
  assert.equal(kartuDepan(sudutGeserSatu(0, 12, 1), 12), 1);
});

test("cincin HP: kartu tengah penuh, tetangga mengintip & mengecil, kartu jauh tersembunyi", async () => {
  const { tampilKartuHp } = await import("./cincin.ts");
  const n = 6; // step 60°
  const tengah = tampilKartuHp(0, 0, n, 200);
  const kanan = tampilKartuHp(1, 0, n, 200);
  const jauh = tampilKartuHp(3, 0, n, 200);
  assert.equal(tengah.opacity, 1);
  assert.match(tengah.transform, /translate3d\(0\.00px/);
  assert.match(tengah.transform, /scale\(1\.0000\)/);
  assert.equal(kanan.opacity, 1);
  assert.match(kanan.transform, /translate3d\(200\.00px/);
  assert.equal(jauh.opacity, 0);
  assert.ok(tengah.z > kanan.z && kanan.z > jauh.z);
});

test("putaran otomatis HP berlangkah: diam lalu geser tepat satu kartu", async () => {
  const { sudutOtomatisLangkah } = await import("./cincin.ts");
  assert.equal(sudutOtomatisLangkah(0, 0, 1000, 60, 4000, 700), 0, "masih diam");
  assert.equal(sudutOtomatisLangkah(0, 0, 3300 + 350, 60, 4000, 700), -30, "di tengah geseran");
  assert.equal(sudutOtomatisLangkah(0, 0, 4000, 60, 4000, 700), -60, "tepat satu kartu");
  assert.equal(sudutOtomatisLangkah(0, 0, 9000, 60, 4000, 700), -120);
});
