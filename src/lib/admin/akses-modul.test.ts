import { test } from "node:test";
import assert from "node:assert/strict";
import { akunDilindungi, BOLEH, peranDasar } from "./akses-modul.ts";

const akun = (peran: string[], izin: string[] = []) => ({ peran, izin });

test("modul mengajar hanya untuk peran pengajar", () => {
  assert.equal(BOLEH.mengajar(akun(["guru"])), true);
  assert.equal(BOLEH.mengajar(akun(["wali_kelas"])), true);
  assert.equal(BOLEH.mengajar(akun(["waka_sarpras"], ["sarpras.kelola"])), false);
  assert.equal(BOLEH.mengajar(akun(["pegawai"])), false);
});

test("struktur kurikulum: pengajar & bidang kurikulum, bukan waka lain", () => {
  assert.equal(BOLEH.strukturKurikulum(akun(["waka_kurikulum"], ["kurikulum.kelola"])), true);
  assert.equal(BOLEH.strukturKurikulum(akun(["kepala_sekolah"], ["supervisi.kelola"])), true);
  assert.equal(BOLEH.strukturKurikulum(akun(["waka_humas"], ["humas.kelola"])), false);
  assert.equal(BOLEH.strukturKurikulum(akun(["waka_sarpras"], ["sarpras.kelola"])), false);
});

test("data humas: kelola atau lihat; dasbor humas untuk pengelola humas & pengaduan umum, bukan penangan rahasia saja", () => {
  assert.equal(BOLEH.dataHumas(akun(["kepala_sekolah"], ["humas.lihat"])), true);
  assert.equal(BOLEH.dataHumas(akun(["bk"], ["pengaduan.rahasia"])), false);
  assert.equal(BOLEH.dasborHumas(akun(["bk"], ["pengaduan.rahasia"])), false);
  assert.equal(BOLEH.dasborHumas(akun(["waka_kesiswaan"], ["pengaduan.rahasia", "kesiswaan.kelola"])), false);
  assert.equal(BOLEH.dasborHumas(akun(["super_admin"], ["pengaduan.metadata"])), true);
});

test("Pengguna & Peran: super admin & operator saja", () => {
  assert.equal(BOLEH.penggunaPeran(akun(["super_admin"], ["pengguna.kelola"])), true);
  assert.equal(BOLEH.penggunaPeran(akun(["operator"], ["pengguna.kelola_dasar"])), true);
  assert.equal(BOLEH.penggunaPeran(akun(["kepala_sekolah"], ["audit.baca"])), false);
});

test("peran dasar & akun dilindungi (sama dengan fungsi database)", () => {
  for (const p of ["guru", "wali_kelas", "piket", "pegawai", "laboran", "siswa", "orang_tua"]) assert.equal(peranDasar(p), true, p);
  for (const p of ["super_admin", "kepala_sekolah", "bk", "operator", "waka_kurikulum", "waka_humas"]) assert.equal(peranDasar(p), false, p);
  assert.equal(akunDilindungi(["guru", "piket"]), false);
  assert.equal(akunDilindungi(["guru", "bk"]), true);
  assert.equal(akunDilindungi([]), false);
});
