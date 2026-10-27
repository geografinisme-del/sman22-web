// Uji foto sementara (LOKAL): label & "Lihat foto asli" di galeri, lalu di admin "Kembalikan foto asli" (slot galeri)
// dan "Ganti dengan foto asli" (unggah, slot kode "Kartu Profil — Tata tertib"). Mengubah data → hanya server LOKAL.
// Pakai: node scripts/uji-e2e/uji-foto-slot.mjs <base-url> <akun-uji.json> <foto-uji.jpg>
import { chromium } from "playwright-core";
import fs from "node:fs";

const [BASE, berkasAkun, fotoUji] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + d}`);
  if (!ok) gagal++;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

// 1) galeri publik: label pengganti kegiatan + tautan foto asli yang benar-benar terbuka
await page.goto(BASE + "/galeri", { waitUntil: "networkidle" });
const label = await page.locator(".media-label", { hasText: "Ilustrasi — bukan foto kegiatan" }).count();
cek(`galeri: ${label} foto berlabel "Ilustrasi — bukan foto kegiatan"`, label >= 3, String(label));
const asli = await page.locator("a.tautan-foto-asli").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
cek(`galeri: ${asli.length} tautan "Lihat foto asli"`, asli.length >= 3, JSON.stringify(asli));
for (const href of asli) {
  const r = await page.request.get(BASE + href);
  cek(`"Lihat foto asli" ${href} → ${r.status()} ${r.headers()["content-type"]}`, r.ok() && /^image\//.test(r.headers()["content-type"] ?? ""));
}

// 2) admin: daftar slot
await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
// akun operator uji lokal (peran manajemen tanpa super_admin — super_admin WAJIB MFA); lihat reset-data-uji-lokal.mjs
await page.fill("input[name=email]", "ekspor@sman22.test");
await page.fill("input[name=password]", AKUN.ekspor);
await page.getByRole("button", { name: "Masuk", exact: true }).click();
await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/mfa"), { timeout: 30000 });
await page.goto(BASE + "/admin/foto-sementara", { waitUntil: "networkidle" });
const jumlah = await page.locator("main li").count();
cek(`admin Foto sementara: ${jumlah} lokasi tercantum`, jumlah >= 20, String(jumlah));

// 3) Kembalikan foto asli — Galeri "Upacara bendera"
const kartu = page.locator("main li", { hasText: "Galeri — Upacara bendera" });
await kartu.getByRole("button", { name: "Kembalikan foto asli" }).click();
await page.waitForURL(/pesan=foto-dikembalikan/, { timeout: 20000 });
cek("admin: notifikasi foto dikembalikan", await page.getByText("Foto asli dikembalikan").isVisible());
await page.goto(BASE + "/galeri", { waitUntil: "networkidle" });
const upacara = page.locator("li", { hasText: "Upacara bendera" }).first();
const src = await upacara.locator("img").first().getAttribute("src");
const masihLabel = await upacara.locator(".media-label").count();
cek(`galeri: "Upacara bendera" kembali ke foto asli tanpa label (${decodeURIComponent(src ?? "").slice(0, 60)})`, decodeURIComponent(src ?? "").includes("/images/upacara-pagi.jpg") && masihLabel === 0, `${src} label=${masihLabel}`);

// 4) Ganti dengan foto asli (unggah) — slot kode "Kartu Profil — Tata tertib"
await page.goto(BASE + "/admin/foto-sementara", { waitUntil: "networkidle" });
const tata = page.locator("main li", { hasText: "Kartu Profil — Tata tertib" });
await tata.locator('input[type="file"]').setInputFiles(fotoUji);
await tata.locator('input[name="alt"]').fill("Uji foto tata tertib");
await tata.getByRole("button", { name: "Unggah" }).click();
await page.waitForURL(/pesan=tersimpan/, { timeout: 30000 });
await page.goto(BASE + "/profil", { waitUntil: "networkidle" });
const kartuTata = page.locator("a", { hasText: "Tata tertib" }).filter({ has: page.locator("img") }).first();
const srcTata = decodeURIComponent((await kartuTata.locator("img").first().getAttribute("src")) ?? "");
const labelTata = await kartuTata.locator(".media-label").count();
cek(`profil: kartu Tata tertib memakai unggahan (Storage) tanpa label`, srcTata.includes("/storage/v1/object/public/") && labelTata === 0, `${srcTata.slice(0, 90)} label=${labelTata}`);

await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
