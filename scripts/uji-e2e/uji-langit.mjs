// Uji "Langit cerah" (lokal saja): kartu putar 3D (terus berputar kecuali dipilih/diseret/difokus), header di atas hero.
// Pakai: node scripts/uji-e2e/uji-langit.mjs <base-url>
import { chromium } from "playwright-core";

const [BASE] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const bersih = (ctx) =>
  ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
const depan = (page) => page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot")].findIndex((s) => s.hasAttribute("data-depan")));

// ---------- desktop 1440 ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(800);
  cek("desktop: kartu dalam mode cincin 3D", (await page.getAttribute(".lgt-cincin-wadah", "data-mode")) === "cincin", null);
  const n = await page.locator(".lgt-cincin-slot").count();
  cek("12 kartu tampil", n === 12, n);

  // sudut rotateY cincin (derajat) & keadaan mesin
  const theta = () => page.evaluate(() => Number(/rotateY\((-?[\d.e-]+)deg\)/.exec(document.querySelector(".lgt-cincin")?.style.transform ?? "")?.[1] ?? NaN));
  const keadaan = () => page.getAttribute(".lgt-cincin-wadah", "data-keadaan");
  const terpilih = () => page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot")].findIndex((s) => s.hasAttribute("data-terpilih")));
  const keAtas = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const sudutDiam = async (ms) => {
    const a = await theta();
    await tidur(ms);
    return Math.abs((await theta()) - a) < 0.01;
  };

  // 1. putar otomatis, termasuk saat kursor di atas cincin (hover tidak menghentikan)
  await page.mouse.move(5, 5);
  cek("berputar otomatis", !(await sudutDiam(900)), null);
  const box = await page.locator(".lgt-cincin-panggung").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await tidur(300);
  cek("hover TIDAK menghentikan putaran", !(await sudutDiam(900)) && (await keadaan()) === "otomatis", await keadaan());

  // 2. di luar layar: frame tidak dirender, waktu tetap berjalan → kembali ke atas, posisi sudah maju (≈ 5°/detik)
  await page.mouse.move(5, 5);
  const s0 = await theta();
  const w0 = Date.now();
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("[data-hero-langit]").offsetHeight + 600, behavior: "instant" }));
  await tidur(400);
  const diLuar1 = await theta();
  await tidur(2000);
  const tidakRender = Math.abs((await theta()) - diLuar1) < 0.01;
  await tidur(7600);
  await keAtas();
  await tidur(400);
  const lama = (Date.now() - w0) / 1000;
  const maju = s0 - (await theta());
  cek("di luar layar: frame tidak dirender (hemat CPU)", tidakRender, null);
  cek(`kembali ke atas setelah ±10 detik: posisi maju ±${Math.round(5 * lama)}° (bukan berhenti)`, Math.abs(maju - 5 * lama) < 6, { maju, harapan: 5 * lama });

  // 3. klik kartu samping → diputar ke tengah lalu diam sebagai kartu terpilih (tidak membuka tautan)
  const url0 = page.url();
  const d0 = await depan(page);
  const samping = (d0 + 1) % n;
  await page.locator(".lgt-cincin-slot").nth(samping).locator("a").click({ force: true });
  await tidur(1000);
  cek("klik kartu → diputar ke tengah & diam sebagai kartu terpilih", (await depan(page)) === samping && (await terpilih()) === samping && page.url() === url0 && (await sudutDiam(1500)), { depan: await depan(page), terpilih: await terpilih(), samping });

  // 4. klik di luar cincin → lanjut berputar
  await page.mouse.click(box.x + 20, Math.max(5, box.y - 120));
  await tidur(300);
  cek("klik di luar cincin → berputar lagi", (await keadaan()) === "otomatis" && !(await sudutDiam(700)) && (await terpilih()) === -1, await keadaan());

  // 5. Esc → lanjut berputar
  await page.locator(".lgt-cincin-slot").nth((await depan(page) + 1) % n).locator("a").click({ force: true });
  await tidur(1000);
  const diamSebelumEsc = await sudutDiam(500);
  await page.keyboard.press("Escape");
  await tidur(300);
  cek("Esc → berputar lagi", diamSebelumEsc && (await keadaan()) === "otomatis" && !(await sudutDiam(700)), await keadaan());

  // 6. 8 detik tanpa interaksi setelah memilih → berputar lagi
  await page.locator(".lgt-cincin-slot").nth((await depan(page) + 1) % n).locator("a").click({ force: true });
  await tidur(7000);
  const masihDiam = await sudutDiam(500);
  await tidur(2000);
  cek("8 detik setelah memilih → berputar lagi (sebelumnya tetap diam)", masihDiam && (await keadaan()) === "otomatis" && !(await sudutDiam(700)), { masihDiam, keadaan: await keadaan() });

  // 7. tombol ← → tepat 1 kartu; putaran otomatis lanjut setelah 3 detik
  const a0 = await depan(page);
  await page.click(".lgt-cincin-kontrol button[aria-label='Kartu berikutnya']");
  await tidur(900);
  const a1 = await depan(page);
  cek("tombol → = tepat 1 kartu", a1 === (a0 + 1) % n, { a0, a1 });
  const diamTombol = await sudutDiam(1500);
  await tidur(1500);
  cek("tombol: diam lalu lanjut berputar setelah 3 detik", diamTombol && !(await sudutDiam(700)), { diamTombol });
  await page.click(".lgt-cincin-kontrol button[aria-label='Kartu sebelumnya']");
  await tidur(900);
  cek("tombol ← = kembali 1 kartu", (await depan(page)) === a0, { a0, now: await depan(page) });

  // 8. seret > 6px: memutar cincin, bukan klik; dilepas → inersia lalu putaran otomatis
  await keAtas();
  await tidur(300);
  const sebelum = await theta();
  const b = await page.locator(".lgt-cincin-slot").nth(await depan(page)).boundingBox();
  const ty = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width / 2, ty);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 140, ty, { steps: 8 });
  await page.mouse.up();
  await tidur(2500);
  cek("seret memutar cincin & tidak membuka tautan", Math.abs((await theta()) - sebelum) > 5 && page.url() === url0, { url: page.url() });
  cek("setelah seret: inersia lalu berputar otomatis", (await keadaan()) === "otomatis" && !(await sudutDiam(700)), await keadaan());

  // 9. fokus keyboard → kartu ke tengah & diam selama fokus di cincin (lebih dari 8 detik); fokus keluar → berputar
  await page.mouse.move(5, 5);
  const target = ((await depan(page)) + 4) % n;
  // fokus keyboard sungguhan: fokus ke kartu sebelumnya (tanpa :focus-visible), lalu tekan Tab
  await page.locator(".lgt-cincin-slot").nth((target - 1 + n) % n).locator("a").focus();
  await page.keyboard.press("Tab");
  await tidur(1000);
  cek("fokus keyboard memutar kartu ke tengah", (await depan(page)) === target && (await terpilih()) === target, { depan: await depan(page), target });
  await tidur(8200);
  cek("selama fokus di kartu: tetap diam (lebih dari 8 detik)", await sudutDiam(600), await keadaan());

  // 10. kartu terpilih di tengah → Enter/klik membuka tautannya
  const href = await page.locator(".lgt-cincin-slot").nth(target).locator("a").getAttribute("href");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => u.pathname + u.search === href || u.href.endsWith(href), { timeout: 8000 }).catch(() => {});
  cek("kartu terpilih di tengah → Enter membuka tautannya", page.url().endsWith(href), { href, url: page.url() });

  // 11. klik mouse: kartu pertama dipilih dulu, klik kedua pada kartu terpilih yang di tengah membuka tautan
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(800);
  const k2 = ((await depan(page)) + 1) % n;
  const href2 = await page.locator(".lgt-cincin-slot").nth(k2).locator("a").getAttribute("href");
  await page.locator(".lgt-cincin-slot").nth(k2).locator("a").click({ force: true });
  await tidur(1000);
  const masihDiBeranda = new URL(page.url()).pathname === "/";
  await page.locator(".lgt-cincin-slot").nth(k2).locator("a").click();
  await page.waitForURL((u) => u.pathname + u.search === href2 || u.href.endsWith(href2), { timeout: 8000 }).catch(() => {});
  cek("klik kartu terpilih yang sudah di tengah membuka tautannya", masihDiBeranda && page.url().endsWith(href2), { href2, url: page.url() });

  // 12. fokus keluar dari cincin → berputar lagi
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(800);
  const f = ((await depan(page)) + 2) % n;
  await page.locator(".lgt-cincin-slot").nth((f - 1 + n) % n).locator("a").focus();
  await page.keyboard.press("Tab");
  await tidur(1000);
  const diamFokus = await sudutDiam(500);
  await page.locator(".lgt-cincin-kontrol button[aria-label='Kartu sebelumnya']").focus();
  await tidur(400);
  cek("fokus keluar dari cincin → berputar lagi", diamFokus && (await keadaan()) === "otomatis" && !(await sudutDiam(700)), { diamFokus, keadaan: await keadaan() });

  // header: transparan di atas hero, putih setelah melewati hero
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(500);
  const atas = await page.evaluate(() => ({ terang: document.querySelector(".lgt-header").hasAttribute("data-terang"), warna: getComputedStyle(document.querySelector(".lgt-merek")).color }));
  await page.evaluate(() => window.scrollTo({ top: document.querySelector("[data-hero-langit]").offsetHeight + 50, behavior: "instant" }));
  await tidur(400);
  const bawah = await page.evaluate(() => ({ lewat: document.querySelector(".lgt-header").hasAttribute("data-lewat"), warna: getComputedStyle(document.querySelector(".lgt-merek")).color, latar: getComputedStyle(document.querySelector(".lgt-header")).backgroundColor }));
  cek("header teks putih di atas hero", atas.terang && atas.warna === "rgb(255, 255, 255)", atas);
  cek("header putih 90% + teks tinta setelah hero", bawah.lewat && bawah.warna !== "rgb(255, 255, 255)" && bawah.latar.includes("0.9"), bawah);

  await ctx.close();
}

// ---------- HP 390 & reduced motion: baris geser ----------
for (const [nama, opsi] of [
  ["HP 390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ["reduced motion", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }],
]) {
  const ctx = await browser.newContext(opsi);
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(600);
  const k = await page.evaluate(() => ({
    mode: document.querySelector(".lgt-cincin-wadah")?.dataset.mode,
    snap: getComputedStyle(document.querySelector(".lgt-cincin")).scrollSnapType,
    tf: document.querySelector(".lgt-cincin").style.transform,
    luber: document.documentElement.scrollWidth > innerWidth,
  }));
  cek(`${nama}: baris geser scroll-snap tanpa 3D`, k.mode === "baris" && k.snap.startsWith("x") && !k.tf, k);
  cek(`${nama}: tidak ada luber horizontal`, !k.luber, k);
  await ctx.close();
}

// ---------- tanpa JavaScript ----------
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const k = await page.evaluate(() => ({
    judul: document.querySelector("#judul-hero")?.textContent,
    kartu: document.querySelectorAll("[data-hero-langit] .lgt-kartu").length,
    navFooter: !!document.querySelector("#navigasi-situs a"),
    tautanMenu: document.querySelector(".lgt-pil a")?.getAttribute("href"),
  }));
  cek("tanpa JS: judul, 12 kartu, dan navigasi footer terbaca", /Tempat tumbuh/.test(k.judul ?? "") && k.kartu === 12 && k.navFooter && k.tautanMenu === "#navigasi-situs", k);
  await ctx.close();
}

await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
