// Uji tombol "Bantuan" di HP (BACA-SAJA), 360 & 390 px, Chromium + WebKit:
// kanan bawah 44px; menyingkir saat gulir turun, muncul lagi saat gulir naik, tersembunyi saat footer terlihat
// dan saat menu HP terbuka; header 60px & solid setelah digulir; fokus awal menu = tombol Tutup.
// Pakai: node scripts/uji-e2e/uji-bantuan-hp.mjs <base-url> [mesin=chromium,webkit]
import { chromium, webkit } from "playwright-core";

const [BASE, daftarMesin = "chromium,webkit"] = process.argv.slice(2);
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + JSON.stringify(d)}`);
  if (!ok) gagal++;
};
const ekstra = process.env.COOKIE_PRATINJAU ? { extraHTTPHeaders: { Cookie: process.env.COOKIE_PRATINJAU } } : {};
const MESIN = {
  chromium: () => chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }),
  webkit: () => webkit.launch(),
};
// keadaan tombol: terlihat bila ada, tidak menyingkir, dan tidak disembunyikan CSS
const bantuan = (page) =>
  page.evaluate(() => {
    const p = document.querySelector(".pemandu");
    const b = p?.querySelector(".pemandu-tombol");
    if (!p || !b) return { ada: false };
    const cs = getComputedStyle(p);
    const r = b.getBoundingClientRect();
    return {
      ada: true,
      terlihat: cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.5,
      kanan: Math.round(innerWidth - r.right),
      bawah: Math.round(innerHeight - r.bottom),
      lebar: Math.round(r.width),
      tinggi: Math.round(r.height),
    };
  });
const gulir = async (page, y) => {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(450);
};

for (const nm of daftarMesin.split(",")) {
  const browser = await MESIN[nm]();
  for (const lebar of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: 780 }, isMobile: nm === "chromium", hasTouch: true, deviceScaleFactor: 2, ...ekstra });
    const page = await ctx.newPage();
    const L = (t) => `${nm} ${lebar}px: ${t}`;
    await page.goto(BASE + "/profil", { waitUntil: "load" });
    await page.waitForTimeout(1500);

    // header
    const h0 = await page.evaluate(() => ({ t: Math.round(document.querySelector(".lgt-header").getBoundingClientRect().height) }));
    cek(L(`header 60px (${h0.t})`), h0.t === 60, h0);
    await gulir(page, 40);
    const h1 = await page.evaluate(() => {
      const h = document.querySelector(".lgt-header");
      return { lewat: h.hasAttribute("data-lewat"), latar: getComputedStyle(h).backgroundColor };
    });
    cek(L("header putih solid setelah digulir"), h1.lewat && h1.latar.includes("0.88"), h1);

    // Bantuan
    await gulir(page, 0);
    const b0 = await bantuan(page);
    cek(L(`Bantuan kanan bawah 44px (kanan ${b0.kanan}, bawah ${b0.bawah}, ${b0.lebar}x${b0.tinggi})`), b0.terlihat && b0.lebar === 44 && b0.tinggi === 44 && b0.kanan >= 16 && b0.bawah >= 16, b0);
    await gulir(page, 400);
    await gulir(page, 700);
    cek(L("gulir turun → Bantuan menyingkir"), !(await bantuan(page)).terlihat);
    await gulir(page, 500);
    cek(L("gulir naik → Bantuan muncul lagi"), (await bantuan(page)).terlihat);
    await page.evaluate(() => document.querySelector(".lgt-footer").scrollIntoView());
    await page.waitForTimeout(450);
    await page.evaluate(() => window.scrollBy(0, -20)); // gerak naik kecil: tetap tersembunyi karena footer terlihat
    await page.waitForTimeout(450);
    cek(L("footer terlihat → Bantuan tersembunyi"), !(await bantuan(page)).terlihat);

    // menu HP
    await gulir(page, 0);
    await page.locator(".lgt-tombol-menu").click();
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({ fokus: document.activeElement?.className ?? "", ketik: document.activeElement?.tagName === "INPUT" }));
    cek(L("menu: fokus awal tombol Tutup (tanpa papan ketik)"), m.fokus.includes("lgt-menu-hp-tutup") && !m.ketik, m);
    cek(L("menu terbuka → Bantuan tersembunyi"), !(await bantuan(page)).terlihat);
    await page.keyboard.press("Escape");
    await ctx.close();
  }
  await browser.close();
}
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
