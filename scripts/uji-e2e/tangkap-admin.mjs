// Tangkapan layar halaman admin/CMS (token "Langit cerah") memakai akun UJI lokal. Hanya untuk stack Supabase uji.
// Pakai: MSYS_NO_PATHCONV=1 node scripts/uji-e2e/tangkap-admin.mjs http://localhost:3001 <akun-uji.json> <folder-keluar>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [base, berkasAkun, keluar] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(base ?? "")) throw new Error("base harus http://localhost:<port>");
const SANDI = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const RUTE = ["/admin", "/admin/menu", "/admin/staf-publik?baru=1", "/admin/fasilitas", "/admin/halaman", "/admin/kartu-beranda", "/admin/tur-sekolah", "/admin/berita", "/admin/tampilan"];
fs.mkdirSync(keluar, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const lebar of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: lebar < 700 ? 844 : 900 }, isMobile: lebar < 700, hasTouch: lebar < 700 });
  const page = await ctx.newPage();
  await page.goto(base + "/portal-digital/masuk/gtk", { waitUntil: "load" });
  await page.fill("input[name=email]", "humas@sman22.test");
  await page.fill("input[name=password]", SANDI.humas);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/portal-digital/masuk"), { timeout: 30000 });
  for (const r of RUTE) {
    const res = await page.goto(base + r, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(800);
    const nama = `${r.replace(/^\//, "").replace(/[/?=&]/g, "_")}-${lebar}.png`;
    await page.screenshot({ path: path.join(keluar, nama), fullPage: lebar < 700 ? false : true });
    console.log(res?.status(), r, lebar, page.url().replace(base, ""));
  }
  await ctx.close();
}
await browser.close();
