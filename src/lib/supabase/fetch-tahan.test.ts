import { test } from "node:test";
import assert from "node:assert/strict";
import { bolehUlang } from "./fetch-tahan.ts";

const galat = (code: string, message = "") => Object.assign(new TypeError("fetch failed"), { cause: { code, message } });

test("GET/HEAD diulang untuk sambungan basi (other side closed, ECONNRESET, ETIMEDOUT)", () => {
  assert.equal(bolehUlang(galat("UND_ERR_SOCKET", "other side closed"), "GET"), true);
  assert.equal(bolehUlang(galat("ECONNRESET"), "HEAD"), true);
  assert.equal(bolehUlang(galat("ETIMEDOUT"), "get"), true);
});

test("POST hanya diulang bila request pasti belum terkirim", () => {
  assert.equal(bolehUlang(galat("UND_ERR_SOCKET", "other side closed"), "POST"), false);
  assert.equal(bolehUlang(galat("ETIMEDOUT"), "POST"), false);
  assert.equal(bolehUlang(galat("ECONNRESET", "Client network socket disconnected before secure TLS connection was established"), "POST"), true);
  assert.equal(bolehUlang(galat("ECONNREFUSED"), "PATCH"), true);
});

test("galat lain (bukan sambungan) tidak diulang", () => {
  assert.equal(bolehUlang(new Error("x"), "GET"), false);
  assert.equal(bolehUlang(galat("ERR_INVALID_URL"), "GET"), false);
  assert.equal(bolehUlang(new TypeError("fetch failed"), "GET"), false);
});

test("dispatcher fetch diganti saat pertama kali & setelah jeda > JEDA_BASI, tidak saat masih aktif", async () => {
  const { segarkanSambungan, aturUlangStatusSambungan, JEDA_BASI } = await import("./fetch-tahan.ts");
  const SIM = Symbol.for("undici.globalDispatcher.1");
  let ditutup = 0;
  class Agent {
    opsi: unknown;
    constructor(opsi?: unknown) {
      this.opsi = opsi;
    }
    close() {
      ditutup++;
      return Promise.resolve();
    }
  }
  const wadah: Record<symbol, unknown> = { [SIM]: new Agent() };
  aturUlangStatusSambungan();
  assert.equal(segarkanSambungan(1_000, wadah), true, "pertama kali: pasang Agent ber-keep-alive pendek");
  const a1 = wadah[SIM] as Agent;
  assert.deepEqual(a1.opsi, { keepAliveTimeout: 2_000, keepAliveMaxTimeout: 10_000 });
  assert.equal(segarkanSambungan(1_500, wadah), false, "belum ada aktivitas tercatat → tidak diganti");
  // catat aktivitas lewat fetchTahan tidak mungkin di uji ini; simulasikan dengan memanggil ulang setelah jeda
  const { fetchTahan } = await import("./fetch-tahan.ts");
  const asli = globalThis.fetch;
  globalThis.fetch = (async () => new Response("ok")) as typeof fetch;
  try {
    await fetchTahan("https://contoh.test/");
  } finally {
    globalThis.fetch = asli;
  }
  const t = Date.now();
  assert.equal(segarkanSambungan(t + 1_000, wadah), false, "jeda pendek → sambungan tetap dipakai");
  assert.equal(segarkanSambungan(t + JEDA_BASI + 1, wadah), true, "jeda panjang (mis. fungsi dibekukan) → Agent baru");
  assert.equal(segarkanSambungan(t + JEDA_BASI + 5, wadah), false, "permintaan paralel berikutnya tidak mengganti lagi");
  assert.notEqual(wadah[SIM], a1);
  assert.equal(ditutup, 2, "Agent lama ditutup halus");
  aturUlangStatusSambungan();
});

test("tanpa dispatcher Agent (lingkungan lain): tidak melakukan apa-apa", async () => {
  const { segarkanSambungan, aturUlangStatusSambungan } = await import("./fetch-tahan.ts");
  aturUlangStatusSambungan();
  assert.equal(segarkanSambungan(1_000, {}), false);
  class BukanAgent {}
  assert.equal(segarkanSambungan(1_000, { [Symbol.for("undici.globalDispatcher.1")]: new BukanAgent() }), false);
  aturUlangStatusSambungan();
});
