// Audit gambar situs (BACA-SAJA): untuk setiap gambar yang tampil, catat berkas asli, ukuran piksel asli, ukuran tampil,
// dan faktor PEMBESARAN di layar retina: > 1 berarti piksel diregangkan (tampak buram/pecah).
//   pembesaran = max(lebarTampil / lebarAsli, tinggiTampil / tinggiAsli) × devicePixelRatio  (object-fit: cover)
// Mega menu dibuka satu per satu; halaman digulir sampai bawah agar gambar lazy ikut dimuat.
// Pakai: node scripts/uji-e2e/audit-gambar.mjs <base-url> <berkas-hasil.json>
import { chromium } from "playwright-core";
import fs from "node:fs";

const [BASE, keluar] = process.argv.slice(2);
const HALAMAN = [
  "/", "/profil", "/profil/fasilitas", "/profil/guru-staf", "/profil/sejarah", "/profil/visi-misi", "/profil/tata-tertib", "/sambutan",
  "/berita", "/pengumuman", "/agenda", "/galeri", "/prestasi", "/program", "/ekskul", "/alumni", "/perpustakaan", "/spmb",
  "/pembelajaran", "/pembelajaran/kurikulum", "/pembelajaran/e-learning", "/pembelajaran/kalender", "/pengaduan", "/kontak", "/survei",
  "/portal-digital", "/portal-digital/masuk/gtk", "/portal-digital/masuk/siswa", "/portal-digital/masuk/orang-tua",
];
const LAYAR = [
  { nama: "1440@2x", width: 1440, height: 900, deviceScaleFactor: 2 },
  { nama: "390@3x", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

const kumpul = () =>
  [...document.querySelectorAll("img"), ...document.querySelectorAll("*")]
    .flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) return [];
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") return [];
      let src = null;
      if (el.tagName === "IMG") src = el.currentSrc || el.src;
      else {
        const m = cs.backgroundImage.match(/url\("?([^")]+)"?\)/);
        if (m) src = m[1];
      }
      if (!src) return [];
      const u = new URL(src, location.href);
      const asli = u.pathname === "/_next/image" ? u.searchParams.get("url") : u.pathname;
      // ukuran TATA LETAK (tanpa efek 3D/perspektif kartu putar) × skala transform milik gambar itu sendiri (zoom gulir)
      const m2 = cs.transform.match(/^matrix\(([-\d.e]+), ([-\d.e]+)/);
      const skala = m2 ? Math.hypot(Number(m2[1]), Number(m2[2])) : 1;
      const w = (el.offsetWidth || r.width) * skala;
      const h = (el.offsetHeight || r.height) * skala;
      const bagian = el.closest("section[id], section[aria-label], [aria-label][role], header, footer, dialog, nav, main");
      const judul = el.closest("figure, li, article, a, [data-titik]")?.querySelector("h2,h3,h4,figcaption,strong")?.textContent;
      return [{
        asli: decodeURIComponent(asli),
        tampilW: Math.round(w), tampilH: Math.round(h),
        fit: el.tagName === "IMG" ? cs.objectFit : cs.backgroundSize,
        alt: el.getAttribute("alt") ?? "", latar: el.tagName !== "IMG",
        bagian: bagian ? (bagian.id || bagian.getAttribute("aria-label") || bagian.tagName.toLowerCase()) : "",
        label: (judul || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 50),
      }];
    });

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const hasil = [];
for (const layar of LAYAR) {
  const ctx = await browser.newContext({ viewport: { width: layar.width, height: layar.height }, deviceScaleFactor: layar.deviceScaleFactor, isMobile: layar.isMobile, hasTouch: layar.hasTouch });
  const page = await ctx.newPage();
  for (const jalur of HALAMAN) {
    await page.goto(BASE + jalur, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    // gulir sampai bawah agar gambar lazy dimuat, lalu kembali ke atas
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle").catch(() => {});
    for (const g of await page.evaluate(kumpul)) hasil.push({ layar: layar.nama, dpr: layar.deviceScaleFactor, halaman: jalur, ...g });
    // mega menu (desktop) / menu HP: buka satu per satu
    if (jalur === "/") {
      const tombol = layar.width >= 1024 ? ["Profil", "Pembelajaran", "Kehidupan Siswa", "Kabar & Agenda", "Layanan"] : ["Menu"];
      for (const t of tombol) {
        const ok = await page.evaluate((t) => {
          const b = [...document.querySelectorAll("header button")].find((x) => (x.getAttribute("aria-label") || x.textContent).trim() === t);
          if (!b) return false;
          b.click();
          return true;
        }, t);
        if (!ok) continue;
        await page.waitForTimeout(900);
        for (const g of await page.evaluate(kumpul)) hasil.push({ layar: layar.nama, dpr: layar.deviceScaleFactor, halaman: `/ (menu: ${t})`, ...g });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(keluar, JSON.stringify(hasil, null, 1));
console.log(`${hasil.length} gambar tampil tercatat → ${keluar}`);
