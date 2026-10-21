// Uji gerak beranda (lokal saja): tanpa JavaScript konten tetap terlihat; dengan reduced-motion
// tidak ada animasi/parallax dan tidak ada blok yang disembunyikan; dengan gerak: blok di bawah layar muncul
// saat digulir (GSAP + ScrollTrigger) dan tidak ada yang tertinggal tersembunyi; awan dijeda di luar layar.
// Pakai: node scripts/uji-e2e/uji-gerak.mjs <base-url>
import { chromium } from "playwright-core";

const [BASE] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const keadaan = (page) =>
  page.evaluate(() => {
    const op = (s) => [...document.querySelectorAll(s)].map((e) => +getComputedStyle(e).opacity);
    return {
      judul: document.querySelector("#judul-hero")?.textContent?.trim(),
      opHero: op(".lgt-hero [data-masuk]"),
      animHero: [...document.querySelectorAll(".lgt-hero [data-masuk]")].reduce((n, e) => n + e.getAnimations().length, 0),
      awan: [...document.querySelectorAll(".lgt-awan svg")].map((e) => getComputedStyle(e).animationName),
      cincin: document.querySelector(".lgt-cincin-wadah")?.dataset.mode,
      blokTersembunyi: [...document.querySelectorAll(".lp .lgt-shead, .lp .lgt-kisi > *, .lp .lgt-daftar-tgl > li, .lp .lgt-mozaik > li, .lp .lgt-bento > *, .lp .lgt-cta")].filter((e) => +getComputedStyle(e).opacity < 0.99 || getComputedStyle(e).visibility === "hidden").length,
      angka: [...document.querySelectorAll("[data-hitung]")].map((e) => e.textContent),
      diam: document.querySelector("[data-hero-langit]")?.hasAttribute("data-diam"),
      // blok yang menunggu muncul tetap terbaca pembaca layar / Ctrl+F (tidak visibility:hidden)
      takTerbaca: [...document.querySelectorAll(".lp *")].filter((e) => getComputedStyle(e).visibility === "hidden" && !e.closest("dialog, .tur, [hidden], [aria-hidden='true']")).length,
    };
  });

// 1. tanpa JavaScript
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const k = await keadaan(page);
  cek("tanpa JS: judul hero terbaca", /^Tempat tumbuh yang berakhlak/.test(k.judul ?? ""), k.judul);
  cek("tanpa JS: teks hero tidak disembunyikan", k.opHero.every((o) => o === 1), k.opHero);
  cek("tanpa JS: semua blok bagian terlihat", k.blokTersembunyi === 0, k.blokTersembunyi);
  cek("tanpa JS: angka asli tampil (bukan 0)", k.angka.length > 0 && k.angka.every((t) => t && !/^0\D*$/.test(t)), k.angka);
  await ctx.close();
}
// 2. prefers-reduced-motion: reduce — tidak ada animasi sama sekali
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  let k = await keadaan(page);
  cek("reduced-motion: hero langsung tampil tanpa animasi masuk", k.opHero.every((o) => o === 1) && k.animHero === 0, k);
  cek("reduced-motion: awan diam & kartu tanpa putaran 3D", k.awan.every((a) => a === "none") && k.cincin === "baris", k);
  await page.waitForTimeout(3200);
  k = await keadaan(page);
  cek("reduced-motion: mesin gerak tidak memuat & tidak ada blok disembunyikan", k.blokTersembunyi === 0, k.blokTersembunyi);
  await ctx.close();
}
// 2b. gerak diizinkan (desktop): blok di bawah layar disembunyikan oleh JS lalu muncul saat digulir
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(3500); // mesin dimuat setelah LCP + senggang
  let k = await keadaan(page);
  cek("gerak: blok di bawah layar menunggu muncul (keadaan awal diset JS)", k.blokTersembunyi > 0, k.blokTersembunyi);
  cek("gerak: blok yang menunggu tetap terbaca pembaca layar (tanpa visibility:hidden)", k.takTerbaca === 0, k.takTerbaca);
  // gulir pelan sampai bawah agar semua pemicu ScrollTrigger lewat
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await page.waitForTimeout(1500);
  k = await keadaan(page);
  cek("gerak: setelah digulir tidak ada blok yang tertinggal tersembunyi", k.blokTersembunyi === 0, k.blokTersembunyi);
  cek("gerak: angka bento kembali ke nilai asli", k.angka.every((t) => t && !/^0\D*$/.test(t)), k.angka);
  cek("gerak: awan hero dijeda saat hero di luar layar", k.diam === true, k.diam);
  await ctx.close();
}
// 3. layar sempit: kartu baris geser, tanpa 3D
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const k = await keadaan(page);
  cek("390px: kartu baris geser (tanpa cincin 3D)", k.cincin === "baris", k.cincin);
  cek("390px: tanpa luber horizontal", !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), null);
  await ctx.close();
}
await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
