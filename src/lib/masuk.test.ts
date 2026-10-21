import { test } from "node:test";
import assert from "node:assert/strict";
import { areaRute, cocokHalaman, lanjutAman, peranAkun, urlMasuk } from "./masuk.ts";

test("lanjutAman: hanya jalur internal yang diawali satu '/'", () => {
  assert.equal(lanjutAman("/admin/berita"), "/admin/berita");
  assert.equal(lanjutAman("/portal/kelas?x=1"), "/portal/kelas?x=1");
  assert.equal(lanjutAman("/alumni/akun"), "/alumni/akun");
  for (const buruk of ["//evil.test", "https://evil.test/", "http://evil.test", "evil.test", "/\\evil.test", "/%2F%2Fevil.test", "/x y", "/a\"b", "javascript:alert(1)", "/javascript:alert(1)", "", null, 5, "/" + "a".repeat(400)])
    assert.equal(lanjutAman(buruk), null, String(buruk));
  // halaman masuk/akun sendiri tidak boleh jadi tujuan (mencegah putaran)
  assert.equal(lanjutAman("/admin/login?sebagai=staf"), null);
  assert.equal(lanjutAman("/portal-digital/masuk/gtk"), null);
  assert.equal(lanjutAman("/admin/mfa"), null);
});

test("areaRute: admin/papan/cetak/pratinjau = GTK; portal hanya bila jelas", () => {
  assert.equal(areaRute("/admin/berita"), "gtk");
  assert.equal(areaRute("/papan"), "gtk");
  assert.equal(areaRute("/cetak/sertifikat/1"), "gtk");
  assert.equal(areaRute("/pratinjau/tampilan"), "gtk");
  assert.equal(areaRute("/portal/scan"), "siswa");
  assert.equal(areaRute("/portal/kuis/abc"), "siswa");
  assert.equal(areaRute("/portal/izin"), "orang-tua");
  assert.equal(areaRute("/portal/anak/1"), "orang-tua");
  assert.equal(areaRute("/portal"), null);
  assert.equal(areaRute("/portal/kalender"), null);
  assert.equal(areaRute("/administrasi"), null);
});

test("urlMasuk: peta tujuan → halaman masuk, ?lanjut= dibawa & divalidasi", () => {
  assert.equal(urlMasuk("/admin/berita"), "/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fberita");
  assert.equal(urlMasuk("/portal/scan"), "/portal-digital/masuk/siswa?lanjut=%2Fportal%2Fscan");
  assert.equal(urlMasuk("/portal/izin"), "/portal-digital/masuk/orang-tua?lanjut=%2Fportal%2Fizin");
  assert.equal(urlMasuk("/portal/kalender"), "/portal-digital?lanjut=%2Fportal%2Fkalender");
  assert.equal(urlMasuk(null), "/portal-digital");
  assert.equal(urlMasuk(null, "gtk"), "/portal-digital/masuk/gtk");
  assert.equal(urlMasuk("https://evil.test", "gtk"), "/portal-digital/masuk/gtk");
  assert.equal(urlMasuk("/portal/kalender", "siswa"), "/portal-digital/masuk/siswa?lanjut=%2Fportal%2Fkalender");
});

test("peran akun & kecocokan halaman masuk", () => {
  assert.equal(peranAkun(["guru", "wali_kelas"]), "gtk");
  assert.equal(peranAkun(["siswa"]), "siswa");
  assert.equal(peranAkun(["orang_tua"]), "orang-tua");
  assert.equal(peranAkun([]), "gtk");
  assert.ok(cocokHalaman("gtk", ["guru"]));
  assert.ok(cocokHalaman("gtk", []), "akun tanpa peran = GTK (dasbor dasar)");
  assert.ok(cocokHalaman("gtk", ["alumni"]), "alumni tetap lewat halaman email seperti sebelumnya");
  assert.ok(!cocokHalaman("gtk", ["siswa"]));
  assert.ok(cocokHalaman("siswa", ["siswa"]));
  assert.ok(!cocokHalaman("siswa", ["orang_tua"]));
  assert.ok(!cocokHalaman("orang-tua", ["guru"]));
});
