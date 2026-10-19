// Uji menu navigasi (lokal saja): buka setiap dropdown di desktop 1440px dan menu HP 390px, kumpulkan semua tautan,
// pastikan tidak ada yang 404/galat, cek aturan isi menu, dan simpan tangkapan dropdown Pembelajaran & Layanan.
// Pakai: node scripts/uji-e2e/uji-menu.mjs <base-url> <folder-keluar>
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
const sesiBersih = async (ctx) =>
  ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
const semuaTautan = new Map(); // href → asal

// ---------- desktop 1440 ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await sesiBersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const grup = await page.$$eval(".nav-links .menu-layanan > button", (b) => b.map((x) => x.textContent.trim()));
  const isi = {};
  for (const [n, label] of grup.entries()) {
    const tombol = page.locator(".nav-links .menu-layanan > button").nth(n);
    await tombol.click();
    const panel = page.locator(".nav-links .menu-layanan-panel").nth(n);
    await panel.waitFor({ state: "visible" });
    const tautan = await panel.locator("a").evaluateAll((a) => a.map((x) => ({ href: x.getAttribute("href"), label: x.querySelector(".font-semibold")?.textContent.trim(), teks: x.querySelectorAll("span span")[1]?.textContent.trim() ?? "" })));
    isi[label] = tautan;
    for (const t of tautan) semuaTautan.set(t.href, `desktop › ${label} › ${t.label}`);
    if (label === "Pembelajaran" || label === "Layanan") {
      await page.waitForTimeout(250);
      const kotak = await page.locator(".nav-links .menu-layanan").nth(n).boundingBox();
      const p = await panel.boundingBox();
      const x = Math.max(0, Math.min(kotak.x, p.x) - 24);
      await page.screenshot({ path: path.join(keluar, `dropdown-${label.toLowerCase()}-1440.png`), clip: { x, y: 0, width: Math.min(1440 - x, Math.max(kotak.x + kotak.width, p.x + p.width) - x + 24), height: p.y + p.height + 24 } });
    }
    await page.keyboard.press("Escape");
    cek(`dropdown "${label}" tertutup dengan Esc`, await panel.isHidden(), label);
  }
  for (const a of await page.$$eval(".lp-header > div > a, .nav-links > a", (x) => x.map((e) => e.getAttribute("href")))) semuaTautan.set(a, "desktop › header");

  const lay = (isi["Layanan"] ?? []).map((t) => t.label);
  cek("Layanan: tanpa Portal Digital 22, urutan benar", JSON.stringify(lay) === JSON.stringify(["E-Library", "Pengaduan & aspirasi", "Verifikasi sertifikat", "Survei layanan"]), lay);
  cek("Layanan: setiap item berketerangan", (isi["Layanan"] ?? []).every((t) => t.teks), isi["Layanan"]);
  const ver = (isi["Layanan"] ?? []).find((t) => t.label === "Verifikasi sertifikat")?.teks;
  const sur = (isi["Layanan"] ?? []).find((t) => t.label === "Survei layanan")?.teks;
  cek("keterangan Verifikasi & Survei sesuai", ver === "Cek keaslian sertifikat dan piagam sekolah." && sur === "Beri penilaian untuk layanan sekolah.", { ver, sur });
  const pem = isi["Pembelajaran"] ?? [];
  cek("Pembelajaran: E-Learning ada, E-Library tidak", pem.some((t) => t.label === "E-Learning" && t.teks === "Kelas digital, materi, dan tugas daring.") && !pem.some((t) => t.label === "E-Library"), pem);
  const label = Object.values(isi).flat().map((t) => t.label);
  cek("E-Library & E-Learning masing-masing sekali di menu", label.filter((l) => l === "E-Library").length === 1 && label.filter((l) => l === "E-Learning").length === 1, label);
  cek("tombol Portal Digital 22 tetap di kanan header", (await page.locator(".lp-header .tombol-portal").count()) === 1, null);

  // footer & akses cepat beranda: E-Learning di Pembelajaran, E-Library di Layanan, masing-masing sekali
  const footer = await page.$$eval(".lp-footer nav", (n) => n.map((x) => ({ judul: x.querySelector(".footer-judul")?.textContent.trim(), isi: [...x.querySelectorAll("a")].map((a) => a.textContent.trim()) })));
  const fIn = (t) => footer.filter((k) => k.isi.includes(t)).map((k) => k.judul);
  cek("footer: E-Learning hanya di Pembelajaran, E-Library hanya di Layanan", JSON.stringify(fIn("E-Learning")) === '["Pembelajaran"]' && JSON.stringify(fIn("E-Library")) === '["Layanan"]', footer);
  const akses = await page.$$eval(".bk-akses-kelompok", (k) => k.map((x) => ({ judul: x.querySelector("h3")?.textContent.trim(), isi: [...x.querySelectorAll("a span:not(.bk-akses-panah)")].map((s) => s.textContent.trim()) })));
  const aIn = (t) => akses.filter((k) => k.isi.includes(t)).map((k) => k.judul);
  cek("akses cepat: E-Learning hanya di Pembelajaran, E-Library hanya di Layanan", JSON.stringify(aIn("E-Learning")) === '["Pembelajaran"]' && JSON.stringify(aIn("E-Library")) === '["Layanan"]', akses);
  for (const a of await page.$$eval(".lp-footer a[href^='/'], .bk-akses a", (x) => x.map((e) => e.getAttribute("href")))) if (!semuaTautan.has(a)) semuaTautan.set(a, "footer/akses cepat");
  await ctx.close();
}

// ---------- menu HP 390 ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await sesiBersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.locator(".menu-hp > summary").click();
  await page.locator(".menu-hp nav").waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(keluar, "menu-hp-390.png"), fullPage: false });
  const hp = await page.$$eval(".menu-hp nav a", (a) => a.map((x) => ({ href: x.getAttribute("href"), label: x.textContent.trim() })));
  for (const t of hp) if (!semuaTautan.has(t.href)) semuaTautan.set(t.href, `HP › ${t.label}`);
  const labelHp = hp.map((t) => t.label);
  cek("menu HP: Portal Digital 22 sekali (tombol atas), E-Library & E-Learning masing-masing sekali", labelHp.filter((l) => /Portal Digital 22/.test(l)).length === 1 && labelHp.filter((l) => l === "E-Library").length === 1 && labelHp.filter((l) => l === "E-Learning").length === 1, labelHp);
  const urutHp = await page.$$eval(".menu-hp nav .menu-hp-judul", (p) => p.map((x) => ({ judul: x.textContent.trim(), isi: [] })));
  cek("menu HP memuat grup Pembelajaran & Layanan", urutHp.some((g) => g.judul === "Pembelajaran") && urutHp.some((g) => g.judul === "Layanan"), urutHp);
  await ctx.close();
}

// ---------- semua tautan: tidak 404 ----------
{
  const ctx = await browser.newContext();
  const req = ctx.request;
  for (const [href, asal] of semuaTautan) {
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const r = await req.get(BASE + href.split("#")[0], { maxRedirects: 5 });
    cek(`${r.status()} ${href}  (${asal})`, r.status() < 400, r.status());
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${semuaTautan.size} tautan diperiksa — ${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
