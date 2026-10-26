// Uji alur impor siswa lewat UI: unggah → Cocokkan kolom → Periksa → Impor → "Impor berhasil".
// Pakai: node scripts/uji-e2e/uji-impor.mjs <base-url> <akun-uji.json> <folder-tangkapan> <berkas1> [berkas2 …]
// Akun operator uji "ekspor" (di database UJI lokal; jalankan reset-data-uji-lokal.mjs dulu). Hanya untuk server lokal.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [BASE, berkasAkun, keluar, ...berkas] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
fs.mkdirSync(keluar, { recursive: true });
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + d}`);
  if (!ok) gagal++;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
// akun operator uji lokal (peran manajemen tanpa super_admin — super_admin WAJIB MFA); lihat reset-data-uji-lokal.mjs
await page.fill("input[name=email]", "ekspor@sman22.test");
await page.fill("input[name=password]", AKUN.ekspor);
await page.getByRole("button", { name: "Masuk", exact: true }).click();
await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/mfa"), { timeout: 30000 });

for (const [i, f] of berkas.entries()) {
  const nama = path.basename(f);
  await page.goto(BASE + "/admin/siswa/impor", { waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', f);
  // langkah 2: cocokkan kolom
  const periksa = page.getByRole("button", { name: "Periksa data" });
  await periksa.waitFor({ timeout: 15000 });
  const peta = await page.locator("select").evaluateAll((s) => s.filter((x) => x.value !== "" && x.value !== "-1").length);
  cek(`${nama}: langkah Cocokkan kolom — ${peta} kolom terpetakan otomatis`, peta >= 14, String(peta));
  if (i === 0) await page.screenshot({ path: path.join(keluar, "impor-1-cocokkan.png"), fullPage: false });
  await periksa.click();
  // langkah 3: periksa
  const tombolImpor = page.getByRole("button", { name: /^Impor \d+ data$/ });
  await tombolImpor.waitFor({ timeout: 20000 });
  const label = await tombolImpor.textContent();
  cek(`${nama}: langkah Periksa — "${label}" (baris contoh dilewati)`, label === "Impor 3 data", label);
  if (i === 0) await page.screenshot({ path: path.join(keluar, "impor-2-periksa.png"), fullPage: false });
  await tombolImpor.click();
  // langkah 4: selesai
  await page.getByRole("heading", { name: "Impor berhasil" }).waitFor({ timeout: 30000 });
  const ringkas = await page.locator('[role="status"]').first().innerText();
  cek(`${nama}: Selesai — ${ringkas.replace(/\s+/g, " ").slice(0, 90)}`, /Data baru:\s*3/.test(ringkas), ringkas);
  if (i === 0) await page.screenshot({ path: path.join(keluar, "impor-3-selesai.png"), fullPage: false });
}
await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
