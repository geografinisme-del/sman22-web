import { test } from "node:test";
import assert from "node:assert/strict";
import { E_LEARNING_BAWAAN, navigasi, navigasiDengan, tautanELearning } from "./menu.ts";

const anak = (label: string) => navigasi.find((g) => g.label === label)!.anak!;

test("menu Layanan: tanpa Portal Digital 22, urutan sesuai, semua berketerangan", () => {
  const l = anak("Layanan");
  assert.deepEqual(
    l.map((x) => x.label),
    ["E-Library", "Pengaduan & aspirasi", "Verifikasi sertifikat", "Survei layanan"],
  );
  assert.ok(l.every((x) => x.teks));
});

test("E-Learning hanya di Pembelajaran, E-Library hanya di Layanan (masing-masing sekali)", () => {
  const semua = navigasi.flatMap((g) => (g.anak ?? []).map((a) => ({ grup: g.label, label: a.label })));
  assert.deepEqual(semua.filter((x) => x.label === "E-Learning").map((x) => x.grup), ["Pembelajaran"]);
  assert.deepEqual(semua.filter((x) => x.label === "E-Library").map((x) => x.grup), ["Layanan"]);
});

test("tautanELearning: URL CMS dipakai bila aman, selain itu halaman penjelasan", () => {
  assert.equal(tautanELearning(undefined), E_LEARNING_BAWAAN);
  assert.equal(tautanELearning([{ nama: "E-Learning", url: "" }]), E_LEARNING_BAWAAN);
  assert.equal(tautanELearning([{ nama: "E-Learning", url: "https://lms.contoh.sch.id" }]), "https://lms.contoh.sch.id");
  assert.equal(tautanELearning([{ nama: "elearning", url: "/portal/kelas" }]), "/portal/kelas");
  assert.equal(tautanELearning([{ nama: "E-Learning", url: "javascript:alert(1)" }]), E_LEARNING_BAWAAN);
  assert.equal(tautanELearning([{ nama: "E-Learning", url: "//evil.example" }]), E_LEARNING_BAWAAN);
  assert.equal(tautanELearning([{ nama: "E-Learning", url: "http://tidak-aman.example" }]), E_LEARNING_BAWAAN);
});

test("navigasiDengan mengganti tujuan E-Learning saja", () => {
  const n = navigasiDengan("https://lms.contoh.sch.id");
  const e = n.flatMap((g) => g.anak ?? []).find((a) => a.label === "E-Learning")!;
  assert.equal(e.href, "https://lms.contoh.sch.id");
  assert.equal(n.flatMap((g) => g.anak ?? []).filter((a) => a.href === E_LEARNING_BAWAAN).length, 0);
});
