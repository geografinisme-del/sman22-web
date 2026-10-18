// Uji gerak beranda Buku Tahunan (lokal saja): tanpa JavaScript konten tetap terlihat; dengan reduced-motion
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
      judul: document.querySelector(".bk-hero h1")?.textContent?.trim(),
      opHero: op(".bk-hero .bk-label, .bk-hero-fakta, .bk-hero-aksi, .bk-hero-isi"),
      tfBaris: tf(".bk-baris"),
      tfLapisan: tf(".hb-lapisan"),
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
  cek("tanpa JS: judul hero terbaca", k.judul === "SMA Negeri 22 Bandung", k.judul);
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
  cek("reduced-motion: hero langsung tampil tanpa animasi", k.opHero.every((o) => o === 1) && k.tfBaris.every((t) => t === "none"), k);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await page.waitForTimeout(400);
  k = await keadaan(page);
  cek("reduced-motion: tanpa parallax", k.tfLapisan.every((t) => t === "none") && k.opHero.every((o) => o === 1), k);
  cek("reduced-motion: foto tidak dipotong animasi", k.klip.every((c) => c === "none"), k.klip);
  await ctx.close();
}
// 3. layar sempit: animasi boleh, parallax tidak
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await page.waitForTimeout(600);
  const k = await keadaan(page);
  cek("390px: tanpa parallax hero", k.tfLapisan.every((t) => t === "none"), k.tfLapisan);
  const celah = await page.evaluate(() => {
    const h = document.querySelector(".bk-hero").getBoundingClientRect();
    const l = document.querySelector(".hb-lapisan").getBoundingClientRect();
    return [l.top - h.top, h.bottom - l.bottom];
  });
  cek("390px: lapisan foto menutup hero", celah.every((c) => Math.abs(c) < 1), celah);
  await ctx.close();
}
await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
