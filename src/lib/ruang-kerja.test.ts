import { test } from "node:test";
import assert from "node:assert/strict";
import { ruangKerjaAktif, ruangKerjaUntuk, tujuanAwal, RUANG_KERJA } from "./ruang-kerja.ts";

const akun = (peran: string[], izin: string[]) => ({ peran, izin });

test("guru biasa tidak dianggap admin: tanpa ruang kerja, mulai di Ringkasan", () => {
  const guru = akun(["guru"], ["absensi.lihat", "kesiswaan.lihat", "sarpras.lihat"]);
  assert.deepEqual(ruangKerjaUntuk(guru), []);
  assert.equal(tujuanAwal(guru), "/admin");
});

test("izin 'lihat' saja tidak membuka ruang kerja petugas", () => {
  assert.deepEqual(ruangKerjaUntuk(akun(["guru"], ["perpus.lihat", "mutu.lihat", "ekskul.lihat"])), []);
});

test("satu penugasan → langsung ke ruang kerjanya", () => {
  const pustakawan = akun(["pustakawan"], ["perpus.kelola", "perpus.lihat"]);
  assert.deepEqual(ruangKerjaUntuk(pustakawan).map((r) => r.kunci), ["perpustakaan"]);
  assert.equal(tujuanAwal(pustakawan), "/admin/perpus");
});

test("beberapa penugasan → Ringkasan + pemilih, tanpa menggabungkan izin", () => {
  const ganda = akun(["kurikulum", "humas"], ["kurikulum.kelola", "humas.kelola"]);
  assert.deepEqual(ruangKerjaUntuk(ganda).map((r) => r.kunci), ["kurikulum", "humas"]);
  assert.equal(tujuanAwal(ganda), "/admin");
});

test("pimpinan selalu mulai dari Ringkasan walau hanya satu ruang kerja", () => {
  assert.equal(tujuanAwal(akun(["kepala_sekolah"], ["konten.terbitkan"])), "/admin");
});

test("tanpa akses (null) → tidak ada ruang kerja", () => {
  assert.deepEqual(ruangKerjaUntuk(null), []);
  assert.equal(tujuanAwal(null), "/admin");
});

test("ruang kerja aktif dipilih dari awalan terpanjang, bukan awalan parsial nama", () => {
  const semua = RUANG_KERJA;
  assert.equal(ruangKerjaAktif("/admin/absensi/disiplin/123", semua)?.kunci, "kesiswaan");
  assert.equal(ruangKerjaAktif("/admin/perpus/katalog", semua)?.kunci, "perpustakaan");
  // "/admin/siswa-lain" tidak boleh cocok dengan awalan "/admin/siswa"
  assert.equal(ruangKerjaAktif("/admin/siswa-lain", semua), null);
  assert.equal(ruangKerjaAktif("/admin", semua), null);
});

test("setiap ruang kerja menunjuk rute admin dan awalannya mencakup halaman awalnya", () => {
  for (const r of RUANG_KERJA) {
    assert.match(r.href, /^\/admin\//);
    assert.ok(r.awalan.some((a) => r.href === a || r.href.startsWith(a + "/")), r.kunci);
    assert.ok(r.izin.length > 0 && r.izin.every((i) => !i.endsWith(".lihat")), `${r.kunci}: hanya izin kelola`);
  }
});
