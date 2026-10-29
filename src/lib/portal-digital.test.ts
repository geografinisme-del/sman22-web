import { test } from "node:test";
import assert from "node:assert/strict";
import { lanjutAman, PINTU, pintuTerlihat, putuskanPintu } from "./portal-digital.ts";

const akun = (peran: string[], izin: string[] = []) => ({ peran, izin });

test("belum masuk → ke halaman masuk peran dengan tujuan kembali yang aman", () => {
  const k = putuskanPintu("kurikulum", null, false);
  assert.equal(k?.aksi, "masuk");
  const url = new URL(`http://x${(k as { href: string }).href}`);
  assert.equal(url.pathname, "/portal-digital/masuk/gtk");
  assert.equal(lanjutAman(url.searchParams.get("lanjut")), "/portal-digital/buka/kurikulum");
  assert.equal(new URL(`http://x${(putuskanPintu("siswa", null, false) as { href: string }).href}`).pathname, "/portal-digital/masuk/siswa");
  assert.equal(new URL(`http://x${(putuskanPintu("ortu", null, false) as { href: string }).href}`).pathname, "/portal-digital/masuk/orang-tua");
});

test("layanan publik dibuka tanpa login", () => {
  assert.deepEqual(putuskanPintu("elibrary", null, false), { aksi: "buka", href: "/perpustakaan" });
});

test("berwenang → ruang kerja; tidak berwenang → penjelasan, bukan akses", () => {
  assert.deepEqual(putuskanPintu("kurikulum", akun(["waka_kurikulum"], ["kurikulum.kelola"]), true), { aksi: "buka", href: "/admin/kurikulum" });
  const tolak = putuskanPintu("kurikulum", akun(["guru"], ["kesiswaan.lihat"]), true);
  assert.equal(tolak?.aksi, "tolak");
  // siswa tidak bisa membuka Pojok Guru / manajemen walau memilih kartunya
  assert.equal(putuskanPintu("guru", akun(["siswa"]), true)?.aksi, "tolak");
  assert.equal(putuskanPintu("manajemen", akun(["guru"]), true)?.aksi, "tolak");
  assert.equal(putuskanPintu("manajemen", akun(["kepala_sekolah"]), true)?.aksi, "buka");
});

test("sudah masuk tetapi akun belum aktif → penjelasan", () => {
  assert.equal(putuskanPintu("guru", null, true)?.aksi, "tolak");
});

test("bidang tak dikenal → null (halaman 404, bukan halaman kosong)", () => {
  assert.equal(putuskanPintu("rahasia", null, false), null);
});

test("administrasi sistem hanya terlihat bagi yang berhak", () => {
  assert.ok(!pintuTerlihat(null).some((p) => p.bidang === "sistem"));
  assert.ok(!pintuTerlihat(akun(["waka_humas"], ["konten.kelola"])).some((p) => p.bidang === "sistem"));
  assert.ok(pintuTerlihat(akun(["super_admin"], ["pengguna.kelola"])).some((p) => p.bidang === "sistem"));
});

test("lanjutAman menolak open redirect & tujuan berbahaya", () => {
  for (const buruk of ["https://evil.test", "//evil.test", "/\\evil.test", "/admin/login", "situs", "javascript:alert(1)", "/admin//evil", "/portal%2F%2Fevil", "/admin/x y", 5, null])
    assert.equal(lanjutAman(buruk), null, String(buruk));
  for (const baik of ["/admin", "/admin/kurikulum", "/portal", "/portal-digital/buka/bk", "/admin/perpus?tab=1", "/alumni/akun"]) assert.equal(lanjutAman(baik), baik);
});

test("setiap pintu 'masuk' punya peran masuk & syarat; pintu publik tidak", () => {
  for (const p of PINTU) {
    if (p.jenis === "masuk") assert.ok(p.sebagai && p.boleh, p.bidang);
    else assert.ok(!p.boleh && p.href.startsWith("/"), p.bidang);
  }
});
