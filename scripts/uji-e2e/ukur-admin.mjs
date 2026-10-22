// Ukur kecepatan pindah menu admin: klik dilakukan DI HALAMAN (tanpa jeda aksi Playwright) dan dicatat per frame:
//   reaksi  = menu yang diklik tampak aktif (aria-current/data-memuat) ATAU kerangka halaman tampil
//   kerangka= skeleton loading.tsx tampil
//   konten  = alamat sudah berpindah & judul halaman baru tampil (kerangka hilang)
// + jumlah request server (RSC) & request database per klik (dihitung dari log Kong Supabase lokal),
// + uji tombol template impor. Server lokal (next start) ↔ Supabase LOKAL.
// Pakai: node scripts/uji-e2e/ukur-admin.mjs <base-url> <akun-uji.json> <berkas-hasil.json> [putaran=3] [kontainer-kong]
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [BASE, berkasAkun, keluar, putaranArg = "3", KONG = "supabase_kong_sman22-web-uji"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const PUTARAN = Number(putaranArg) || 3;
const MENU = [
  { nama: "Data Induk", grup: "Data Induk", href: "/admin/siswa", judul: "Siswa" },
  { nama: "Ekskul & OSIS", grup: "Ekskul & OSIS", href: "/admin/ekskul", judul: "Ekskul" },
  { nama: "Perpustakaan", grup: "Perpustakaan", href: "/admin/perpus", judul: "Perpustakaan" },
  { nama: "Sarpras", grup: "Sarpras", href: "/admin/sarpras", judul: "Sarana" },
  { nama: "Alumni", grup: "Alumni", href: "/admin/alumni", judul: "Alumni" },
];

function requestDb(sejak) {
  const log = execFileSync("docker", ["logs", "--since", sejak, KONG], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const baris = log.split("\n").filter((b) => /"(GET|POST|PATCH|HEAD|DELETE) \/(rest|auth|storage)\/v1\//.test(b));
  return { total: baris.length, rest: baris.filter((b) => b.includes("/rest/v1/")).length, auth: baris.filter((b) => b.includes("/auth/v1/")).length };
}

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((grup) => {
  try {
    localStorage.setItem("admin-menu-grup", JSON.stringify(grup));
  } catch {}
}, MENU.map((m) => m.grup));
const page = await ctx.newPage();
const galatKonsol = [];
page.on("console", (m) => m.type() === "error" && galatKonsol.push(m.text()));
page.on("pageerror", (e) => galatKonsol.push(String(e)));

await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
await page.fill("input[name=email]", "admin@sman22.test");
await page.fill("input[name=password]", AKUN.admin);
await page.getByRole("button", { name: "Masuk", exact: true }).click();
await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/mfa"), { timeout: 30000 });
await page.waitForLoadState("networkidle");

const hasil = [];
for (let p = 1; p <= PUTARAN; p++) {
  for (const m of MENU) {
    await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200); // beri waktu prefetch
    await page.locator(`a[href="${m.href}"]`).first().waitFor({ state: "visible", timeout: 10000 });
    let rsc = 0;
    const hitungRsc = (r) => r.url().includes("_rsc=") && rsc++;
    page.on("request", hitungRsc);
    const sejak = new Date(Date.now() - 30).toISOString();
    await page.evaluate(([href, judul]) => {
      const t = (window.__ukur = { mulai: performance.now() });
      const lamaH1 = document.querySelector("main h1")?.textContent;
      const cek = () => {
        const d = Math.round(performance.now() - t.mulai);
        const a = document.querySelector(`a[href="${href}"]`);
        const kerangka = Boolean(document.querySelector("[data-memuat-halaman]"));
        if (t.reaksi == null && (a?.getAttribute("aria-current") === "page" || a?.getAttribute("data-memuat") === "1" || kerangka)) t.reaksi = d;
        if (t.kerangka == null && kerangka) t.kerangka = d;
        const h1 = document.querySelector("main h1")?.textContent ?? "";
        if (t.konten == null && location.pathname === href && !kerangka && h1 !== lamaH1 && h1.includes(judul)) t.konten = d;
        if (t.konten == null && d < 15000) requestAnimationFrame(cek);
      };
      requestAnimationFrame(cek);
      document.querySelector(`a[href="${href}"]`).click();
    }, [m.href, m.judul]);
    await page.waitForFunction(() => window.__ukur?.konten != null, null, { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    page.off("request", hitungRsc);
    await new Promise((r) => setTimeout(r, 300));
    const t = await page.evaluate(() => window.__ukur);
    const db = requestDb(sejak);
    hasil.push({ putaran: p, menu: m.nama, reaksiMs: t.reaksi, kerangkaMs: t.kerangka ?? null, kontenMs: t.konten, requestServer: rsc, requestDb: db });
    console.log(`p${p} ${m.nama.padEnd(14)} reaksi ${String(t.reaksi).padStart(4)} ms | kerangka ${String(t.kerangka ?? "-").padStart(4)} | konten ${String(t.konten).padStart(4)} ms | RSC ${String(rsc).padStart(2)} | DB ${db.total} (rest ${db.rest}, auth ${db.auth})`);
  }
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
console.log("\nMEDIAN per menu:");
for (const m of MENU) {
  const h = hasil.filter((x) => x.menu === m.nama);
  console.log(`  ${m.nama.padEnd(14)} reaksi ${median(h.map((x) => x.reaksiMs))} ms | konten ${median(h.map((x) => x.kontenMs))} ms | RSC ${median(h.map((x) => x.requestServer))} | DB ${median(h.map((x) => x.requestDb.total))} (auth ${median(h.map((x) => x.requestDb.auth))})`);
}

const template = [];
for (const u of ["/admin/siswa/template", "/admin/siswa/template?format=csv", "/admin/pegawai/template", "/admin/pegawai/template?format=csv"]) {
  const r = await page.request.get(BASE + u);
  const isi = await r.body();
  template.push({ url: u, status: r.status(), tipe: r.headers()["content-type"], byte: isi.length });
  console.log(`template ${u}: ${r.status()} ${r.headers()["content-type"]} ${isi.length} byte`);
}
fs.writeFileSync(keluar, JSON.stringify({ hasil, template, galatKonsol }, null, 1));
console.log("galat konsol:", galatKonsol.length ? galatKonsol.slice(0, 5) : "tidak ada");
await browser.close();
