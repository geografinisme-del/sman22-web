// Uji animasi HP (BACA-SAJA): kartu putar cincin ringan & tur pinned di emulasi HP 390px, Chromium + WebKit.
// - kartu putar: mode "hp", kartu tengah ±78% lebar, 3 kartu terlihat, maju otomatis 1 kartu (≤ 5 dtk), usap kiri →
//   kartu berikutnya ke tengah (berhenti tepat), ketuk kartu samping → ke tengah tanpa pindah halaman,
//   ketuk kartu tengah → buka tautannya.
// - tur: mode "sticky", panggung menempel & setinggi layar, langkah berganti saat digulir, kartu teks di bawah foto.
// - reduced motion: kembali ke mode baris/daftar.
// Pakai: node scripts/uji-e2e/uji-hp-gerak.mjs <base-url> [mesin=chromium,webkit] [folder-video]
import { chromium, webkit } from "playwright-core";
import fs from "node:fs";

const [BASE, daftarMesin = "chromium,webkit", folderVideo] = process.argv.slice(2);
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + JSON.stringify(d)}`);
  if (!ok) gagal++;
};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
// pratinjau Vercel terlindungi: COOKIE_PRATINJAU="_vercel_jwt=…" (opsional)
const ekstra = process.env.COOKIE_PRATINJAU ? { extraHTTPHeaders: { Cookie: process.env.COOKIE_PRATINJAU } } : {};
const MESIN = {
  chromium: () => chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }),
  webkit: () => webkit.launch(),
};
// pengumuman prioritas (bila ada) ditutup dulu
const diamkan = async (page) => {
  const t = page.getByRole("button", { name: "Tutup", exact: true });
  if (await t.count()) await t.first().click({ timeout: 1500 }).catch(() => {});
};
const depan = (page) => page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot")].findIndex((s) => s.hasAttribute("data-depan")));
// jarak pusat kartu i ke pusat layar (px)
const posisi = (page, i) =>
  page.evaluate((i) => {
    const r = document.querySelectorAll(".lgt-cincin-slot")[i].getBoundingClientRect();
    return Math.round(r.left + r.width / 2 - innerWidth / 2);
  }, i);

for (const nm of daftarMesin.split(",")) {
  const browser = await MESIN[nm]();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: nm === "chromium",
    hasTouch: true,
    deviceScaleFactor: 2,
    ...(folderVideo ? { recordVideo: { dir: `${folderVideo}/${nm}`, size: { width: 390, height: 844 } } } : {}),
    ...ekstra,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await diamkan(page);
  await page.waitForTimeout(1200);
  const L = (t) => `${nm} 390px: ${t}`;

  cek(L("kartu putar mode cincin ringan HP"), (await page.getAttribute(".lgt-cincin-wadah", "data-mode")) === "hp");
  const n = await page.locator(".lgt-cincin-slot").count();
  const lebar = await page.evaluate(() => document.querySelector(".lgt-cincin-slot").offsetWidth / innerWidth);
  cek(L(`kartu tengah ±78% lebar layar (${Math.round(lebar * 100)}%)`), lebar > 0.7 && lebar < 0.86, lebar);
  const terlihat = await page.evaluate(
    () =>
      [...document.querySelectorAll(".lgt-cincin-slot")].filter((s) => {
        const r = s.getBoundingClientRect();
        return Number(getComputedStyle(s).opacity) > 0.5 && r.right > 4 && r.left < innerWidth - 4;
      }).length,
  );
  cek(L(`3 kartu terlihat (tengah + 2 mengintip): ${terlihat}`), terlihat === 3, terlihat);
  cek(L("tanpa luber horizontal"), !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));

  // 1. maju otomatis
  const d0 = await depan(page);
  await page.waitForTimeout(5000);
  const d1 = await depan(page);
  cek(L(`maju otomatis satu kartu (${d0} → ${d1})`), d1 === (d0 + 1) % n, { d0, d1 });

  // 2. usap ke kiri → kartu berikutnya ke tengah, berhenti tepat di tengah
  await diamkan(page); // pengumuman prioritas bisa muncul tertunda dan menutupi kartu
  const box = await page.locator(".lgt-cincin-panggung").boundingBox();
  const y = box.y + box.height * 0.35;
  // mulai usap tepat setelah satu langkah otomatis selesai (bukan di tengah geseran otomatis)
  const sebelumUsap = await depan(page);
  for (let i = 0; i < 60 && (await depan(page)) === sebelumUsap; i++) await tunggu(100);
  await tunggu(700);
  const awal = await depan(page);
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width * (0.8 - 0.05 * i), y);
    await tunggu(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const setelah = await depan(page);
  const geser = await posisi(page, setelah);
  cek(L(`usap kiri → kartu berikutnya di tengah (${awal} → ${setelah}), selisih ${geser}px`), setelah === (awal + 1) % n && Math.abs(geser) <= 2, { awal, setelah, geser });
  cek(L("usap tidak membuka tautan"), new URL(page.url()).pathname === "/");

  // 3. ketuk kartu samping (kanan) → ke tengah, tanpa pindah halaman
  await diamkan(page); // pengumuman prioritas bisa muncul tertunda dan menutupi kartu
  const samping = (setelah + 1) % n;
  const rs = await page.locator(".lgt-cincin-slot").nth(samping).boundingBox();
  await page.mouse.click(Math.min(rs.x + rs.width - 12, 380), rs.y + rs.height * 0.4);
  await page.waitForTimeout(1000);
  const dSamping = await depan(page);
  cek(L("ketuk kartu samping → kartu itu ke tengah"), dSamping === samping && Math.abs(await posisi(page, samping)) <= 2, { dSamping, samping });
  cek(L("ketuk kartu samping tidak membuka tautan"), new URL(page.url()).pathname === "/");

  // 4. ketuk kartu tengah → buka tautannya
  await diamkan(page); // pengumuman prioritas bisa muncul tertunda dan menutupi kartu
  const href = await page.locator(".lgt-cincin-slot").nth(samping).locator("a").getAttribute("href");
  const rt = await page.locator(".lgt-cincin-slot").nth(samping).boundingBox();
  await page.mouse.click(rt.x + rt.width / 2, rt.y + rt.height * 0.4);
  await page.waitForURL((u) => u.pathname !== "/", { timeout: 8000 }).catch(() => {});
  cek(L(`ketuk kartu tengah membuka ${href}`), new URL(page.url()).pathname === new URL(href, BASE).pathname, page.url());

  // 5. tur pinned
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await diamkan(page);
  await page.evaluate(() => document.querySelector("#tur").scrollIntoView());
  await page.waitForTimeout(1500);
  cek(L("tur mode sticky (pinned)"), (await page.getAttribute("#tur", "data-mode")) === "sticky");
  const info = () =>
    page.evaluate(() => {
      const pin = document.querySelector(".tur-pin").getBoundingClientRect();
      const aktif = [...document.querySelectorAll(".tur-penanda li")].findIndex((l) => l.hasAttribute("data-aktif"));
      const k = document.querySelector(".tur-kartu[data-aktif]");
      const m = k?.closest(".tur-item")?.querySelector(".tur-media")?.getBoundingClientRect();
      const rk = k?.getBoundingClientRect();
      return {
        pinAtas: Math.round(pin.top),
        pinTinggi: Math.round(pin.height),
        layar: innerHeight,
        aktif,
        kartuDiBawahFoto: Boolean(rk && m && rk.top >= m.bottom - 1),
        kartuDalamLayar: Boolean(rk && rk.bottom <= innerHeight),
        awan: Number(getComputedStyle(document.querySelector(".tur-awan")).opacity),
      };
    });
  const t0 = await info();
  cek(L("awan pembuka tampil di awal tur"), t0.awan > 0.9, t0);
  const tinggiTur = await page.evaluate(() => document.querySelector("#tur").offsetHeight);
  await page.evaluate((d) => window.scrollBy(0, d), Math.round(tinggiTur * 0.3));
  await page.waitForTimeout(900);
  const t1 = await info();
  cek(L("panggung menempel di atas & setinggi layar"), Math.abs(t1.pinAtas) <= 1 && Math.abs(t1.pinTinggi - t1.layar) <= 2, t1);
  cek(L(`langkah aktif berganti (${t1.aktif})`), t1.aktif >= 1, t1);
  cek(L("kartu teks di bawah foto & di dalam layar"), t1.kartuDiBawahFoto && t1.kartuDalamLayar, t1);
  await page.evaluate((d) => window.scrollBy(0, d), Math.round(tinggiTur * 0.3));
  await page.waitForTimeout(900);
  const t2 = await info();
  cek(L(`langkah terus maju saat digulir (${t1.aktif} → ${t2.aktif})`), t2.aktif > t1.aktif, { t1, t2 });
  await ctx.close();

  // 6. reduced motion → tanpa animasi
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce", ...ekstra });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/", { waitUntil: "networkidle" });
  await p2.waitForTimeout(1500);
  cek(
    L("reduced motion: kartu baris biasa & tur daftar"),
    (await p2.getAttribute(".lgt-cincin-wadah", "data-mode")) === "baris" && (await p2.getAttribute("#tur", "data-mode")) === "daftar",
  );
  await ctx2.close();
  await browser.close();
}
if (folderVideo) console.log("video di", folderVideo);
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
