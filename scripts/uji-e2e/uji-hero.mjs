// Uji jarak hero beranda: header tidak menimpa teks hero; judul → sub → tombol → kartu putar tidak bertumpuk.
// Zoom peramban disimulasikan: lebar & tinggi CSS = ukuran layar / zoom, deviceScaleFactor = zoom.
// Pakai: node scripts/uji-e2e/uji-hero.mjs <base-url> [folder-tangkapan]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
if (keluar) fs.mkdirSync(keluar, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });

const LAYAR = [
  [1024, 768],
  [1280, 720],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];
const ZOOM = [0.67, 0.8, 0.9, 1, 1.1, 1.25];
const TANGKAP = new Set(["1280x800@0.8", "1280x800@1", "1280x800@1.25", "1440x900@0.8", "1440x900@1", "1440x900@1.25", "1920x1080@0.8", "1920x1080@1", "1920x1080@1.25"]);
let gagal = 0;
const hasil = [];
for (const [w, h] of LAYAR) {
  for (const z of ZOOM) {
    const vw = Math.round(w / z);
    const vh = Math.round(h / z);
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: z });
    // tangkapan bersih: overlay otomatis dianggap sudah tampil
    await ctx.addInitScript(() => {
      try {
        for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
      } catch {}
    });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(1600); // animasi masuk hero selesai
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect();
      const header = r(".lgt-header");
      const h1 = r("#judul-hero");
      const sub = r(".lgt-hero-sub");
      const aksi = r(".lgt-hero-aksi");
      // batas atas kartu yang benar-benar terlihat (kartu di belakang/tersembunyi diabaikan)
      const kartu = [...document.querySelectorAll(".lgt-cincin-slot")]
        .filter((e) => +getComputedStyle(e).opacity > 0.05 && getComputedStyle(e).visibility !== "hidden")
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width > 0);
      const atasKartu = kartu.length ? Math.min(...kartu.map((b) => b.top)) : null;
      return {
        mode: document.querySelector(".lgt-cincin-wadah")?.dataset.mode,
        headerBawah: Math.round(header.bottom),
        h1Atas: Math.round(h1.top),
        h1Bawah: Math.round(h1.bottom),
        subAtas: Math.round(sub.top),
        subBawah: Math.round(sub.bottom),
        aksiAtas: Math.round(aksi.top),
        aksiBawah: Math.round(aksi.bottom),
        atasKartu: atasKartu === null ? null : Math.round(atasKartu),
        varHeader: getComputedStyle(document.querySelector(".lgt-hero")).getPropertyValue("--tinggi-header").trim(),
      };
    });
    const nama = `${w}x${h}@${z}`;
    const ok = {
      // jarak atas = tinggi header + 56px (desktop) / + 32px (HP); toleransi 4px untuk ruang baris judul
      header: m.h1Atas - m.headerBawah >= (vw >= 900 ? 52 : 28),
      urut: m.subAtas >= m.h1Bawah && m.aksiAtas >= m.subBawah,
      kartu: m.atasKartu === null || m.atasKartu >= m.aksiBawah + 8,
    };
    const lulus = ok.header && ok.urut && ok.kartu;
    if (!lulus) gagal++;
    hasil.push({ nama, css: `${vw}x${vh}`, ...m, lulus, ok });
    console.log(`${lulus ? "LULUS" : "GAGAL"} ${nama} (css ${vw}x${vh}, ${m.mode}) jarak header→h1 ${m.h1Atas - m.headerBawah}px, tombol→kartu ${m.atasKartu === null ? "-" : m.atasKartu - m.aksiBawah}px${lulus ? "" : " :: " + JSON.stringify(ok)}`);
    if (keluar && TANGKAP.has(nama)) await page.screenshot({ path: path.join(keluar, `hero-${w}x${h}-zoom${Math.round(z * 100)}.png`) });
    await ctx.close();
  }
}
// header yang membesar (mis. teks terbungkus saat zoom): jarak hero mengikuti tinggi header nyata
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.addStyleTag({ content: ".lgt-header-isi{min-height:120px!important}" });
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => ({
    headerBawah: Math.round(document.querySelector(".lgt-header").getBoundingClientRect().bottom),
    h1Atas: Math.round(document.querySelector("#judul-hero").getBoundingClientRect().top),
    varHeader: getComputedStyle(document.documentElement).getPropertyValue("--tinggi-header").trim(),
  }));
  const lulus = m.headerBawah >= 120 && m.h1Atas - m.headerBawah >= 52;
  if (!lulus) gagal++;
  console.log(`${lulus ? "LULUS" : "GAGAL"} header dibesarkan ke ${m.headerBawah}px (--tinggi-header ${m.varHeader}): jarak header→h1 ${m.h1Atas - m.headerBawah}px`);
  await ctx.close();
}
await browser.close();
if (keluar) fs.writeFileSync(path.join(keluar, "uji-hero.json"), JSON.stringify(hasil, null, 1));
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
