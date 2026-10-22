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
