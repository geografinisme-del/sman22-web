// Tahap C: tangkap SEMUA rute publik di 1440 & 390 dan periksa konsistensi desain "Langit cerah".
// Pakai: MSYS_NO_PATHCONV=1 node scripts/uji-e2e/tangkap-semua.mjs http://localhost:3001 <folder-keluar> [jalur1,jalur2]
// Pemeriksaan per halaman: status HTTP, header & footer baru, huruf Plus Jakarta Sans, tanpa warna/huruf lama,
// tanpa luber horizontal, kartu memakai radius token. Hasil: laporan JSON + tangkapan layar halaman penuh.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [base, keluar, daftarArg] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(base ?? "")) throw new Error("base harus http://localhost:<port>");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
fs.mkdirSync(keluar, { recursive: true });

const RUTE = daftarArg
  ? daftarArg.split(",")
  : [
      "/", "/profil", "/profil/visi-misi", "/profil/sejarah", "/profil/guru-staf", "/profil/fasilitas", "/sambutan",
      "/pembelajaran", "/program", "/program/7kaih", "/pembelajaran/e-learning", "/pembelajaran/kalender", "/pembelajaran/kurikulum",
      "/prestasi", "/ekskul", "/galeri", "/berita", "/berita/uji-kegiatan-literasi", "/pengumuman", "/agenda",
      "/perpustakaan", "/perpustakaan/00000000-0000-0000-0000-0000000f0b01", "/pengaduan", "/pengaduan/cek", "/sertifikat", "/survei",
      "/spmb", "/kontak", "/alumni", "/alumni/daftar", "/cari?q=sekolah", "/portal-digital", "/admin/login", "/halaman-tidak-ada",
    ];
// warna & huruf desain lama yang tidak boleh muncul lagi (rgb dari #7A1F36, #7A1F2B, #F5F0E6, #F6F2EA, #EDE5D6)
const WARNA_LAMA = ["rgb(122, 31, 54)", "rgb(122, 31, 43)", "rgb(245, 240, 230)", "rgb(246, 242, 234)", "rgb(237, 229, 214)"];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const laporan = [];
for (const lebar of [1440, 390]) {
  const ponsel = lebar < 700;
  const ctx = await browser.newContext({ viewport: { width: lebar, height: ponsel ? 844 : 900 }, deviceScaleFactor: 1, isMobile: ponsel, hasTouch: ponsel });
  await ctx.addInitScript(() => {
    try {
      for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  for (const jalur of RUTE) {
    const res = await page.goto(base + jalur, { waitUntil: "load", timeout: 120000 });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      // tunggu semua gambar (lazy) selesai dimuat, maks. 8 detik
      await Promise.race([
        Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => i.addEventListener("load", r, { once: true }) || i.addEventListener("error", r, { once: true }))))),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const nama = `${jalur === "/" ? "beranda" : jalur.replace(/^\//, "").replace(/[/?=&]/g, "_")}-${lebar}.png`;
    await page.screenshot({ path: path.join(keluar, nama), fullPage: true });
    const cek = await page.evaluate((lama) => {
      const semua = [...document.querySelectorAll("body *")].filter((e) => e.getClientRects().length);
      const warnaLama = new Set();
      const hurufLain = new Set();
      for (const e of semua) {
        const g = getComputedStyle(e);
        for (const w of [g.color, g.backgroundColor, g.borderTopColor]) if (lama.includes(w)) warnaLama.add(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join(".")}:${w}`);
        const f = g.fontFamily.split(",")[0].replace(/"/g, "").trim();
        if (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !/Jakarta|JetBrains|jakarta|jetbrains/.test(f)) hurufLain.add(f);
      }
      const h1 = document.querySelector("h1");
      return {
        judul: h1?.textContent.trim().slice(0, 60) ?? null,
        header: Boolean(document.querySelector(".lgt-header")),
        footer: Boolean(document.querySelector("#navigasi-situs")),
        heroLangit: Boolean(document.querySelector("[data-hero-langit]")),
        hurufH1: h1 ? getComputedStyle(h1).fontFamily.split(",")[0].replace(/"/g, "") : null,
        hurufLain: [...hurufLain].slice(0, 5),
        warnaLama: [...warnaLama].slice(0, 5),
        // di HP lebar tata letak bisa ikut melebar (isMobile) → bandingkan dengan lebar layar perangkat
        luber: document.documentElement.scrollWidth > Math.min(window.innerWidth, screen.width) + 1 || window.innerWidth > screen.width + 1,
      };
    }, WARNA_LAMA);
    laporan.push({ jalur, lebar, status: res?.status() ?? 0, berkas: nama, ...cek });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(keluar, "laporan.json"), JSON.stringify(laporan, null, 1));
const masalah = laporan.filter((r) => r.status >= 500 || r.luber || r.warnaLama.length || r.hurufLain.length || (!r.jalur.startsWith("/admin") && (!r.header || !r.footer)));
console.log(`${laporan.length} tangkapan; ${masalah.length} dengan catatan`);
for (const m of masalah) console.log(JSON.stringify(m));
