// Uji "Langit cerah" Tahap A (lokal saja): kartu putar 3D, menu layar penuh, header di atas hero.
// Pakai: node scripts/uji-e2e/uji-langit.mjs <base-url>
import { chromium } from "playwright-core";

const [BASE] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const bersih = (ctx) =>
  ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
const depan = (page) => page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot")].findIndex((s) => s.hasAttribute("data-depan")));
const sudut = (page) => page.evaluate(() => document.querySelector(".lgt-cincin")?.style.transform ?? "");

// ---------- desktop 1440 ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(800);
  cek("desktop: kartu dalam mode cincin 3D", (await page.getAttribute(".lgt-cincin-wadah", "data-mode")) === "cincin", null);
  const n = await page.locator(".lgt-cincin-slot").count();
  cek("12 kartu tampil", n === 12, n);

  // putar otomatis (mouse jauh dari cincin)
  await page.mouse.move(5, 5);
  const a1 = await sudut(page);
  await tidur(900);
  const a2 = await sudut(page);
  cek("berputar otomatis", a1 !== a2, { a1, a2 });

  // berhenti saat hover
  const box = await page.locator(".lgt-cincin-panggung").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await tidur(300);
  const h1 = await sudut(page);
  await tidur(700);
  cek("berhenti saat hover", h1 === (await sudut(page)), null);

  // tombol → menggeser tepat 1 kartu
  const d0 = await depan(page);
  await page.click(".lgt-cincin-kontrol button[aria-label='Kartu berikutnya']");
  await tidur(900);
  const d1 = await depan(page);
  cek("tombol → = tepat 1 kartu", d1 === (d0 + 1) % n, { d0, d1 });
  await page.click(".lgt-cincin-kontrol button[aria-label='Kartu sebelumnya']");
  await tidur(900);
  cek("tombol ← = kembali 1 kartu", (await depan(page)) === d0, { d0, now: await depan(page) });

  // klik kartu samping = putar ke tengah (tidak berpindah halaman)
  const samping = (d0 + 1) % n;
  const url0 = page.url();
  await page.locator(".lgt-cincin-slot").nth(samping).locator("a").click({ force: true });
  await tidur(900);
  cek("klik kartu samping memutarnya ke tengah", (await depan(page)) === samping && page.url() === url0, { depan: await depan(page), samping, url: page.url() });

  // seret > 6px bukan klik, dan memutar cincin
  // klik tombol menggulir halaman; kembalikan ke atas agar titik seret tidak tertutup header
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await tidur(300);
  const sebelum = await sudut(page);
  const b = await page.locator(".lgt-cincin-slot").nth(samping).boundingBox();
  const ty = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width / 2, ty);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 120, ty, { steps: 8 });
  await page.mouse.up();
  await tidur(400);
  const sesudah = await sudut(page);
  cek("seret memutar cincin & tidak membuka tautan", sesudah !== sebelum && page.url() === url0, { url: page.url(), sebelum, sesudah });

  // fokus keyboard memutar kartu ke tengah
  await tidur(3500);
  await page.mouse.move(5, 5);
  const target = (d0 + 4) % n;
  // fokus keyboard sungguhan: fokus ke kartu sebelumnya (tanpa :focus-visible), lalu tekan Tab
  await page.locator(".lgt-cincin-slot").nth(target - 1).locator("a").focus();
  await page.keyboard.press("Tab");
  await tidur(1000);
  cek("fokus keyboard memutar kartu ke tengah", (await depan(page)) === target, { depan: await depan(page), target });

  // klik kartu tengah = buka tautan
  const href = await page.locator(".lgt-cincin-slot").nth(target).locator("a").getAttribute("href");
  await page.mouse.move(5, 5);
  await page.locator(".lgt-cincin-slot").nth(target).locator("a").click();
  await page.waitForURL((u) => u.pathname + u.search === href || u.href.endsWith(href), { timeout: 8000 }).catch(() => {});
  cek("klik kartu tengah membuka tautannya", page.url().endsWith(href), { href, url: page.url() });

  // header: transparan di atas hero, putih setelah melewati hero
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(500);
  const atas = await page.evaluate(() => ({ terang: document.querySelector(".lgt-header").hasAttribute("data-terang"), warna: getComputedStyle(document.querySelector(".lgt-merek")).color }));
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("[data-hero-langit]").offsetHeight + 50, behavior: "instant" }));
  await tidur(400);
  const bawah = await page.evaluate(() => ({ lewat: document.querySelector(".lgt-header").hasAttribute("data-lewat"), warna: getComputedStyle(document.querySelector(".lgt-merek")).color, latar: getComputedStyle(document.querySelector(".lgt-header")).backgroundColor }));
  cek("header teks putih di atas hero", atas.terang && atas.warna === "rgb(255, 255, 255)", atas);
  cek("header putih 90% + teks tinta setelah hero", bawah.lewat && bawah.warna !== "rgb(255, 255, 255)" && bawah.latar.includes("0.9"), bawah);

  // cincin berhenti saat hero tidak terlihat
  const t1 = await sudut(page);
  await tidur(700);
  cek("cincin berhenti saat hero di luar layar", t1 === (await sudut(page)), null);
  await ctx.close();
}

// ---------- HP 390 & reduced motion: baris geser ----------
for (const [nama, opsi] of [
  ["HP 390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ["reduced motion", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }],
]) {
  const ctx = await browser.newContext(opsi);
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(600);
  const k = await page.evaluate(() => ({
    mode: document.querySelector(".lgt-cincin-wadah")?.dataset.mode,
    snap: getComputedStyle(document.querySelector(".lgt-cincin")).scrollSnapType,
    tf: document.querySelector(".lgt-cincin").style.transform,
    luber: document.documentElement.scrollWidth > innerWidth,
  }));
  cek(`${nama}: baris geser scroll-snap tanpa 3D`, k.mode === "baris" && k.snap.startsWith("x") && !k.tf, k);
  cek(`${nama}: tidak ada luber horizontal`, !k.luber, k);
  await ctx.close();
}

// ---------- tanpa JavaScript ----------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const k = await page.evaluate(() => ({
    judul: document.querySelector("#judul-hero")?.textContent,
    kartu: document.querySelectorAll("[data-hero-langit] .lgt-kartu").length,
    navFooter: !!document.querySelector("#navigasi-situs a"),
    tautanMenu: document.querySelector(".lgt-pil a")?.getAttribute("href"),
  }));
  cek("tanpa JS: judul, 12 kartu, dan navigasi footer terbaca", /Tempat tumbuh/.test(k.judul ?? "") && k.kartu === 12 && k.navFooter && k.tautanMenu === "#navigasi-situs", k);
  await ctx.close();
}

await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
