// Uji cakupan keluar: login di 2 browser terpisah (A & B, akun sama) →
//   1) "Keluar" di A → A keluar, B TETAP masuk (signOut scope local)
//   2) A masuk lagi → "Keluar dari semua perangkat" di B (Profil saya, dengan konfirmasi) → A & B keluar (scope global)
// + jumlah sesi akun di database (auth.sessions) di setiap langkah. Hanya server & Supabase LOKAL.
// Pakai: node scripts/uji-e2e/uji-keluar.mjs <base-url> <akun-uji.json> [kontainer-db]
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [BASE, berkasAkun, DB = "supabase_db_sman22-web-uji"] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const EMAIL = "guru@sman22.test";
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + d}`);
  if (!ok) gagal++;
};
const sesi = () =>
  Number(
    execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-tAc", `select count(*) from auth.sessions s join auth.users u on u.id = s.user_id where u.email = '${EMAIL}'`], {
      encoding: "utf8",
    }).trim(),
  );

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const baru = async () => (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
async function masuk(page) {
  await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", EMAIL);
  await page.fill("input[name=password]", AKUN.guru);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/admin"), { timeout: 30000 });
}
/** masih masuk? buka Profil saya: tetap di sana = masuk; dialihkan ke halaman masuk = keluar */
async function masihMasuk(page) {
  await page.goto(BASE + "/admin/profil-saya", { waitUntil: "networkidle" });
  return new URL(page.url()).pathname === "/admin/profil-saya";
}

execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-tAc", `delete from auth.sessions where user_id = (select id from auth.users where email = '${EMAIL}')`]);
const A = await baru();
const B = await baru();
await masuk(A);
await masuk(B);
cek(`login di browser A & B → ${sesi()} sesi di database`, sesi() === 2, String(sesi()));

// 1) Keluar (perangkat ini saja) di A
await A.goto(BASE + "/admin/profil-saya", { waitUntil: "networkidle" });
await A.evaluate(() => [...document.querySelectorAll('button[type="submit"]')].find((b) => b.textContent.trim() === "Keluar").click());
await A.waitForURL((u) => u.pathname === "/portal-digital", { timeout: 20000 });
cek("A: \"Keluar\" → kembali ke Portal Digital", true);
cek("A: setelah keluar, /admin meminta login lagi", !(await masihMasuk(A)), A.url());
cek("B: TETAP masuk setelah A keluar", await masihMasuk(B), B.url());
cek(`database: tinggal ${sesi()} sesi (sesi A saja yang diakhiri)`, sesi() === 1, String(sesi()));

// 2) Keluar dari semua perangkat di B (Profil saya, konfirmasi)
await masuk(A);
cek(`A masuk lagi → ${sesi()} sesi`, sesi() === 2, String(sesi()));
await B.goto(BASE + "/admin/profil-saya", { waitUntil: "networkidle" });
await B.getByRole("button", { name: "Keluar dari semua perangkat" }).click();
const dialog = B.getByRole("alertdialog");
cek("B: muncul konfirmasi singkat sebelum keluar", await dialog.isVisible(), "");
await B.screenshot({ path: "tangkapan/cms/keluar-semua-konfirmasi.png", fullPage: false });
await B.getByRole("button", { name: "Batal" }).click();
cek("B: \"Batal\" menutup konfirmasi tanpa keluar", !(await dialog.isVisible()) && (await masihMasuk(B)));
await B.getByRole("button", { name: "Keluar dari semua perangkat" }).click();
await B.getByRole("button", { name: "Ya, keluar dari semua perangkat" }).click();
await B.waitForURL((u) => u.pathname === "/portal-digital/masuk/gtk", { timeout: 20000 });
const pesan = await B.locator('[role="status"], [role="alert"]').filter({ hasText: /semua perangkat/i }).first().textContent().catch(() => "");
cek(`B: diarahkan ke halaman masuk dengan pesan "${(pesan ?? "").trim().slice(0, 70)}"`, Boolean(pesan?.trim()));
cek("B: keluar", !(await masihMasuk(B)), B.url());
cek("A: ikut keluar", !(await masihMasuk(A)), A.url());
cek(`database: ${sesi()} sesi tersisa`, sesi() === 0, String(sesi()));

await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
