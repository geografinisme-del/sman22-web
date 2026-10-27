// Uji semua tombol ekspor/template di CMS: status 200, jenis berkas benar, isi tidak kosong, dan berkas .xlsx valid (zip).
// Pakai: node scripts/uji-e2e/uji-ekspor.mjs <base-url> <akun-uji.json> [id-kelas]
import { chromium } from "playwright-core";
import fs from "node:fs";

const [BASE, berkasAkun, kelas = ""] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const hari = new Date().toISOString().slice(0, 10);
const RUTE = [
  ["Template siswa (Excel)", "/admin/siswa/template", "xlsx"],
  ["Template siswa (CSV)", "/admin/siswa/template?format=csv", "csv"],
  ["Template guru/pegawai (Excel)", "/admin/pegawai/template", "xlsx"],
  ["Template guru/pegawai (CSV)", "/admin/pegawai/template?format=csv", "csv"],
  ["Ekspor siswa", "/admin/siswa/ekspor?status=semua", "xlsx"],
  ["Ekspor guru & pegawai", "/admin/pegawai/ekspor", "xlsx"],
  ["Ekspor inventaris sarpras", "/admin/sarpras/ekspor", "xlsx"],
  ["Ekspor statistik alumni", "/admin/alumni/ekspor", "xlsx"],
  // tanpa data (mis. database uji belum punya kerangka mutu/jadwal) server menjawab pesan singkat yang jelas
  ["Ekspor paket mutu", "/admin/mutu/ekspor", "xlsx", true],
  ["Ekspor jadwal", "/admin/jadwal/ekspor?lihat=kelas", "xlsx", true],
  ...(kelas ? [["Ekspor rekap absensi", `/admin/absensi/rekap/ekspor?kelas=${kelas}&dari=${hari}&sampai=${hari}`, "xlsx"]] : []),
];
let gagal = 0;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "networkidle" });
// akun operator uji (peran manajemen tanpa super_admin): super_admin WAJIB MFA sehingga akan berhenti di /admin/mfa.
// Akun ini dibuat di stack lokal saja (lihat HANDOFF "Data uji lokal"); sandinya di akun-uji.json → sandi.ekspor
await page.fill("input[name=email]", "ekspor@sman22.test");
await page.fill("input[name=password]", AKUN.ekspor);
await page.getByRole("button", { name: "Masuk", exact: true }).click();
await page.waitForURL((u) => u.pathname.startsWith("/admin") && !u.pathname.startsWith("/admin/mfa"), { timeout: 30000 });
for (const [nama, url, jenis, bolehKosong] of RUTE) {
  const r = await page.request.get(BASE + url);
  const isi = await r.body();
  const tipe = r.headers()["content-type"] ?? "";
  const ok =
    r.status() === 200 &&
    isi.length > 0 &&
    (jenis === "xlsx" ? tipe.includes("spreadsheetml") && isi[0] === 0x50 && isi[1] === 0x4b : tipe.includes("text/csv") && isi[0] === 0xef && isi[1] === 0xbb && isi[2] === 0xbf);
  const kosongJelas = bolehKosong && [403, 404].includes(r.status()) && tipe.includes("text/plain") && isi.length > 0 && isi.length < 200;
  if (!ok && !kosongJelas) gagal++;
  console.log(`${ok || kosongJelas ? "LULUS" : "GAGAL"} ${nama}: ${r.status()} ${tipe.split(";")[0]} ${isi.length} byte${kosongJelas ? ` — pesan: "${isi.toString("utf8")}"` : ""}`);
}

// UI: bila server tidak bisa menyiapkan berkas, tombol menampilkan pesan (tidak diam saja)
await page.goto(BASE + "/admin/jadwal?lihat=kelas", { waitUntil: "networkidle" });
const tombol = page.getByRole("button", { name: "Unduh Excel" });
if (await tombol.count()) {
  await tombol.first().click();
  const pesan = await page.locator(".tombol-unduh + [role=alert]").first().textContent({ timeout: 10000 }).catch(() => "");
  const ok = Boolean(pesan?.trim());
  if (!ok) gagal++;
  console.log(`${ok ? "LULUS" : "GAGAL"} tombol "Unduh Excel" jadwal tanpa data menampilkan pesan: "${pesan?.trim()}"`);
}
await browser.close();
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
