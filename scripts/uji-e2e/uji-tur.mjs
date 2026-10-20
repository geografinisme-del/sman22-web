// Uji tur sekolah (lokal saja): admin unggah foto (dikompres WebP ≤ 2400px), video > 15 detik ditolak,
// ganti satu titik menjadi video + poster, lalu beranda menampilkannya tanpa deploy ulang; tur dari awan sampai
// titik terakhir; mode daftar di HP. Pakai:
//   node scripts/uji-e2e/uji-tur.mjs <base-url> <akun-uji.json> <folder-media-uji>
// Folder media berisi: foto-besar.jpg (3000px), tur-6detik.mp4, tur-20detik.mp4, poster.jpg (berkas sintetis).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, berkasAkun, folder] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const media = (n) => path.join(folder, n);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let gagal = 0;
const cek = (nama, ok, info) => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${nama}${ok ? "" : " :: " + JSON.stringify(info)}`);
  if (!ok) gagal++;
};
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try {
    for (const k of ["prioritas", "rutin", "sapa"]) sessionStorage.setItem(`sman22:overlay:${k}`, "1");
  } catch {}
});
const page = await ctx.newPage();

// masuk sebagai pengelola konten (humas)
await page.goto(BASE + "/admin/login?sebagai=staf", { waitUntil: "networkidle" });
await page.fill("input[name=email]", "humas@sman22.test");
await page.fill("input[name=password]", AKUN.humas);
await page.locator("button[type=submit]", { hasText: "Masuk" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 20000 });

// buka titik "Aula"
await page.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
const aktifAwal = await page.locator("ol li").filter({ hasText: "Nonaktif" }).count();
cek("halaman admin tur memuat daftar titik", (await page.locator("ol > li").count()) >= 3, null);
const ubahAula = page.locator("ol > li").filter({ hasText: "Aula" }).getByRole("link", { name: "Ubah" });
await ubahAula.click();
await page.waitForURL(/ubah=/);

// 1. foto besar → WebP ≤ 2400px (titik bisa berupa video dari putaran sebelumnya → pilih "Foto" dulu)
await page.getByRole("radio", { name: "Foto" }).click();
await page.setInputFiles("input[type=file][accept*='image/jpeg']", media("foto-besar.jpg"));
await page.waitForSelector("text=Berkas terunggah", { timeout: 30000 });
// titik fokus lewat klik pratinjau
const bingkai = page.locator("[aria-label^='Pratinjau media']");
await bingkai.scrollIntoViewIfNeeded();
const b = await bingkai.boundingBox();
await page.mouse.click(b.x + b.width * 0.25, b.y + b.height * 0.75);
await page.locator("button", { hasText: "HP" }).click();
cek("pratinjau HP (9:16) & titik fokus terpilih", (await page.locator("input[name=fokus_x]").inputValue()) === "25" && (await page.locator("input[name=fokus_y]").inputValue()) === "75", { x: await page.locator("input[name=fokus_x]").inputValue(), y: await page.locator("input[name=fokus_y]").inputValue() });
await page.locator("button[type=submit]", { hasText: "Simpan perubahan" }).click();
await page.waitForURL(/pesan=tersimpan/, { timeout: 30000 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const fotoAula = await page.evaluate(() => {
  const li = [...document.querySelectorAll(".tur-item")].find((x) => x.textContent.includes("Aula"));
  const img = li?.querySelector("img");
  return { src: img?.getAttribute("src") ?? "", pos: img?.style.objectPosition };
});
const asli = decodeURIComponent(fotoAula.src.match(/url=([^&]+)/)?.[1] ?? "");
cek("foto tersimpan di bucket tur-sekolah sebagai WebP & tampil di beranda", /\/tur-sekolah\/foto\/[0-9a-f-]+\.webp$/.test(asli) && fotoAula.pos === "25% 75%", fotoAula);
const ukuran = await (async () => {
  const r = await ctx.request.get(asli);
  const buf = await r.body();
  // lebar WebP (VP8/VP8L/VP8X) dari header
  const s = buf.toString("ascii", 12, 16);
  if (s === "VP8X") return 1 + buf.readUIntLE(24, 3);
  if (s === "VP8 ") return buf.readUInt16LE(26) & 0x3fff;
  if (s === "VP8L") return 1 + ((buf[21] | (buf[22] << 8)) & 0x3fff);
  return -1;
})();
cek("foto dikompres: lebar ≤ 2400px", ukuran > 0 && ukuran <= 2400, ukuran);

// 2. video > 15 detik ditolak
await page.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
await page.locator("ol > li").filter({ hasText: "Aula" }).getByRole("link", { name: "Ubah" }).click();
await page.waitForURL(/ubah=/);
await page.getByRole("radio", { name: "Video" }).click();
await page.setInputFiles("input[type=file][accept='video/mp4']", media("tur-20detik.mp4"));
await page.waitForSelector("[role=alert]:has-text('maksimal 15 detik')", { timeout: 15000 }).catch(() => {});
cek("video 20 detik ditolak sebelum diunggah", await page.locator("[role=alert]", { hasText: "maksimal 15 detik" }).isVisible(), null);

// 3. video 6 detik + poster → tampil di beranda tanpa deploy ulang
await page.setInputFiles("input[type=file][accept='video/mp4']", media("tur-6detik.mp4"));
await page.waitForSelector("text=Berkas terunggah", { timeout: 30000 });
await page.setInputFiles("input[type=file][accept*='image/jpeg']", media("poster.jpg"));
await tidur(2500);
await page.locator("button[type=submit]", { hasText: "Simpan perubahan" }).click();
await page.waitForURL(/pesan=tersimpan/, { timeout: 30000 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const vid = await page.evaluate(() => {
  const li = [...document.querySelectorAll(".tur-item")].find((x) => x.textContent.includes("Aula"));
  const v = li?.querySelector("video");
  return v ? { src: v.getAttribute("src"), poster: v.getAttribute("poster"), muted: v.muted, loop: v.loop, inline: v.playsInline, autoplay: v.autoplay } : null;
});
cek("titik Aula kini video (muted, loop, playsinline, berposter, tanpa autoplay)", !!vid && /\/tur-sekolah\/video\/.+\.mp4$/.test(vid.src) && /\.webp$/.test(vid.poster) && vid.muted && vid.loop && vid.inline && !vid.autoplay, vid);

// 4. tur dari awan sampai titik terakhir; video hanya diputar saat titiknya aktif
await page.evaluate(() => document.querySelector("#tur").scrollIntoView({ behavior: "instant" }));
await tidur(1800);
const keadaan = async (pr) => {
  await page.evaluate((pr) => {
    const t = document.querySelector("#tur");
    window.scrollTo({ top: t.offsetTop + (t.offsetHeight - innerHeight) * pr, behavior: "instant" });
  }, pr);
  await tidur(700);
  return page.evaluate(() => ({
    mode: document.querySelector("#tur").dataset.mode,
    awan: +getComputedStyle(document.querySelector(".tur-awan")).opacity,
    aktif: [...document.querySelectorAll(".tur-kartu")].findIndex((k) => k.hasAttribute("data-aktif")),
    videoMain: [...document.querySelectorAll(".tur-video")].map((v) => !v.paused),
  }));
};
const n = await page.locator(".tur-item").count();
const iAula = await page.evaluate(() => [...document.querySelectorAll(".tur-item")].findIndex((x) => x.textContent.includes("Aula")));
const awal = await keadaan(0);
cek("tur: mode sticky, awan menutup layar di awal", awal.mode === "sticky" && awal.awan > 0.95, awal);
const urut = [];
for (let i = 0; i < n; i++) urut.push((await keadaan(0.1 + (0.9 * (i + 0.15)) / n)).aktif);
cek("tur: titik berganti berurutan dari awal sampai akhir", JSON.stringify(urut) === JSON.stringify([...Array(n).keys()]), urut);
const diAula = await keadaan(0.1 + (0.9 * (iAula + 0.15)) / n);
const bukanAula = await keadaan(0.1 + (0.9 * 0.15) / n);
cek("video hanya diputar saat titiknya aktif", diAula.videoMain.some(Boolean) && !bukanAula.videoMain.some(Boolean), { diAula, bukanAula });
const akhir = await keadaan(1);
cek("tur: akhir gulir = titik terakhir", akhir.aktif === n - 1 && akhir.awan === 0, akhir);
await ctx.close();

// 5. HP: daftar biasa, tanpa sticky
{
  const hp = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await hp.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.evaluate(() => document.querySelector("#tur").scrollIntoView({ behavior: "instant" }));
  await tidur(1500);
  const k = await p.evaluate(() => ({ mode: document.querySelector("#tur").dataset.mode, pos: getComputedStyle(document.querySelector(".tur-pin")).position, luber: document.documentElement.scrollWidth > innerWidth }));
  cek("HP 390: tur berupa daftar (tanpa sticky), tanpa luber", k.mode === "daftar" && k.pos !== "sticky" && !k.luber, k);
  await hp.close();
}
// 6. admin: urutan (tombol panah + "Simpan urutan") & batas minimal 3 titik aktif — keadaan dikembalikan
{
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c2.newPage();
  await p.goto(BASE + "/admin/login?sebagai=staf", { waitUntil: "networkidle" });
  await p.fill("input[name=email]", "humas@sman22.test");
  await p.fill("input[name=password]", AKUN.humas);
  await p.locator("button[type=submit]", { hasText: "Masuk" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 20000 });
  await p.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
  const judul = () => p.$$eval("ol > li", (li) => li.map((x) => x.querySelector("p")?.textContent ?? ""));
  const awalJudul = await judul();
  const pertama = (await p.locator("ol > li").first().locator("p").textContent()) ?? "";
  await p.locator("ol > li").first().getByRole("button", { name: /^Turunkan/ }).click();
  await p.getByRole("button", { name: "Simpan urutan" }).click();
  await p.waitForSelector("text=Urutan titik tur disimpan", { timeout: 15000 });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const urutBeranda = await p.$$eval(".tur-item h3", (h) => h.map((x) => x.textContent));
  cek("urutan baru dari admin langsung tampil di beranda", urutBeranda.length > 1 && pertama.includes(urutBeranda[1] ?? "~"), { urutBeranda, pertama });
  // kembalikan urutan
  await p.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
  await p.locator("ol > li").nth(1).getByRole("button", { name: /^Naikkan/ }).click();
  await p.getByRole("button", { name: "Simpan urutan" }).click();
  await p.waitForSelector("text=Urutan titik tur disimpan", { timeout: 15000 });

  // nonaktifkan sampai tersisa 3, lalu satu lagi harus ditolak
  const dinonaktifkan = [];
  for (;;) {
    await p.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
    // titik aktif = baris yang punya tombol "Nonaktifkan" (teks "Nonaktif" juga ada di dalam tombol itu)
    const aktif = await p.getByRole("button", { name: "Nonaktifkan", exact: true }).count();
    const tombol = p.locator("ol > li").getByRole("button", { name: "Nonaktifkan", exact: true }).first();
    const nama = await p.locator("ol > li").filter({ has: p.getByRole("button", { name: "Nonaktifkan", exact: true }) }).first().locator("p").textContent();
    await tombol.click();
    await p.waitForURL(/pesan=/);
    if (aktif <= 3) {
      cek("menonaktifkan titik ke-4 dari 3 aktif ditolak (minimal 3)", p.url().includes("pesan=tur-minimal") && (await p.locator("[role=alert]", { hasText: "Minimal 3" }).isVisible()), p.url());
      break;
    }
    dinonaktifkan.push(nama);
    if (dinonaktifkan.length > 10) break;
  }
  // aktifkan kembali
  for (let i = 0; i < dinonaktifkan.length; i++) {
    await p.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" });
    await p.locator("ol > li").getByRole("button", { name: "Aktifkan", exact: true }).first().click();
    await p.waitForURL(/pesan=/);
  }
  cek("keadaan urutan dikembalikan", JSON.stringify(await (async () => { await p.goto(BASE + "/admin/tur-sekolah", { waitUntil: "networkidle" }); return judul(); })()) === JSON.stringify(awalJudul), null);
  await c2.close();
}
void aktifAwal;
await browser.close();
console.log(`\n${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
