import { test } from "node:test";
import assert from "node:assert/strict";
import { BIDANG, KUNCI_BIDANG, cssBidang, kontras } from "./bidang.ts";

test("setiap bidang lolos kontras WCAG AA untuk semua pasangan yang dipakai", () => {
  for (const k of KUNCI_BIDANG) {
    const b = BIDANG[k];
    assert.ok(kontras("#ffffff", b.solid) >= 4.5, `${k}: teks putih di atas solid ${kontras("#ffffff", b.solid).toFixed(2)}`);
    assert.ok(kontras(b.teks, b.tint) >= 4.5, `${k}: teks di atas tint ${kontras(b.teks, b.tint).toFixed(2)}`);
    assert.ok(kontras(b.teks, "#ffffff") >= 4.5, `${k}: teks di atas putih`);
    assert.ok(kontras(b.solid, "#ffffff") >= 4.5, `${k}: warna solid sebagai teks/ikon di atas putih`);
  }
});

test("bidang saling dapat dibedakan (tidak ada warna solid kembar) dan berbeda dari warna status", () => {
  const solid = KUNCI_BIDANG.map((k) => BIDANG[k].solid.toLowerCase());
  assert.equal(new Set(solid).size, solid.length);
  // warna status sukses/peringatan/gagal yang dipakai aplikasi (emerald/amber/red Tailwind)
  for (const status of ["#047857", "#92400e", "#8a4b00", "#b91c1c"]) assert.ok(!solid.includes(status), status);
});

test("setiap bidang punya nama & ikon (tidak bergantung warna saja)", () => {
  for (const k of KUNCI_BIDANG) {
    assert.ok(BIDANG[k].label.length > 2, k);
    assert.ok(/^[A-Z][A-Za-z0-9]+$/.test(BIDANG[k].ikon), k);
    assert.ok(BIDANG[k].keterangan.endsWith("."), k);
  }
});

test("CSS bidang hanya berisi kunci & warna #rrggbb yang dikenal", () => {
  const css = cssBidang();
  for (const k of KUNCI_BIDANG) assert.ok(css.includes(`[data-bidang="${k}"]`));
  assert.ok(!/[<>]/.test(css));
  assert.equal((css.match(/#[0-9a-f]{6}/g) ?? []).length, KUNCI_BIDANG.length * 4);
});
