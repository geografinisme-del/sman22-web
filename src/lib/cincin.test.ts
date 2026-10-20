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
