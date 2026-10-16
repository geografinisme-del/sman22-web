// Tangkapan layar halaman penuh dengan Playwright (memakai Chrome yang terpasang, tanpa unduh browser).
// Pakai: node scripts/tangkap-playwright.mjs <base-url> <folder-keluar> <jalur1,jalur2,...> [lebar1,lebar2]
// Contoh: node scripts/tangkap-playwright.mjs http://localhost:3000 tinjauan-desain/tahap-1 /,/spesimen 1440,390
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [base, keluar, daftar, lebarArg = "1440,390"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(base ?? "")) throw new Error("base harus http://localhost:<port>");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
fs.mkdirSync(keluar, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const laporan = [];
for (const lebar of lebarArg.split(",").map(Number)) {
  const ponsel = lebar < 700;
  const ctx = await browser.newContext({ viewport: { width: lebar, height: ponsel ? 844 : 900 }, deviceScaleFactor: 1, isMobile: ponsel, hasTouch: ponsel });
  // tangkapan bersih: overlay otomatis (modal/panel/lambaian) dianggap sudah tampil di sesi ini
  await ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  for (const jalur of daftar.split(",")) {
    await page.goto(base + jalur, { waitUntil: "networkidle" });
    // gulir sekali agar gambar lazy & elemen yang muncul saat digulir ikut termuat
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const nama = `${jalur === "/" ? "beranda" : jalur.replace(/^\//, "").replace(/[/?=&]/g, "_")}-${lebar}.png`;
    await page.screenshot({ path: path.join(keluar, nama), fullPage: true });
    const cek = await page.evaluate(() => ({
      luber: document.documentElement.scrollWidth > window.innerWidth,
      huruf: [...new Set([...document.querySelectorAll("h1,h2,p")].slice(0, 30).map((e) => getComputedStyle(e).fontFamily.split(",")[0]))],
    }));
    laporan.push({ jalur, lebar, berkas: nama, ...cek });
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(laporan, null, 1));
