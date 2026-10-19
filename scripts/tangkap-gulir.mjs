// Tangkapan layar viewport pada beberapa posisi gulir (untuk memeriksa gerak & parallax), memakai Chrome terpasang.
// Pakai: node scripts/tangkap-gulir.mjs <base-url> <folder-keluar> [posisi1,posisi2,...] [lebar1,lebar2]
// Contoh: node scripts/tangkap-gulir.mjs http://localhost:3001 tangkapan/tahap-4 0,400,1200 1440,390
// Juga melaporkan: celah lapisan foto hero & foto dalam bingkai, elemen konten tersembunyi (opacity 0 / clip penuh), luber horizontal.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [base, keluar, posArg = "0,400,1200", lebarArg = "1440,390"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(base ?? "")) throw new Error("base harus http://localhost:<port>");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
fs.mkdirSync(keluar, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const laporan = [];
for (const lebar of lebarArg.split(",").map(Number)) {
  const ponsel = lebar < 700;
  const ctx = await browser.newContext({ viewport: { width: lebar, height: ponsel ? 844 : 900 }, deviceScaleFactor: 1, isMobile: ponsel, hasTouch: ponsel });
  await ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const galat = [];
  page.on("console", (m) => m.type() === "error" && galat.push(m.text()));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // animasi pembuka hero selesai (maks 1,6 s)
  for (const y of posArg.split(",").map(Number)) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(1300); // animasi masuk (0,9–1,2 s) selesai
    await page.screenshot({ path: path.join(keluar, `beranda-${lebar}-gulir-${y}.png`) });
    laporan.push({
      lebar,
      y,
      ...(await page.evaluate(() => {
        const hero = document.querySelector(".bk-hero")?.getBoundingClientRect();
        const lap = document.querySelector(".hb-lapisan")?.getBoundingClientRect();
        const terlihat = (r) => r.bottom > 0 && r.top < innerHeight;
        // konten di layar yang tersembunyi oleh animasi (seharusnya 0 setelah animasi selesai)
        const sembunyi = [...document.querySelectorAll("main h1, main h2, main p, main img, main a, main dd")]
          // foto diukur dari bingkainya (.media-slot): foto parallax 1.2x lebih besar dari bingkai yang memotongnya
          .filter((e) => terlihat((e.closest(".media-slot") ?? e).getBoundingClientRect()))
          .filter((e) => {
            const s = getComputedStyle(e);
            const klip = e.closest(".media-slot") && getComputedStyle(e.closest(".media-slot")).clipPath;
            return +s.opacity < 0.2 || (klip && klip.startsWith("inset(100%"));
          })
          .map((e) => e.tagName + "." + (e.className?.baseVal ?? e.className ?? "").toString().slice(0, 30));
        // foto parallax dalam bingkai: gambar harus selalu menutup bingkainya (tidak ada celah)
        const celahFoto = [...document.querySelectorAll(".bk-foto-berita .media-slot, .bk-mozaik .media-slot")]
          .filter((s) => terlihat(s.getBoundingClientRect()) && getComputedStyle(s).clipPath === "none")
          .map((s) => {
            const f = s.getBoundingClientRect();
            const g = s.querySelector("img")?.getBoundingClientRect();
            return g ? Math.max(g.top - f.top, f.bottom - g.bottom, g.left - f.left, f.right - g.right) : 0;
          })
          .filter((c) => c > 0.5)
          .map(Math.round);
        const tfFoto = [...document.querySelectorAll(".bk-foto-berita img, .bk-mozaik img")].filter((i) => terlihat(i.getBoundingClientRect())).map((i) => i.style.transform).slice(0, 3);
        return {
          celahFoto,
          tfFoto,
          celahHero: hero && lap && terlihat(hero) ? { atas: Math.round(lap.top - hero.top), bawah: Math.round(hero.bottom - lap.bottom) } : null,
          sembunyi,
          luber: document.documentElement.scrollWidth > innerWidth,
        };
      }, null)),
    });
  }
  laporan.push({ lebar, galatKonsol: galat });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(laporan, null, 1));
