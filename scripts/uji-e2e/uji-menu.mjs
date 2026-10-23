// Uji navigasi "Langit cerah" (lokal saja): MEGA MENU desktop (1440 & 1024) dan menu layar penuh TERANG di HP 390,
// keyboard (Tab, Enter, ↓, Esc), hover/klik/klik di luar, isi menu (5 grup, tanpa Portal di Layanan, Guru & Tendik),
// footer = struktur menu, semua tautan tidak 404, tanpa CLS saat panel terbuka, dan tangkapan setiap panel.
// Pakai: node scripts/uji-e2e/uji-menu.mjs <base-url> <folder-keluar>
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar = "tangkapan/menu"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
fs.mkdirSync(keluar, { recursive: true });
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
const semuaTautan = new Map();
const GRUP = ["Profil", "Pembelajaran", "Kehidupan Siswa", "Kabar & Agenda", "Layanan"];

// ---------- desktop: mega menu ----------
for (const lebar of [1440, 1024]) {
  const ctx = await browser.newContext({ viewport: { width: lebar, height: 900 } });
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await tidur(1800); // animasi masuk hero selesai sebelum mengukur posisi judul
  const nama = `desktop ${lebar}`;
  const terbuka = () => page.evaluate(() => [...document.querySelectorAll(".lgt-mega-pemicu[aria-expanded='true']")].map((b) => b.textContent.trim()));
  const panelTerlihat = () => page.evaluate(() => [...document.querySelectorAll(".lgt-mega-panel")].filter((p) => !p.hidden && p.getBoundingClientRect().height > 0).length);

  const pemicu = await page.$$eval(".lgt-mega-pemicu", (b) => b.map((x) => x.textContent.trim()));
  cek(`${nama}: 5 menu di header`, JSON.stringify(pemicu) === JSON.stringify(GRUP), pemicu);
  cek(`${nama}: tombol "Menu" layar penuh tidak tampil`, !(await page.locator(".lgt-tombol-menu").isVisible()), null);
  cek(`${nama}: tombol Portal Digital 22 → /portal-digital`, (await page.getAttribute(".lgt-tombol-portal", "href")) === "/portal-digital", null);

  // hover dengan jeda niat → panel; posisi konten tidak bergeser (overlay, tanpa CLS)
  const yJudul = await page.evaluate(() => document.querySelector("#judul-hero").getBoundingClientRect().top);
  await page.hover(".lgt-mega-pemicu >> nth=0");
  await tidur(60);
  const terlaluCepat = await panelTerlihat();
  await tidur(300);
  cek(`${nama}: hover membuka panel setelah jeda niat ±120ms`, terlaluCepat === 0 && (await panelTerlihat()) === 1 && (await terbuka())[0] === "Profil", { terlaluCepat });
  cek(`${nama}: panel overlay — konten tidak bergeser`, Math.abs((await page.evaluate(() => document.querySelector("#judul-hero").getBoundingClientRect().top)) - yJudul) < 1, null);

  // setiap panel: isi lengkap, 3 kartu tanpa terpotong / gulir horizontal; tangkapan
  for (let i = 0; i < GRUP.length; i++) {
    await page.hover(`.lgt-mega-pemicu >> nth=${i}`);
    await tidur(450);
    const k = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".lgt-mega-panel")].find((x) => !x.hidden);
      const r = p.getBoundingClientRect();
      const kartu = [...p.querySelectorAll(".lgt-mega-kartu > li, .lgt-mega-layanan > li")].map((li) => li.getBoundingClientRect());
      return {
        tautan: [...p.querySelectorAll(".lgt-mega-tautan a")].map((a) => ({ href: a.getAttribute("href"), label: a.querySelector("strong").textContent.trim() })),
        kartu: kartu.length,
        kartuDalam: kartu.every((b) => b.left >= r.left - 1 && b.right <= r.right + 1),
        gulirX: p.scrollWidth > p.clientWidth + 1,
        akses: [...p.querySelectorAll(".lgt-mega-akses a")].map((a) => a.textContent.trim()),
        luber: document.documentElement.scrollWidth > innerWidth,
      };
    });
    cek(`${nama}: panel ${GRUP[i]} — tautan lengkap, kartu dalam panel, tanpa gulir horizontal`, k.tautan.length >= 3 && k.kartuDalam && !k.gulirX && !k.luber && (i === 3 || k.kartu >= 3), k);
    for (const t of k.tautan) semuaTautan.set(t.href, `${nama} › ${GRUP[i]} › ${t.label}`);
    if (i === 0) cek(`${nama}: akses cepat lengkap`, JSON.stringify(k.akses) === JSON.stringify(["Info SPMB", "Portal Siswa", "Portal Orang Tua", "Guru & Tendik", "E-Learning", "E-Library"]), k.akses);
    if (i === 0) cek(`${nama}: Profil memuat Guru dan tenaga kependidikan & Tata tertib`, k.tautan.some((t) => t.label === "Guru dan tenaga kependidikan") && k.tautan.some((t) => t.label === "Tata tertib"), k.tautan);
    if (i === 4) cek(`${nama}: Layanan tanpa Portal Digital 22`, !k.tautan.some((t) => /portal/i.test(t.label)), k.tautan);
    await page.screenshot({ path: path.join(keluar, `mega-${lebar}-${i + 1}-${GRUP[i].toLowerCase().replace(/[^a-z]+/g, "-")}.png`) });
  }
  // Kabar: ganti kategori tanpa memuat ulang
  await page.hover(".lgt-mega-pemicu >> nth=3");
  await tidur(400);
  const urlAwal = page.url();
  const judulSemua = await page.$$eval(".lgt-mega-panel:not([hidden]) .lgt-mega-kabar-judul", (x) => x.map((e) => e.textContent));
  await page.click(".lgt-mega-kategori button:has-text('Agenda')");
  await tidur(300);
  const judulAgenda = await page.$$eval(".lgt-mega-panel:not([hidden]) .lgt-mega-kabar-judul", (x) => x.map((e) => e.textContent));
  const pil = await page.$$eval(".lgt-mega-panel:not([hidden]) .lgt-mega-pil", (x) => [...new Set(x.map((e) => e.textContent))]);
  cek(`${nama}: kategori kabar berganti tanpa memuat ulang`, page.url() === urlAwal && JSON.stringify(judulSemua) !== JSON.stringify(judulAgenda) && (pil.length === 0 || (pil.length === 1 && pil[0] === "Agenda")), { judulSemua, judulAgenda, pil });
  if (lebar === 1440) await page.screenshot({ path: path.join(keluar, `mega-${lebar}-4b-kabar-agenda.png`) });

  // pindah antar menu saat panel terbuka = langsung berganti
  await page.hover(".lgt-mega-pemicu >> nth=1");
  await tidur(60);
  cek(`${nama}: pindah menu saat panel terbuka langsung berganti`, (await terbuka())[0] === "Pembelajaran", await terbuka());

  // kursor keluar > 250ms menutup
  await page.mouse.move(lebar / 2, 860);
  await tidur(120);
  const masih = await panelTerlihat();
  await tidur(350);
  cek(`${nama}: kursor keluar >250ms menutup panel (tidak seketika)`, masih === 1 && (await panelTerlihat()) === 0, { masih });

  // klik membuka; klik di luar menutup
  await page.click(".lgt-mega-pemicu >> nth=2");
  await tidur(300);
  const bukaKlik = (await terbuka())[0];
  await page.mouse.move(lebar - 40, 880);
  await page.mouse.click(lebar - 40, 880);
  await tidur(300);
  cek(`${nama}: klik membuka, klik di luar menutup`, bukaKlik === "Kehidupan Siswa" && (await terbuka()).length === 0, { bukaKlik });

  // keyboard: Tab ke menu, Enter buka, Tab di dalam panel, Esc menutup & fokus kembali
  await page.mouse.move(lebar / 2, 880);
  await page.focus(".lgt-merek");
  await page.keyboard.press("Tab");
  const fokus1 = await page.evaluate(() => document.activeElement?.textContent.trim());
  await page.keyboard.press("Enter");
  await tidur(300);
  await page.keyboard.press("Tab");
  const dalamPanel = await page.evaluate(() => Boolean(document.activeElement?.closest(".lgt-mega-panel")));
  await page.keyboard.press("Escape");
  await tidur(200);
  const fokusKembali = await page.evaluate(() => document.activeElement?.getAttribute("data-pemicu"));
  cek(`${nama}: keyboard — Tab ke menu, Enter buka, Tab masuk panel, Esc tutup & fokus kembali`, fokus1 === "Profil" && dalamPanel && (await terbuka()).length === 0 && fokusKembali === "profil", { fokus1, dalamPanel, fokusKembali });
  // ↓ membuka & fokus ke tautan pertama
  await page.keyboard.press("ArrowDown");
  await tidur(300);
  cek(`${nama}: ↓ membuka panel & fokus ke tautan pertama`, (await terbuka())[0] === "Profil" && (await page.evaluate(() => Boolean(document.activeElement?.closest(".lgt-mega-panel")))), null);
  await page.keyboard.press("Escape");

  // klik tautan menutup panel
  await page.click(".lgt-mega-pemicu >> nth=4");
  await tidur(300);
  await page.click(".lgt-mega-panel:not([hidden]) .lgt-mega-tautan a >> nth=0");
  await page.waitForURL(/perpustakaan/, { timeout: 15000 }).catch(() => {});
  await tidur(500);
  cek(`${nama}: klik tautan membuka halaman & menutup panel`, page.url().includes("/perpustakaan") && (await terbuka()).length === 0, page.url());

  // footer mengikuti struktur menu
  const footer = await page.$$eval("#navigasi-situs > div", (k) => k.map((x) => x.querySelector(".label-mono")?.textContent.trim()));
  cek(`${nama}: footer = struktur menu`, JSON.stringify(footer) === JSON.stringify(GRUP), footer);
  for (const a of await page.$$eval(".lgt-footer a[href^='/'], .lgt-header a[href^='/']", (x) => x.map((e) => e.getAttribute("href")))) if (!semuaTautan.has(a)) semuaTautan.set(a, `${nama} › header/footer`);
  await ctx.close();
}

// ---------- HP 390: menu layar penuh terang ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await bersih(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  cek("HP: mega menu tidak tampil, tombol Menu tampil", !(await page.locator(".lgt-mega").isVisible()) && (await page.locator(".lgt-tombol-menu").isVisible()), null);
  await page.click(".lgt-tombol-menu");
  const dialog = page.locator("dialog.lgt-menu-hp");
  await dialog.waitFor({ state: "visible" });
  await tidur(450);
  const k = await page.evaluate(() => {
    const d = document.querySelector("dialog.lgt-menu-hp");
    const cs = getComputedStyle(d);
    return {
      open: d.open,
      label: d.getAttribute("aria-label"),
      latar: cs.backgroundImage,
      fokus: document.activeElement?.className,
      awan: d.querySelectorAll(".lgt-awan-tipis svg").length,
      kunci: getComputedStyle(document.documentElement).overflow,
      grup: [...d.querySelectorAll(".lgt-akordeon-judul")].map((x) => x.textContent.trim()),
      nomor: [...d.querySelectorAll(".lgt-akordeon-nomor")].map((x) => x.textContent.trim()),
      sentuh: [...d.querySelectorAll("button, a")].filter((e) => e.getBoundingClientRect().height > 0).every((e) => e.getBoundingClientRect().height >= 43.5),
      luber: d.scrollWidth > d.clientWidth + 1,
    };
  });
  // fokus awal di tombol Tutup — bukan kolom cari (di HP fokus ke kolom memunculkan papan ketik)
  cek("HP: menu terbuka (dialog terang, awan, fokus di tombol Tutup, scroll halaman terkunci)", k.open && k.label === "Menu" && k.latar.includes("linear-gradient") && k.awan >= 2 && k.fokus === "lgt-menu-hp-tutup" && k.kunci === "hidden", k);
  cek("HP: 5 menu akordeon bernomor 01–05", JSON.stringify(k.grup) === JSON.stringify(GRUP) && k.nomor.join(",") === "01,02,03,04,05", k);
  cek("HP: target sentuh ≥ 44px, tanpa luber", k.sentuh && !k.luber, k);
  await page.screenshot({ path: path.join(keluar, "hp-390-menu.png") });
  for (let i = 0; i < GRUP.length; i++) {
    await page.click(`.lgt-akordeon > li >> nth=${i} >> button`);
    await tidur(400);
    const a = await page.evaluate((i) => {
      const li = document.querySelectorAll(".lgt-akordeon > li")[i];
      return {
        buka: [...document.querySelectorAll(".lgt-akordeon button[aria-expanded='true']")].length,
        foto: Boolean(li.querySelector(".lgt-akordeon-foto")),
        tautan: [...li.querySelectorAll(".lgt-akordeon-tautan a")].map((x) => ({ href: x.getAttribute("href"), label: x.textContent.trim() })),
        ajakan: li.querySelector(".lgt-akordeon-ajakan")?.textContent.trim(),
        kabar: li.querySelectorAll(".lgt-akordeon-kabar li").length,
      };
    }, i);
    cek(`HP: akordeon ${GRUP[i]} — satu terbuka, foto, tautan, tombol ajakan`, a.buka === 1 && a.foto && a.tautan.length >= 3 && Boolean(a.ajakan), a);
    for (const t of a.tautan) semuaTautan.set(t.href, `HP › ${GRUP[i]} › ${t.label}`);
    await page.locator(".lgt-akordeon > li").nth(i).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(keluar, `hp-390-akordeon-${i + 1}.png`) });
  }
  const akses = await page.$$eval(".lgt-menu-hp-akses > div > p", (x) => x.map((e) => e.textContent.trim()));
  cek("HP: akses cepat per pengguna (Guru & Tendik)", JSON.stringify(akses) === JSON.stringify(["Calon siswa", "Orang tua", "Siswa", "Guru & Tendik"]), akses);
  for (const a of await page.$$eval(".lgt-menu-hp-akses a, .lgt-menu-hp-portal", (x) => x.map((e) => e.getAttribute("href")))) if (!semuaTautan.has(a)) semuaTautan.set(a, "HP › akses cepat");
  await page.keyboard.press("Escape");
  await tidur(300);
  cek("HP: Esc menutup menu & membuka kunci scroll", !(await dialog.evaluate((d) => d.open)) && (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== "hidden", null);
  await ctx.close();
}

// semua tautan tidak 404
{
  const ctx = await browser.newContext();
  for (const [href, asal] of semuaTautan) {
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
    const r = await ctx.request.get(BASE + href.split("#")[0], { maxRedirects: 5 });
    cek(`${r.status()} ${href}  (${asal})`, r.status() < 400, r.status());
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${semuaTautan.size} tautan diperiksa — ${gagal ? gagal + " gagal" : "semua lulus"}`);
process.exit(gagal ? 1 : 0);
