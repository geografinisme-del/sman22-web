// Uji beranda HP (BACA-SAJA), 360 & 390 px, Chromium + WebKit:
// - kartu putar mode "hp" dan maju sendiri; hanya kartu pertama berprioritas tinggi;
// - foto di bawah hero (tur, angka, kabar, galeri/kehidupan siswa, tentang kami) BELUM diminta di posisi atas,
//   lalu terpasang & benar-benar termuat setelah digulir mendekatinya; tanpa gulir horizontal.
// Pakai: node scripts/uji-e2e/uji-beranda-hp.mjs <base-url> [mesin=chromium,webkit]
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
const BAGIAN = { tur: "#tur", kabar: ".lgt-baris-foto, .lgt-ikartu-foto", galeri: ".lgt-mozaik", tentang: ".lgt-foto-besar", angka: ".lgt-bento-foto" };

// keadaan foto tertunda per bagian: jumlah, yang sudah ber-src, yang sudah termuat
const fotoBagian = (page) =>
  page.evaluate((B) => {
    const hasil = {};
    for (const [k, sel] of Object.entries(B)) {
      const img = [...document.querySelectorAll(sel)].flatMap((w) => (w.matches("img") ? [w] : [...w.querySelectorAll("img.media-gambar")]));
      hasil[k] = { total: img.length, src: img.filter((i) => i.getAttribute("src")).length, muat: img.filter((i) => i.complete && i.naturalWidth > 0).length };
    }
    return hasil;
  }, BAGIAN);

for (const nm of daftarMesin.split(",")) {
  const browser = await MESIN[nm]();
  for (const lebar of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: 780 }, isMobile: nm === "chromium", hasTouch: true, deviceScaleFactor: 2, ...ekstra });
    const page = await ctx.newPage();
    const L = (t) => `${nm} ${lebar}px: ${t}`;
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const t = page.getByRole("button", { name: "Tutup", exact: true });
    if (await t.count()) await t.first().click({ timeout: 1500 }).catch(() => {});

    // kartu putar
    const prio = await page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot img")].map((i) => i.getAttribute("fetchpriority")));
    cek(L(`hanya kartu pertama berprioritas tinggi (${prio.filter((p) => p === "high").length})`), prio[0] === "high" && prio.filter((p) => p === "high").length === 1, prio);
    cek(L("kartu putar mode cincin HP"), (await page.getAttribute(".lgt-cincin-wadah", "data-mode")) === "hp");
    const jejak = () => page.evaluate(() => [...document.querySelectorAll(".lgt-cincin-slot")].map((s) => s.style.transform).join("|"));
    const j0 = await jejak();
    await page.waitForTimeout(7000);
    cek(L("kartu putar maju sendiri"), (await jejak()) !== j0);

    // foto di bawah hero: belum diminta di posisi atas
    const atas = await fotoBagian(page);
    const jauh = ["kabar", "galeri", "tentang"].filter((k) => atas[k].total > 0);
    cek(L(`foto jauh di bawah belum diminta di posisi atas (${jauh.map((k) => `${k} ${atas[k].src}/${atas[k].total}`).join(", ")})`), jauh.every((k) => atas[k].src === 0), atas);

    // gulir bertahap sampai dasar: setiap foto terpasang & termuat
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    await page.waitForTimeout(2500);
    const bawah = await fotoBagian(page);
    for (const [k, v] of Object.entries(bawah)) {
      if (!v.total) continue;
      cek(L(`${k}: foto muncul setelah digulir (${v.muat}/${v.total} termuat)`), v.src === v.total && v.muat === v.total, v);
    }
    cek(L("tanpa gulir horizontal"), !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
    await ctx.close();
  }
  await browser.close();
}
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
