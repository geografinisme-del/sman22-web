// Uji baris hak cipta footer di HP (BACA-SAJA): gulir ke paling bawah di 360 & 390 px, pastikan teks "© … · Kredit foto"
// terlihat utuh (tidak terpotong/tertutup) dan tautan "Kredit foto" benar-benar menerima ketukan (hit-test elementFromPoint
// di beberapa titik tautan + ketuk sungguhan → halaman /kredit-foto). Tangkapan layar bagian bawah disimpan.
// Pakai: node scripts/uji-e2e/uji-footer-hp.mjs <base-url> <folder-tangkapan> [jalur1,jalur2]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar, daftar = "/,/galeri,/kredit-foto"] = process.argv.slice(2);
fs.mkdirSync(keluar, { recursive: true });
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + d}`);
  if (!ok) gagal++;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const lebar of [360, 390]) {
  // pratinjau Vercel terlindungi: COOKIE_PRATINJAU="_vercel_jwt=…" (opsional)
  const ekstra = process.env.COOKIE_PRATINJAU ? { extraHTTPHeaders: { Cookie: process.env.COOKIE_PRATINJAU } } : {};
  const ctx = await browser.newContext({ viewport: { width: lebar, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, ...ekstra });
  const page = await ctx.newPage();
  for (const jalur of daftar.split(",")) {
    await page.goto(BASE + jalur, { waitUntil: "networkidle" });
    const tutup = page.getByRole("button", { name: "Tutup", exact: true });
    if (await tutup.count()) await tutup.first().click().catch(() => {});
    // gulir bertahap sampai benar-benar di dasar halaman (konten lazy ikut dimuat)
    await page.evaluate(async () => {
      for (let i = 0; i < 60; i++) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 120));
        if (Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1) break;
      }
    });
    await page.waitForTimeout(800);
    // pengumuman prioritas (dialog) bisa muncul setelah halaman digulir → tutup dulu
    if (await tutup.count()) await tutup.first().click().catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
    const h = await page.evaluate(() => {
      const p = document.querySelector(".lgt-footer-bawah");
      const a = p?.querySelector('a[href="/kredit-foto"]');
      if (!p || !a) return null;
      // kotak TEKS yang sebenarnya (tanpa padding bawah elemen): gabungan semua baris teks
      const rng = document.createRange();
      rng.selectNodeContents(p);
      const baris = [...rng.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      const rp = {
        top: Math.min(...baris.map((r) => r.top)),
        bottom: Math.max(...baris.map((r) => r.bottom)),
        left: Math.min(...baris.map((r) => r.left)),
        right: Math.max(...baris.map((r) => r.right)),
      };
      const ra = a.getBoundingClientRect();
      // hit-test di kiri, tengah, kanan tautan: elemen teratas harus tautan itu sendiri
      const titik = [0.15, 0.5, 0.85].map((f) => {
        const el = document.elementFromPoint(ra.left + ra.width * f, ra.top + ra.height / 2);
        return el === a || a.contains(el) ? "tautan" : el ? `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}` : "kosong";
      });
      // elemen tetap (fixed/sticky) yang menumpuk area baris hak cipta
      const tumpuk = [...document.querySelectorAll("body *")]
        // catatan: elemen fixed selalu ber-offsetParent null → saring dengan visibility/display/ukuran, bukan offsetParent
        .filter((e) => {
          const cs = getComputedStyle(e);
          return ["fixed", "sticky"].includes(cs.position) && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0;
        })
        .map((e) => ({ e, r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.bottom > rp.top && r.top < rp.bottom && r.right > rp.left && r.left < rp.right)
        .map(({ e, r }) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}]`);
      // hit-test juga di sepanjang baris teks (setiap 12px, dua baris): tidak boleh ada elemen lain di atas teks
      const tertutup = [];
      for (let y = rp.top + 4; y < Math.min(rp.bottom, window.innerHeight) - 2; y += 10) {
        for (let x = rp.left + 2; x < rp.right - 2; x += 12) {
          const el = document.elementFromPoint(x, y);
          if (el && !p.contains(el) && el !== p) tertutup.push(`${Math.round(x)},${Math.round(y)} ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 24)}`);
        }
      }
      return {
        tertutup: tertutup.slice(0, 5),
        jumlahTertutup: tertutup.length,
        teks: p.textContent.replace(/\s+/g, " ").trim(),
        p: { top: Math.round(rp.top), bottom: Math.round(rp.bottom), left: Math.round(rp.left), right: Math.round(rp.right) },
        a: { top: Math.round(ra.top), bottom: Math.round(ra.bottom), w: Math.round(ra.width), h: Math.round(ra.height) },
        tinggiLayar: window.innerHeight,
        lebarLayar: window.innerWidth,
        gulirHorizontal: document.documentElement.scrollWidth > window.innerWidth,
        titik,
        tumpuk,
        jarakBawah: Math.round(window.innerHeight - rp.bottom),
      };
    });
    const label = `${lebar}px ${jalur}`;
    if (!h) {
      cek(`${label}: baris hak cipta & tautan Kredit foto ada`, false, "tidak ditemukan");
      continue;
    }
    const nama = `footer-${lebar}-${jalur === "/" ? "beranda" : jalur.replace(/\//g, "")}.png`;
    await page.screenshot({ path: path.join(keluar, nama) });
    console.log(`  ${label}: "${h.teks}" | baris y=${h.p.top}–${h.p.bottom} dari ${h.tinggiLayar}px (sisa ${h.jarakBawah}px) | tautan ${h.a.w}x${h.a.h}px`);
    cek(`${label}: baris hak cipta utuh di dalam layar (tidak terpotong kiri/kanan/bawah)`, h.p.top >= 0 && h.p.bottom <= h.tinggiLayar && h.p.left >= 0 && h.p.right <= h.lebarLayar && !h.gulirHorizontal, JSON.stringify(h.p));
    cek(`${label}: tidak ada elemen mengambang yang menumpuk baris hak cipta`, h.tumpuk.length === 0, h.tumpuk.join("; "));
    cek(`${label}: seluruh teks baris hak cipta tidak tertutup (hit-test tiap 12px)`, h.jumlahTertutup === 0, `${h.jumlahTertutup} titik: ${h.tertutup.join(" | ")}`);
    cek(`${label}: titik kiri/tengah/kanan tautan "Kredit foto" menerima ketukan`, h.titik.every((t) => t === "tautan"), h.titik.join(", "));
  }
  // ketuk sungguhan dari halaman beranda
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const tutup = page.getByRole("button", { name: "Tutup", exact: true });
  if (await tutup.count()) await tutup.first().click().catch(() => {});
  const tautan = page.locator('.lgt-footer-bawah a[href="/kredit-foto"]');
  await tautan.scrollIntoViewIfNeeded();
  await tautan.tap();
  await page.waitForURL(/\/kredit-foto$/, { timeout: 15000 }).catch(() => {});
  cek(`${lebar}px: mengetuk "Kredit foto" membuka /kredit-foto`, new URL(page.url()).pathname === "/kredit-foto", page.url());
  await ctx.close();
}
await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
