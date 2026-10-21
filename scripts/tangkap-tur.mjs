// Tangkapan beranda "Langit cerah" pada posisi penting: gulir 0, saat awan tur, titik 2, titik terakhir, bento angka.
// Juga melaporkan keadaan tur (mode, kartu aktif, opacity awan) di tiap posisi.
// Pakai: node scripts/tangkap-tur.mjs <base-url> <folder-keluar> [lebar1,lebar2]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [base, keluar, lebarArg = "1440,390"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(base ?? "")) throw new Error("base harus http://localhost:<port>");
fs.mkdirSync(keluar, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const laporan = [];
for (const lebar of lebarArg.split(",").map(Number)) {
  const ponsel = lebar < 700;
  const ctx = await browser.newContext({ viewport: { width: lebar, height: ponsel ? 844 : 900 }, isMobile: ponsel, hasTouch: ponsel });
  await ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // muat mesin tur (dimuat saat section mendekati layar)
  await page.evaluate(() => document.querySelector("#tur")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(1500);
  const posisi = await page.evaluate(() => {
    const tur = document.querySelector("#tur");
    const n = document.querySelectorAll(".tur-item").length;
    const atas = tur ? tur.getBoundingClientRect().top + scrollY : 0;
    const rentang = tur ? tur.offsetHeight - innerHeight : 0;
    const p = (pr) => Math.round(atas + rentang * pr);
    const bento = document.querySelector("#judul-angka")?.closest("section");
    return {
      mode: tur?.dataset.mode,
      n,
      daftar: [
        ["gulir-0", 0],
        ["awan", tur?.dataset.mode === "sticky" ? p(0.03) : Math.round(atas)],
        ["titik-2", tur?.dataset.mode === "sticky" ? p(0.1 + (0.9 * 2.15) / n) : Math.round(document.querySelectorAll(".tur-item")[2]?.getBoundingClientRect().top + scrollY - 80)],
        ["titik-terakhir", tur?.dataset.mode === "sticky" ? p(0.999) : Math.round(document.querySelectorAll(".tur-item")[n - 1]?.getBoundingClientRect().top + scrollY - 80)],
        ["bento", bento ? Math.round(bento.getBoundingClientRect().top + scrollY) : 0],
      ],
    };
  });
  for (const [nama, y] of posisi.daftar) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(keluar, `beranda-${lebar}-${nama}.png`) });
    laporan.push({
      lebar,
      nama,
      y,
      ...(await page.evaluate(() => ({
        mode: document.querySelector("#tur")?.dataset.mode,
        kartuAktif: [...document.querySelectorAll(".tur-kartu")].findIndex((k) => k.hasAttribute("data-aktif")),
        penandaAktif: [...document.querySelectorAll(".tur-penanda li")].findIndex((k) => k.hasAttribute("data-aktif")),
        awan: getComputedStyle(document.querySelector(".tur-awan") ?? document.body).opacity,
        luber: document.documentElement.scrollWidth > innerWidth,
      }))),
    });
  }
  await ctx.close();
}
await browser.close();
for (const l of laporan) console.log(JSON.stringify(l));
