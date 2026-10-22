// Tangkapan layar area tab & header halaman admin (Sarpras, Perpustakaan, Alumni, Mutu, Ekskul) di 1440 & 390.
// Pakai: node scripts/uji-e2e/tangkap-tab.mjs <base-url> <akun-uji.json> <folder-keluar> <awalan-nama>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, berkasAkun, keluar, awalan = "tab"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
fs.mkdirSync(keluar, { recursive: true });
const HALAMAN = [
  ["sarpras", "/admin/sarpras"],
  ["perpus", "/admin/perpus"],
  ["alumni", "/admin/alumni"],
  ["mutu", "/admin/mutu"],
  ["ekskul", "/admin/ekskul"],
];
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const lebar of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: lebar < 700 ? 844 : 900 }, deviceScaleFactor: lebar < 700 ? 2 : 1, isMobile: lebar < 700, hasTouch: lebar < 700 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", "admin@sman22.test");
  await page.fill("input[name=password]", AKUN.admin);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/admin"), { timeout: 30000 });
  for (const [nama, u] of HALAMAN) {
    await page.goto(BASE + u, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    // potong area judul + tab (bagian atas konten utama)
    const main = page.locator("main").first();
    const kotak = await main.boundingBox();
    const tinggi = Math.min(lebar < 700 ? 520 : 360, kotak.height);
    await page.screenshot({ path: path.join(keluar, `${awalan}-${nama}-${lebar}.png`), clip: { x: kotak.x, y: kotak.y, width: Math.min(kotak.width, lebar - kotak.x), height: tinggi } });
    // ukuran tombol tab (tinggi & lebar) untuk bukti simetris
    const ukuran = await page.evaluate(() => {
      const kandidat = [...document.querySelectorAll("main nav a, main [role=tablist] [role=tab]")].slice(0, 8);
      return kandidat.map((a) => {
        const r = a.getBoundingClientRect();
        return { teks: a.textContent.trim().slice(0, 20), tinggi: Math.round(r.height * 10) / 10, aktif: a.getAttribute("aria-selected") === "true" || a.getAttribute("aria-current") === "page" || /bg-ink|text-white/.test(a.className) };
      });
    });
    console.log(lebar, nama, JSON.stringify(ukuran));
  }
  await ctx.close();
}
await browser.close();
