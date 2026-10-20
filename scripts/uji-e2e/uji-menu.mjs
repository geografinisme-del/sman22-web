// Uji menu "Langit cerah" (lokal saja): menu layar penuh di desktop 1440px & HP 390px, footer, aturan isi menu,
// semua tautan tidak 404, dan tangkapan menu. Pakai: node scripts/uji-e2e/uji-menu.mjs <base-url> <folder-keluar>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar = "tangkapan/menu"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
fs.mkdirSync(keluar, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const bersih = (ctx) =>
  ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
const semuaTautan = new Map();

for (const [nama, opsi, pemicu] of [
  ["desktop 1440", { viewport: { width: 1440, height: 900 } }, ".lgt-pil-lengkap"],
  ["HP 390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, ".lgt-tombol-menu"],
]) {
  const ctx = await browser.newContext(opsi);
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click(pemicu);
  const dialog = page.locator("dialog.lgt-menu");
  await dialog.waitFor({ state: "visible" });
  cek(`${nama}: menu layar penuh terbuka`, await dialog.evaluate((d) => d.open), null);

  const isi = {};
  for (const g of await dialog.locator(".lgt-menu-grup button").all()) {
    const label = (await g.textContent()).trim();
    await g.click();
    await page.waitForFunction((l) => [...document.querySelectorAll(".lgt-menu-grup button")].find((b) => b.textContent.trim() === l)?.getAttribute("aria-expanded") === "true", label);
    await page.waitForTimeout(80);
    const terbuka = await dialog.locator(".lgt-menu-grup button[aria-expanded=true]").textContent();
    if (terbuka.trim() !== label) console.log(`  (catatan: setelah klik "${label}", grup aktif = "${terbuka.trim()}")`);
    isi[label] = await dialog.locator("#lgt-menu-anak a").evaluateAll((a) => a.map((x) => ({ href: x.getAttribute("href"), label: x.textContent.trim() })));
    for (const t of isi[label]) semuaTautan.set(t.href, `${nama} › ${label} › ${t.label}`);
    if (label === "Profil" || label === "Layanan") await page.screenshot({ path: path.join(keluar, `menu-${label.toLowerCase()}-${nama.split(" ")[1]}.png`) });
  }
  for (const a of await dialog.locator(".lgt-menu-akses a").evaluateAll((x) => x.map((e) => ({ href: e.getAttribute("href"), label: e.textContent.trim() })))) semuaTautan.set(a.href, `${nama} › akses cepat › ${a.label}`);

  cek(`${nama}: kolom 1 = 5 grup`, JSON.stringify(Object.keys(isi)) === JSON.stringify(["Profil", "Pembelajaran", "Kehidupan Siswa", "Kabar & Agenda", "Layanan"]), Object.keys(isi));
  const lay = (isi["Layanan"] ?? []).map((t) => t.label);
  cek(`${nama}: Layanan tanpa Portal Digital 22`, JSON.stringify(lay) === JSON.stringify(["E-Library", "Pengaduan dan aspirasi", "Verifikasi sertifikat", "Survei layanan"]), lay);
  const semua = Object.values(isi).flat().map((t) => t.label);
  cek(`${nama}: E-Learning & E-Library masing-masing sekali di kolom 2`, semua.filter((l) => l === "E-Learning").length === 1 && semua.filter((l) => l === "E-Library").length === 1, semua);
  const akses = await dialog.locator(".lgt-menu-untuk").allTextContents();
  cek(`${nama}: akses cepat untuk 4 peran`, JSON.stringify(akses) === JSON.stringify(["Calon siswa", "Orang tua", "Siswa", "Guru dan staf"]), akses);
  cek(`${nama}: kotak cari ada`, (await dialog.locator("input[type=search]").count()) === 1, null);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  cek(`${nama}: Esc menutup menu`, !(await dialog.evaluate((d) => d.open)), null);
  cek(`${nama}: tombol Portal Digital 22 di header`, (await page.locator(".lgt-header .lgt-tombol-portal").count()) === 1, null);

  // footer mengikuti struktur menu
  const footer = await page.$$eval("#navigasi-situs > div", (k) => k.map((x) => ({ judul: x.querySelector(".label-mono")?.textContent.trim(), isi: [...x.querySelectorAll("a")].map((a) => a.textContent.trim()) })));
  cek(`${nama}: footer = struktur menu`, JSON.stringify(footer.map((k) => k.judul)) === JSON.stringify(Object.keys(isi)) && footer.every((k) => JSON.stringify(k.isi) === JSON.stringify((isi[k.judul] ?? []).map((t) => t.label))), footer);
  for (const a of await page.$$eval(".lgt-footer a[href^='/'], .lgt-header a[href^='/']", (x) => x.map((e) => e.getAttribute("href")))) if (!semuaTautan.has(a)) semuaTautan.set(a, `${nama} › header/footer`);
  await ctx.close();
}

// semua tautan tidak 404
{
  const ctx = await browser.newContext();
  for (const [href, asal] of semuaTautan) {
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
    const r = await ctx.request.get(BASE + href.split("#")[0], { maxRedirects: 5 });
    cek(`${r.status()} ${href}  (${asal})`, r.status() < 400, r.status());
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${semuaTautan.size} tautan diperiksa — ${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
