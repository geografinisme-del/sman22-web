import { test } from "node:test";
import assert from "node:assert/strict";
import { bacaKonfigurasi, KONFIGURASI_BAWAAN, lepasWidget, periksaKompatibilitas, pindahkan, susunBagian, tambahWidget, tataEfektif } from "./konfigurasi.ts";
import { pilihOverlay, type Kandidat, type Kondisi, type Sesi } from "./overlay.ts";
import { PALET } from "./token.ts";

/* ---------------- validasi konfigurasi ---------------- */

test("konfigurasi kosong/rusak → bawaan lengkap, tidak melempar", () => {
  for (const raw of [undefined, null, "teks", 42, [], { tema: 5, beranda: "x" }]) {
    const k = bacaKonfigurasi(raw);
    assert.equal(k.tema, "langit");
    assert.equal(k.beranda[0].jenis, "hero");
    assert.ok(k.beranda.length >= 5);
  }
});

test("nilai di luar pilihan terkurasi ditolak (tidak ada warna/font bebas)", () => {
  const k = bacaKonfigurasi({ versi: 1, tema: "editorial", palet: "#ff00ff", font: "Comic Sans", gerak: "liar", slideshow: { gaya: "otomatis", detik: 2 } });
  assert.equal(k.tema, "langit", "tema yang belum tersedia tidak bisa dipilih → bawaan");
  assert.equal(k.palet, "cerah");
  assert.equal(k.font, "jakarta");
  assert.equal(k.gerak, "standar");
  assert.equal(k.slideshow.gaya, "otomatis");
  assert.equal(k.slideshow.detik, 8, "jeda autoplay < 7 detik ditolak");
});

test("widget: jenis tak dikenal dibuang, instans tunggal tidak digandakan, pengaturan dibatasi", () => {
  const k = bacaKonfigurasi({
    versi: 2,
    beranda: [
      { id: "x", jenis: "skrip", tampil: true, pengaturan: { html: "<script>" } },
      { id: "galeri", jenis: "galeri", tampil: true, pengaturan: { jumlah: 999, tata: "acak" } },
      { id: "galeri-lagi", jenis: "galeri", tampil: true, pengaturan: {} },
      { id: "berita", jenis: "berita", tampil: true, pengaturan: { jumlah: 2 } },
      { id: "berita", jenis: "berita", tampil: true, pengaturan: { jumlah: 3, kategori: "Prestasi" } },
    ],
  });
  assert.deepEqual(k.beranda.map((w) => w.jenis), ["hero", "galeri", "berita", "berita"]);
  const galeri = k.beranda[1].pengaturan;
  assert.equal(galeri.jumlah, 4, "jumlah di luar batas → bawaan");
  assert.equal(galeri.tata, "mozaik");
  assert.notEqual(k.beranda[2].id, k.beranda[3].id, "id ganda diberi id unik");
  assert.ok(!JSON.stringify(k).includes("script"));
});

test("pembuka wajib: selalu ada, selalu pertama, tidak bisa disembunyikan atau dilepas", () => {
  const k = bacaKonfigurasi({ versi: 1, beranda: [{ id: "kontak", jenis: "kontak" }, { id: "hero", jenis: "hero", tampil: false }] });
  assert.equal(k.beranda[0].jenis, "hero");
  assert.equal(k.beranda[0].tampil, true);
  assert.equal(lepasWidget(k.beranda, "hero")[0].jenis, "hero");
  assert.equal(pindahkan(k.beranda, 0, 1)[0].jenis, "hero");
});

test("versi lama (tanpa versi & susunan) dimigrasikan ke susunan bawaan; tema arsip → Langit cerah", () => {
  const k = bacaKonfigurasi({ tema: "modern" });
  assert.equal(k.versi, 2);
  assert.equal(k.tema, "langit", "tema lama yang diarsipkan tidak pernah tampil lagi");
  assert.deepEqual(k.beranda.map((w) => w.jenis), KONFIGURASI_BAWAAN.beranda.map((w) => w.jenis));
});

/* ---------------- operasi editor ---------------- */

test("pindah & lepas widget hanya mengubah susunan", () => {
  const awal = KONFIGURASI_BAWAAN.beranda;
  const iKontak = awal.findIndex((w) => w.jenis === "kontak");
  const pindah = pindahkan(awal, iKontak, 1);
  assert.equal(pindah[1].jenis, "kontak");
  assert.equal(pindah.length, awal.length);
  const lepas = lepasWidget(awal, "galeri");
  assert.equal(lepas.length, awal.length - 1);
  assert.ok(!lepas.some((w) => w.id === "galeri"));
  // operasi tidak mengubah array asal
  assert.equal(awal.some((w) => w.id === "galeri"), true);
});

test("tambah widget: instans tunggal ditolak, berita boleh beberapa dengan id unik", () => {
  const awal = KONFIGURASI_BAWAAN.beranda;
  assert.equal(tambahWidget(awal, "galeri").length, awal.length);
  const dua = tambahWidget(tambahWidget(awal, "berita"), "berita");
  const ids = dua.filter((w) => w.jenis === "berita").map((w) => w.id);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
});

/* ---------------- tema & fallback ---------------- */

test("konfigurasi dari tema lama dipertahankan; tata letak tak didukung → fallback + peringatan", () => {
  const lama = bacaKonfigurasi({ versi: 1, tema: "modern", beranda: [{ id: "hero", jenis: "hero", pengaturan: { tata: "penuh" } }] });
  assert.equal(lama.tema, "langit");
  assert.equal(lama.beranda[0].pengaturan.tata, "penuh", "pilihan widget tetap tersimpan");
  assert.equal(tataEfektif("langit", lama.beranda[0]), "langit");
  assert.equal(periksaKompatibilitas(lama).length, 1);
  const baru = bacaKonfigurasi({ versi: 1, beranda: [{ id: "hero", jenis: "hero", pengaturan: { tata: "langit" } }] });
  assert.deepEqual(periksaKompatibilitas(baru), []);
});

test("pasangan bersebelahan digabung, yang tersembunyi tidak ikut", () => {
  const k = bacaKonfigurasi({
    versi: 2,
    beranda: [
      { id: "hero", jenis: "hero" },
      { id: "pengumuman", jenis: "pengumuman" },
      { id: "layanan", jenis: "layanan" },
      { id: "berita", jenis: "berita" },
      { id: "galeri", jenis: "galeri", tampil: false },
      { id: "agenda", jenis: "agenda" },
    ],
  });
  assert.deepEqual(susunBagian(k).map((b) => b.map((w) => w.jenis).join("+")), ["hero", "pengumuman+layanan", "berita+agenda"]);
});

test("palet terkurasi lolos kontras WCAG AA (≥ 4,5:1) untuk teks di atas putih", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const [k, p] of Object.entries(PALET).filter(([k]) => k === "cerah")) {
    const rasio = (1 + 0.05) / (lum(p.utama) + 0.05);
    assert.ok(rasio >= 4.5, `${k}: ${rasio.toFixed(2)}`);
  }
});

/* ---------------- pemilihan overlay ---------------- */

const semua: Kandidat = { prioritas: true, rutin: true, pemandu: true };
const sesiBaru: Sesi = { prioritasTampil: false, rutinTampil: false, sapaTampil: false };
const atas: Kondisi = { pembukaTerlihat: true, lewatPembuka: false, progres: 0, sedangMengisi: false, dialogLainTerbuka: false, overlayTampil: false };

test("prioritas lebih dulu, hanya setelah pembuka terlihat", () => {
  assert.equal(pilihOverlay(semua, sesiBaru, { ...atas, pembukaTerlihat: false }), null);
  assert.equal(pilihOverlay(semua, sesiBaru, atas), "prioritas");
});

test("tidak pernah dua overlay sekaligus & tidak muncul saat mengisi formulir/dialog lain terbuka", () => {
  assert.equal(pilihOverlay(semua, sesiBaru, { ...atas, overlayTampil: true }), null);
  assert.equal(pilihOverlay(semua, sesiBaru, { ...atas, sedangMengisi: true }), null);
  assert.equal(pilihOverlay(semua, sesiBaru, { ...atas, dialogLainTerbuka: true }), null);
});

test("setelah modal prioritas tampil, panel rutin tidak otomatis di sesi yang sama", () => {
  const setelah = { ...sesiBaru, prioritasTampil: true, sapaTampil: true };
  assert.equal(pilihOverlay(semua, setelah, { ...atas, lewatPembuka: true, progres: 0.5 }), null);
});

test("panel rutin: sekali per sesi, setelah pembuka terlewati & ±25% halaman", () => {
  const k = { prioritas: false, rutin: true, pemandu: false };
  assert.equal(pilihOverlay(k, sesiBaru, { ...atas, lewatPembuka: true, progres: 0.2 }), null);
  assert.equal(pilihOverlay(k, sesiBaru, { ...atas, lewatPembuka: true, progres: 0.3 }), "rutin");
  assert.equal(pilihOverlay(k, { ...sesiBaru, rutinTampil: true }, { ...atas, lewatPembuka: true, progres: 0.6 }), null);
});

test("lambaian pemandu sekali per sesi, hanya di bagian atas & bila tak ada yang lebih penting", () => {
  const k = { prioritas: false, rutin: true, pemandu: true };
  assert.equal(pilihOverlay(k, sesiBaru, atas), "sapa");
  assert.equal(pilihOverlay(k, { ...sesiBaru, sapaTampil: true }, atas), null);
  assert.equal(pilihOverlay({ ...k, pemandu: false }, sesiBaru, atas), null);
});

test("tanpa data: tidak ada popup kosong", () => {
  assert.equal(pilihOverlay({ prioritas: false, rutin: false, pemandu: false }, sesiBaru, { ...atas, lewatPembuka: true, progres: 0.9 }), null);
});

test("konfigurasi versi 1 mendapat widget tur setelah hero; versi 2 menghormati tur yang dilepas", () => {
  const lama = bacaKonfigurasi({ versi: 1, beranda: [{ id: "hero", jenis: "hero" }, { id: "berita", jenis: "berita" }] });
  assert.deepEqual(lama.beranda.map((w) => w.jenis), ["hero", "tur", "berita"]);
  assert.equal(lama.versi, 2);
  const baru = bacaKonfigurasi({ versi: 2, beranda: [{ id: "hero", jenis: "hero" }, { id: "berita", jenis: "berita" }] });
  assert.deepEqual(baru.beranda.map((w) => w.jenis), ["hero", "berita"]);
});
