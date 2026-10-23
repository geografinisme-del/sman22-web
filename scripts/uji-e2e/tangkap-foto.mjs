// Tangkapan layar halaman bergambar (sebelum/sesudah penggantian foto) di 1440 px dan 390 px. BACA-SAJA.
// Pakai: node scripts/uji-e2e/tangkap-foto.mjs <base-url> <folder-keluar> <awalan>   (mis. sebelum / sesudah)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar, awalan = "foto"] = process.argv.slice(2);
fs.mkdirSync(keluar, { recursive: true });
const LAYAR = [
  { nama: "1440", width: 1440, height: 900 },
  { nama: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
];
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
/** tutup pengumuman prioritas (modal) agar tidak menutupi tangkapan */
async function tutupModal(page) {
  const tutup = page.getByRole("button", { name: "Tutup", exact: true });
  if (await tutup.count()) await tutup.first().click().catch(() => {});
  await page.waitForTimeout(300);
}
async function gulirSemua(page) {
  await tutupModal(page);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle").catch(() => {});
}

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const l of LAYAR) {
  const ctx = await browser.newContext({ viewport: { width: l.width, height: l.height }, isMobile: l.isMobile, hasTouch: l.hasTouch, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const simpan = (nama, opsi = {}) => page.screenshot({ path: path.join(keluar, `${awalan}-${nama}-${l.nama}.png`), ...opsi });

  // beranda (penuh) + tur sekolah (mode daftar karena reduced motion → semua titik terlihat)
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await gulirSemua(page);
  await simpan("beranda", { fullPage: true });
  const tur = await page.$("#tur");
  if (tur) {
    await tur.scrollIntoViewIfNeeded();
    await tunggu(800);
    await tur.screenshot({ path: path.join(keluar, `${awalan}-tur-${l.nama}.png`) });
  }
  // mega menu (desktop: Profil, Pembelajaran, Kehidupan Siswa) / menu HP
  await page.evaluate(() => window.scrollTo(0, 0));
  await tutupModal(page);
  const tombol = l.width >= 1024 ? ["Profil", "Pembelajaran", "Kehidupan Siswa"] : ["Menu"];
  for (const t of tombol) {
    const ok = await page.evaluate((t) => {
      const b = [...document.querySelectorAll("header button")].find((x) => (x.getAttribute("aria-label") || x.textContent).trim() === t);
      b?.click();
      return Boolean(b);
    }, t);
    if (!ok) continue;
    // tunggu foto kartu sorotan selesai dimuat (lazy; foto baru belum ada di cache CDN)
    await page.waitForFunction(() => [...document.querySelectorAll(".lgt-mega-foto img, .lgt-menu-hp img")].filter((i) => i.offsetParent).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => {});
    await tunggu(600);
    await simpan(`menu-${t.toLowerCase().replace(/\s+/g, "-")}`);
    await page.keyboard.press("Escape");
    await tunggu(300);
  }
  // halaman lain
  for (const [nama, jalur] of [
    ["masuk-gtk", "/portal-digital/masuk/gtk"],
    ["masuk-siswa", "/portal-digital/masuk/siswa"],
    ["masuk-orang-tua", "/portal-digital/masuk/orang-tua"],
    ["pilih-pintu", "/portal-digital"],
    ["profil", "/profil"],
    ["sejarah", "/profil/sejarah"],
    ["fasilitas", "/profil/fasilitas"],
    ["galeri", "/galeri"],
    ["pembelajaran", "/pembelajaran"],
    ["program", "/program"],
  ]) {
    await page.goto(BASE + jalur, { waitUntil: "networkidle" });
    await gulirSemua(page);
    await simpan(nama, { fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log("tangkapan selesai →", keluar);
