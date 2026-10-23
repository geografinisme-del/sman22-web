// Audit tampilan HP (BACA-SAJA): 4 perangkat × Chromium (Chrome) & WebKit (Safari), semua halaman publik + login.
// Mencatat per halaman: gulir horizontal (+ elemen penyebab), header menabrak judul/breadcrumb, latar header saat di
// atas & setelah digulir, ukuran font h1/h2/h3/p, target sentuh < 44px, ruang kosong besar antar-bagian, tombol mengambang
// yang menumpuk isi, fokus saat menu HP dibuka, status animasi kartu putar & tur (+ FPS dengan CPU 4× di Chromium).
// Pakai: node scripts/uji-e2e/audit-hp.mjs <base-url> <folder-keluar> [awalan] [jalur1,jalur2] [mesin=chromium,webkit]
//   pratinjau Vercel: COOKIE_PRATINJAU="_vercel_jwt=…"
import { chromium, webkit } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, keluar, awalan = "audit", daftarArg, mesinArg = "chromium,webkit"] = process.argv.slice(2);
fs.mkdirSync(keluar, { recursive: true });
const HALAMAN = (daftarArg ??
  "/,/profil,/profil/sejarah,/profil/visi-misi,/profil/guru-staf,/profil/fasilitas,/profil/tata-tertib,/sambutan,/pembelajaran,/pembelajaran/kurikulum,/pembelajaran/kalender,/pembelajaran/e-learning,/program,/ekskul,/prestasi,/alumni,/galeri,/berita,/pengumuman,/agenda,/spmb,/perpustakaan,/pengaduan,/kontak,/survei,/kredit-foto,/portal-digital,/portal-digital/masuk/gtk,/portal-digital/masuk/siswa,/portal-digital/masuk/orang-tua"
).split(",");
const PERANGKAT = [
  { nama: "360-galaxy", width: 360, height: 800, dpr: 3 },
  { nama: "375-se", width: 375, height: 667, dpr: 2 },
  { nama: "390-iphone14", width: 390, height: 844, dpr: 3 },
  { nama: "412-pixel7", width: 412, height: 915, dpr: 2.625 },
];
const MESIN = { chromium: () => chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }), webkit: () => webkit.launch() };
const ekstra = process.env.COOKIE_PRATINJAU ? { extraHTTPHeaders: { Cookie: process.env.COOKIE_PRATINJAU } } : {};
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const hasil = [];

async function tutupModal(page) {
  const t = page.getByRole("button", { name: "Tutup", exact: true });
  if (await t.count()) await t.first().click({ timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
}

/** ukuran dijalankan di halaman (posisi gulir 0) */
const ukurHalaman = () => {
  const vw = window.innerWidth;
  const terlihat = (e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
  };
  const sel = (e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}${typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  // gulir horizontal & penyebab
  const lebarDok = document.documentElement.scrollWidth;
  const keluarKanan = [...document.querySelectorAll("body *")]
    .filter((e) => terlihat(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest("[aria-hidden=true], .lgt-cincin, .tur-penanda, dialog:not([open])"))
    .slice(0, 6)
    .map((e) => `${sel(e)}→${Math.round(e.getBoundingClientRect().right)}`);
  // header vs judul/breadcrumb
  const header = document.querySelector("header");
  const rh = header?.getBoundingClientRect();
  const sasaran = [...document.querySelectorAll("main nav[aria-label*='emah' i], main .remah, main ol.remah, main h1, main [class*='remah']")].filter(terlihat);
  const tabrak = rh ? sasaran.filter((e) => e.getBoundingClientRect().top < rh.bottom - 1).map((e) => `${sel(e)} top=${Math.round(e.getBoundingClientRect().top)}`) : [];
  const latar = (e) => (e ? getComputedStyle(e).backgroundColor + " / blur " + (getComputedStyle(e).backdropFilter || getComputedStyle(e).webkitBackdropFilter || "-") : "-");
  const kotakHeader = header?.querySelector("div, nav") ?? header;
  // font
  const f = (q) => {
    const e = [...document.querySelectorAll(q)].find(terlihat);
    if (!e) return null;
    const cs = getComputedStyle(e);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return { px: Math.round(parseFloat(cs.fontSize)), lh: Math.round(lh), baris: Math.round(e.getBoundingClientRect().height / lh) };
  };
  // target sentuh
  const kecil = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary")]
    .filter((e) => terlihat(e) && !e.closest("p, li p, .lgt-prose, figcaption, .lgt-footer-bawah") && !e.closest("[aria-hidden=true]"))
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 || r.height < 44);
  // ruang kosong besar: jarak vertikal antara konten bagian berurutan di main
  const bagian = [...document.querySelectorAll("main > *, main > div > section, main section")].filter(terlihat);
  const celah = [];
  for (const s of bagian) {
    const anak = [...s.children].filter(terlihat);
    if (!anak.length) continue;
    const rs = s.getBoundingClientRect();
    const atas = Math.min(...anak.map((a) => a.getBoundingClientRect().top)) - rs.top;
    const bawah = rs.bottom - Math.max(...anak.map((a) => a.getBoundingClientRect().bottom));
    if (atas > 96 || bawah > 96) celah.push(`${sel(s)} atas=${Math.round(atas)} bawah=${Math.round(bawah)}`);
  }
  return {
    lebarDok,
    gulirHorizontal: lebarDok > vw + 1,
    keluarKanan,
    tinggiHeader: rh ? Math.round(rh.height) : null,
    bawahHeader: rh ? Math.round(rh.bottom) : null,
    latarHeaderAtas: latar(kotakHeader),
    tabrakHeader: tabrak,
    font: { h1: f("main h1"), h2: f("main h2"), h3: f("main h3"), p: f("main p") },
    targetKecil: kecil.length,
    contohKecil: kecil.slice(0, 6).map(({ e, r }) => `${sel(e)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 20)}"`),
    celah: celah.slice(0, 5),
  };
};

/** tombol/elemen mengambang yang menumpuk isi di tengah halaman */
const ukurMengambang = () => {
  const fixed = [...document.querySelectorAll("body *")].filter((e) => {
    const cs = getComputedStyle(e);
    return cs.position === "fixed" && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && !e.closest("header") && e.tagName !== "DIALOG";
  });
  return fixed
    .map((e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.width > window.innerWidth * 0.9) return null;
      const tumpuk = [...document.querySelectorAll("main h1, main h2, main h3, main p, main a, main button, main img, footer p, footer a")].filter((t) => {
        if (e.contains(t)) return false;
        const q = t.getBoundingClientRect();
        return q.width > 0 && q.bottom > r.top && q.top < r.bottom && q.right > r.left && q.left < r.right;
      }).length;
      return { el: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`, kotak: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`, tumpuk };
    })
    .filter(Boolean);
};

for (const nm of mesinArg.split(",")) {
  const browser = await MESIN[nm]();
  for (const p of PERANGKAT) {
    const ctx = await browser.newContext({ viewport: { width: p.width, height: p.height }, deviceScaleFactor: p.dpr, isMobile: nm === "chromium", hasTouch: true, ...ekstra });
    const page = await ctx.newPage();
    for (const jalur of HALAMAN) {
      const kunci = `${nm}-${p.nama}${jalur === "/" ? "-beranda" : jalur.replace(/\//g, "-")}`;
      try {
        await page.goto(BASE + jalur, { waitUntil: "networkidle", timeout: 45000 });
      } catch {
        await page.goto(BASE + jalur, { waitUntil: "load", timeout: 45000 }).catch(() => {});
      }
      await tutupModal(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await tunggu(500);
      const u = await page.evaluate(ukurHalaman);
      // pengumuman prioritas bisa muncul tertunda (setelah digulir) → tutup sebelum memotret
      await tutupModal(page);
      await page.screenshot({ path: path.join(keluar, `${awalan}-${kunci}.png`) });
      // latar header setelah digulir 300px & elemen mengambang di tengah halaman
      await page.evaluate(() => window.scrollTo(0, Math.min(600, document.documentElement.scrollHeight / 3)));
      await tunggu(700);
      const latarGulir = await page.evaluate(() => {
        const h = document.querySelector("header");
        const k = h?.querySelector("div, nav") ?? h;
        return k ? getComputedStyle(k).backgroundColor + " / blur " + (getComputedStyle(k).backdropFilter || getComputedStyle(k).webkitBackdropFilter || "-") : "-";
      });
      const mengambang = await page.evaluate(ukurMengambang);
      const baris = { mesin: nm, perangkat: p.nama, jalur, ...u, latarHeaderGulir: latarGulir, mengambang };
      // beranda: animasi & menu
      if (jalur === "/") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await tunggu(800);
        baris.kartuPutar = await page.evaluate(async () => {
          // cincin desktop memutar <ul>; cincin HP menggeser tiap kartu (li) → bandingkan keduanya.
          // HP maju satu kartu tiap 4 detik, jadi tunggu 4,5 detik
          const c = document.querySelector(".lgt-cincin");
          const jejak = () => (c ? [c, ...c.children].map((e) => getComputedStyle(e).transform).join("|") : null);
          const t0 = jejak();
          await new Promise((r) => setTimeout(r, 4500));
          const t1 = jejak();
          const mode = document.querySelector(".lgt-cincin-wadah")?.getAttribute("data-mode") ?? null;
          return { ada: Boolean(c), berubah: t0 !== t1, mode };
        });
        const tur = await page.$("#tur");
        if (tur) {
          await tur.scrollIntoViewIfNeeded();
          await tunggu(1200);
          baris.tur = await page.evaluate(() => ({ mode: document.querySelector(".tur")?.getAttribute("data-mode") ?? null }));
          // pengumuman prioritas bisa muncul tertunda (setelah digulir) → tutup sebelum memotret
          await tutupModal(page);
          await page.screenshot({ path: path.join(keluar, `${awalan}-${kunci}-tur.png`) });
        }
        // FPS kartu putar dengan CPU 4× (Chromium saja)
        if (nm === "chromium") {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          await page.evaluate(() => window.scrollTo(0, 0));
          await tunggu(800);
          baris.fps4x = await page.evaluate(
            () =>
              new Promise((r) => {
                let n = 0;
                const mulai = performance.now();
                const f = () => {
                  n++;
                  if (performance.now() - mulai < 2000) requestAnimationFrame(f);
                  else r(Math.round((n * 1000) / (performance.now() - mulai)));
                };
                requestAnimationFrame(f);
              }),
          );
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        }
        // menu HP dibuka: fokus awal & tangkapan
        await page.evaluate(() => window.scrollTo(0, 0));
        const buka = await page.evaluate(() => {
          const b = [...document.querySelectorAll("header button")].find((x) => /menu/i.test(x.getAttribute("aria-label") || x.textContent || ""));
          b?.click();
          return Boolean(b);
        });
        if (buka) {
          await tunggu(900);
          baris.menuFokus = await page.evaluate(() => {
            const a = document.activeElement;
            return a ? `${a.tagName.toLowerCase()}${a.getAttribute("type") ? "[" + a.getAttribute("type") + "]" : ""} "${(a.getAttribute("aria-label") || a.getAttribute("placeholder") || a.textContent || "").trim().slice(0, 30)}"` : "-";
          });
          baris.menuAkordeon = await page.evaluate(() => {
            const b = [...document.querySelectorAll("dialog[open] button[aria-expanded], [role=dialog] button[aria-expanded]")].find((x) => x.offsetParent);
            if (!b) return null;
            return { px: Math.round(parseFloat(getComputedStyle(b).fontSize)), tinggi: Math.round(b.getBoundingClientRect().height) };
          });
          await page.screenshot({ path: path.join(keluar, `${awalan}-${kunci}-menu.png`) });
          await page.keyboard.press("Escape");
        }
      }
      hasil.push(baris);
      console.log(`${kunci}: hscroll=${u.gulirHorizontal} header=${u.tinggiHeader} tabrak=${u.tabrakHeader.length} h1=${u.font.h1?.px ?? "-"}px/${u.font.h1?.baris ?? "-"}b kecil=${u.targetKecil} celah=${u.celah.length} ambang=${mengambang.map((m) => m.el + ":" + m.tumpuk).join(",")}${baris.kartuPutar ? ` putar=${baris.kartuPutar.berubah} tur=${baris.tur?.mode} fps4x=${baris.fps4x ?? "-"} fokusMenu=${baris.menuFokus}` : ""}`);
    }
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(keluar, `${awalan}.json`), JSON.stringify(hasil, null, 1));
console.log("selesai:", hasil.length, "halaman×perangkat×mesin");
