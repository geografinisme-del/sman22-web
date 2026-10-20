// Uji gerak beranda (lokal saja): tanpa JavaScript konten tetap terlihat; dengan reduced-motion
// tidak ada animasi/parallax; pada lebar <900px tidak ada parallax.
// Pakai: node scripts/uji-e2e/uji-gerak.mjs <base-url>
import { chromium } from "playwright-core";

const [BASE] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const keadaan = (page) =>
  page.evaluate(() => {
    const op = (s) => [...document.querySelectorAll(s)].map((e) => +getComputedStyle(e).opacity);
    const tf = (s) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e).transform);
    return {
      judul: document.querySelector("#judul-hero")?.textContent?.trim(),
      opHero: op(".lgt-hero [data-masuk]"),
      animHero: [...document.querySelectorAll(".lgt-hero [data-masuk]")].reduce((n, e) => n + e.getAnimations().length, 0),
      awan: [...document.querySelectorAll(".lgt-awan svg")].map((e) => getComputedStyle(e).animationName),
      cincin: document.querySelector(".lgt-cincin-wadah")?.dataset.mode,
      klip: [...document.querySelectorAll(".bk-foto-berita .media-slot, .bk-mozaik .media-slot")].map((e) => getComputedStyle(e).clipPath),
      angka: [...document.querySelectorAll(".bk-angka-nilai")].map((e) => [e.textContent, e.dataset.angka]),
      garis: tf(".bk-garis-emas"),
    };
  });

// 1. tanpa JavaScript
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const k = await keadaan(page);
  cek("tanpa JS: judul hero terbaca", /^Tempat tumbuh yang berakhlak/.test(k.judul ?? ""), k.judul);
  cek("tanpa JS: teks hero tidak disembunyikan", k.opHero.every((o) => o === 1), k.opHero);
  cek("tanpa JS: foto tidak terpotong", k.klip.every((c) => c === "none"), k.klip);
  cek("tanpa JS: angka asli tampil", k.angka.every(([t, a]) => t === a), k.angka);
  cek("tanpa JS: garis emas tampil penuh", k.garis.every((t) => t === "none"), k.garis);
  await ctx.close();
}
// 2. prefers-reduced-motion: reduce — tidak ada animasi sama sekali
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  let k = await keadaan(page);
  cek("reduced-motion: hero langsung tampil tanpa animasi masuk", k.opHero.every((o) => o === 1) && k.animHero === 0, k);
  cek("reduced-motion: awan diam & kartu tanpa putaran 3D", k.awan.every((a) => a === "none") && k.cincin === "baris", k);
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
  await page.waitForTimeout(400);
  k = await keadaan(page);
  cek("reduced-motion: foto tidak dipotong animasi", k.klip.every((c) => c === "none"), k.klip);
  await ctx.close();
}
// 3. layar sempit: kartu baris geser, tanpa 3D
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const k = await keadaan(page);
  cek("390px: kartu baris geser (tanpa cincin 3D)", k.cincin === "baris", k.cincin);
  cek("390px: tanpa luber horizontal", !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), null);
  await ctx.close();
}
await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
