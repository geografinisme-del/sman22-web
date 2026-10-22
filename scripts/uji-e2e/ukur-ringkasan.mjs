// Ukur halaman Ringkasan admin (/admin): jumlah request database & waktu, dua cara:
//   1) muat penuh  = GET /admin (HTML) — waktu respons server + request DB (log Kong Supabase lokal)
//   2) pindah menu = klik "Ringkasan" di sidebar dari Data Induk — reaksi & konten tampil (diukur di halaman)
// Putaran 1 setelah server baru dinyalakan = cache kosong; putaran berikutnya memakai cache singkat (bila ada).
// Pakai: node scripts/uji-e2e/ukur-ringkasan.mjs <base-url> <akun-uji.json> <berkas-hasil.json> [putaran=3] [kontainer-kong]
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [BASE, berkasAkun, keluar, putaranArg = "3", KONG = "supabase_kong_sman22-web-uji"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const PUTARAN = Number(putaranArg) || 3;

function requestDb(sejak) {
  const log = execFileSync("docker", ["logs", "--since", sejak, KONG], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const baris = log.split("\n").filter((b) => /"(GET|POST|PATCH|HEAD|DELETE) \/(rest|auth|storage)\/v1\//.test(b));
  return { total: baris.length, rest: baris.filter((b) => b.includes("/rest/v1/")).length, auth: baris.filter((b) => b.includes("/auth/v1/")).length };
}
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("admin-menu-grup", JSON.stringify(["Data Induk"]));
  } catch {}
});
const page = await ctx.newPage();
// masuk langsung ke Data Induk agar Ringkasan belum pernah dibuka (putaran 1 = cache kosong)
await page.goto(BASE + "/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fsiswa", { waitUntil: "networkidle" });
await page.fill("input[name=email]", "admin@sman22.test");
await page.fill("input[name=password]", AKUN.admin);
await page.getByRole("button", { name: "Masuk", exact: true }).click();
await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/mfa"), { timeout: 30000 });
await page.waitForLoadState("networkidle");
await jeda(1500);

const hasil = [];
for (let p = 1; p <= PUTARAN; p++) {
  // 1) muat penuh
  let sejak = new Date(Date.now() - 30).toISOString();
  const t0 = Date.now();
  const r = await page.request.get(BASE + "/admin");
  await r.body();
  const muatMs = Date.now() - t0;
  await jeda(400);
  const dbMuat = requestDb(sejak);

  // 2) pindah menu lewat sidebar
  await page.goto(BASE + "/admin/siswa", { waitUntil: "networkidle" });
  await jeda(1200);
  sejak = new Date(Date.now() - 30).toISOString();
  await page.evaluate(() => {
    const t = (window.__ukur = { mulai: performance.now() });
    const cek = () => {
      const d = Math.round(performance.now() - t.mulai);
      const a = document.querySelector('nav a[href="/admin"]');
      const kerangka = Boolean(document.querySelector("[data-memuat-halaman]"));
      if (t.reaksi == null && (a?.getAttribute("aria-current") === "page" || a?.getAttribute("data-memuat") === "1" || kerangka)) t.reaksi = d;
      const siap = location.pathname === "/admin" && !kerangka && document.querySelector('main h1')?.textContent?.includes("Ringkasan") && document.querySelector('section[aria-label="Perlu ditindaklanjuti"]');
      if (t.konten == null && siap) t.konten = d;
      if (t.konten == null && d < 20000) requestAnimationFrame(cek);
    };
    requestAnimationFrame(cek);
    document.querySelector('nav a[href="/admin"]').click();
  });
  await page.waitForFunction(() => window.__ukur?.konten != null, null, { timeout: 25000 });
  await page.waitForLoadState("networkidle");
  await jeda(400);
  const t = await page.evaluate(() => window.__ukur);
  const dbKlik = requestDb(sejak);
  hasil.push({ putaran: p, muatMs, dbMuat, reaksiMs: t.reaksi, kontenMs: t.konten, dbKlik });
  console.log(`p${p} muat penuh ${String(muatMs).padStart(4)} ms DB ${dbMuat.total} (auth ${dbMuat.auth}) | klik: reaksi ${t.reaksi} ms, konten ${t.konten} ms, DB ${dbKlik.total} (auth ${dbKlik.auth})`);
}
fs.writeFileSync(keluar, JSON.stringify(hasil, null, 1));
await browser.close();
