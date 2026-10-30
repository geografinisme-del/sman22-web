// Uji "Lihat sebagai…" (pratinjau peran) — HANYA server & database LOKAL (memakai akun uji dan docker lokal).
// Jalankan reset-data-uji-lokal.mjs dulu. Kunci tanda tangan lokal dibaca dari berkas (tidak ditampilkan).
// Pakai: node scripts/uji-e2e/uji-pratinjau.mjs <base-url-lokal> <akun-uji.json> <folder-tangkapan> <berkas-kunci-lokal>
import { chromium } from "playwright-core";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RUANG_KERJA } from "../../src/lib/ruang-kerja.ts";

const [BASE, berkasAkun, keluar, berkasKunci] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE ?? "")) throw new Error("base harus http://localhost:<port>");
const SANDI = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const KUNCI = fs.readFileSync(berkasKunci, "utf8").trim();
fs.mkdirSync(keluar, { recursive: true });
const KONTAINER = "supabase_db_sman22-web-uji";
const psql = (sql) => execFileSync("docker", ["exec", "-i", KONTAINER, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" }).trim();
const PESAN = "Mode pratinjau — perubahan tidak disimpan";

let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + JSON.stringify(d).slice(0, 300)}`);
  if (!ok) gagal++;
};
const totp = (rahasia) => {
  const abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bit = "";
  for (const c of rahasia.replace(/[\s=]/g, "").toUpperCase()) bit += abjad.indexOf(c).toString(2).padStart(5, "0");
  const k = Buffer.from(bit.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const l = Buffer.alloc(8);
  l.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", k).update(l).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, "0");
};
const tandaCookie = (p) => {
  const isi = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${isi}.${createHmac("sha256", KUNCI).update(isi).digest("base64url")}`;
};

// server lokal kadang berhenti sendiri (Node di Windows keluar 0xC0000409) lalu dimulai ulang pengawas: navigasi yang
// gagal tersambung diulang setelah server kembali, bukan dihitung sebagai hasil uji
let putus = 0;
const tahanPutus = (page) => {
  for (const nama of ["goto", "reload"]) {
    const asli = page[nama].bind(page);
    page[nama] = async (...arg) => {
      for (let i = 0; ; i++) {
        try {
          return await asli(...arg);
        } catch (e) {
          if (i >= 10 || !/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_EMPTY_RESPONSE|ERR_SOCKET_NOT_CONNECTED/.test(String(e))) throw e;
          if (i === 0) putus++;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };
  }
  return page;
};
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const masuk = async (ctx, email, sandi) => {
  const page = tahanPutus(await ctx.newPage());
  await page.goto(BASE + "/portal-digital/masuk/gtk", { waitUntil: "load" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", sandi);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/portal-digital/masuk"), { timeout: 30000 });
  return page;
};
const mfa = async (page) => {
  await page.goto(BASE + "/admin/mfa", { waitUntil: "load" });
  await page.getByRole("button", { name: /Mulai pasang/ }).click();
  await page.getByRole("button", { name: /Tidak bisa memindai/ }).click();
  const rahasia = (await page.locator("p.font-mono").first().textContent()).trim();
  await page.fill("input[autocomplete='one-time-code']", totp(rahasia));
  await page.getByRole("button", { name: "Aktifkan", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
};
// buka halaman lalu tunggu pengalihan sisi klien (redirect() dari Server Component dieksekusi setelah load)
const bukaDitolak = async (page, url) => {
  await page.goto(BASE + url, { waitUntil: "load" });
  for (let i = 0; i < 20; i++) {
    if (page.url().includes("tanpa-akses")) return true;
    const p = new URL(page.url()).pathname;
    if (!p.startsWith("/admin") || p.startsWith("/admin/mfa")) return true; // dialihkan keluar area admin (portal, login, MFA)
    await page.waitForTimeout(150);
  }
  // halaman tampil: pastikan bukan halaman penolakan yang dirender langsung
  return /tidak (memiliki|berhak)|tanpa akses/i.test((await page.textContent("main").catch(() => "")) ?? "");
};
// ruang kerja yang ditawarkan sidebar (pemilih ≥2, tautan tunggal, atau tidak ada)
const ruangSidebar = (page) =>
  page.evaluate(() => {
    const sel = document.querySelector("#ruang-kerja-sisi");
    if (sel) return [...sel.options].slice(1).map((o) => o.textContent.trim());
    const p = [...document.querySelectorAll("aside p")].find((x) => x.textContent.trim().startsWith("Ruang kerja:"));
    return p ? [p.querySelector("a").textContent.trim()] : [];
  });
const halamanTerbuka = async (page) => {
  const hasil = [];
  for (const r of RUANG_KERJA) if (!(await bukaDitolak(page, r.href))) hasil.push(r.label);
  if (!(await bukaDitolak(page, "/admin/pengguna"))) hasil.push("Pengguna & Peran");
  return hasil;
};
const status = async (page, url) => (await page.request.get(BASE + url, { maxRedirects: 0 })).status();

// ================= 1. AKSES: non-super-admin, super admin tanpa MFA, cookie palsu =================
{
  const ctx = await browser.newContext();
  const page = await masuk(ctx, "humas@sman22.test", SANDI.humas);
  await page.goto(BASE + "/lihat-sebagai", { waitUntil: "load" });
  cek("humas: halaman Lihat sebagai menolak (bukan super admin)", (await page.textContent("main")).includes("hanya untuk super admin"));
  const r = await page.request.post(BASE + "/lihat-sebagai/mulai", { form: { peran: "kepala_sekolah" }, maxRedirects: 0, headers: { origin: BASE } });
  const c = (await ctx.cookies()).filter((x) => x.name.startsWith("sman22_pratinjau"));
  cek("humas: POST mulai pratinjau ditolak, tanpa cookie", r.status() === 303 && (r.headers().location ?? "").includes("ditolak") && c.length === 0, { s: r.status(), c });
  // cookie palsu (tanda tangan salah) → tidak ada perubahan hak; ruang kerja humas tetap, Pengguna & Kurikulum tetap tertolak
  await ctx.addCookies([{ name: "sman22_pratinjau", value: "eyJwZXJhbiI6Imt1cmlrdWx1bSJ9.palsu", url: BASE }]);
  cek("humas + cookie palsu: Pengguna & Peran tetap tertolak", await bukaDitolak(page, "/admin/pengguna"), page.url());
  cek("humas + cookie palsu: ruang Humas miliknya tetap terbuka", !(await bukaDitolak(page, "/admin/humas")), page.url());
  // cookie bertanda tangan SAH tetapi pemiliknya humas (bukan super admin) → database mengabaikan header
  await ctx.addCookies([{ name: "sman22_pratinjau", value: tandaCookie({ peran: "kepala_sekolah", uid: "x", mulai: Date.now() }), url: BASE }]);
  cek("humas + cookie sah palsu (kepala sekolah): Persetujuan Konten tetap tertolak", await bukaDitolak(page, "/admin/persetujuan"), page.url());
  cek("humas + cookie sah palsu: Pengguna & Peran tetap tertolak", await bukaDitolak(page, "/admin/pengguna"), page.url());
  await ctx.close();
}
{
  const ctx = await browser.newContext();
  const page = await masuk(ctx, "admin@sman22.test", SANDI.admin);
  await page.goto(BASE + "/lihat-sebagai", { waitUntil: "load" });
  cek("super admin TANPA MFA: Lihat sebagai ditolak", (await page.textContent("main")).includes("hanya untuk super admin"));
  const r = await page.request.post(BASE + "/lihat-sebagai/mulai", { form: { peran: "guru" }, maxRedirects: 0, headers: { origin: BASE } });
  cek("super admin TANPA MFA: POST mulai ditolak", r.status() === 303 && (r.headers().location ?? "").includes("ditolak"), r.status());
  await ctx.close();
}

// ================= 1b. PEMBANDING: halaman yang terbuka untuk akun ASLI tiap peran (tanpa pratinjau) =================
const AKUN_ASLI = { guru: "guru@sman22.test", waka_humas: "humas@sman22.test", pustakawan: "pustakawan@sman22.test", laboran: "laboran@sman22.test", pegawai: "umum@sman22.test" };
const SANDI_ASLI = { guru: SANDI.guru, waka_humas: SANDI.humas, pustakawan: SANDI.pustakawan, laboran: SANDI.laboran, pegawai: SANDI.umum };
const pembanding = {};
for (const [kode, email] of Object.entries(AKUN_ASLI)) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await masuk(c, email, SANDI_ASLI[kode]);
  await p.goto(BASE + "/admin", { waitUntil: "load" });
  pembanding[kode] = { halaman: await halamanTerbuka(p), ruang: (await p.goto(BASE + "/admin", { waitUntil: "load" }), await ruangSidebar(p)) };
  await c.close();
}

// ================= 2. SUPER ADMIN AAL2: tiap peran =================
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await masuk(ctx, "admin@sman22.test", SANDI.admin);
await mfa(page);
await page.goto(BASE + "/admin", { waitUntil: "load" });
cek("super admin AAL2: tombol 'Lihat sebagai…' ada di menu akun", (await page.locator('a[href="/lihat-sebagai"]').count()) > 0);
await page.goto(BASE + "/lihat-sebagai", { waitUntil: "load" });
const jumlahPeran = Number(psql("select count(*) from public.peran where kode <> 'super_admin';"));
const pilihan = await page.locator("button[data-peran]").count();
cek(`pemilih memuat semua peran dari database (+ menunggu verifikasi): ${pilihan}`, pilihan === jumlahPeran + 1, { pilihan, jumlahPeran });
await page.screenshot({ path: path.join(keluar, "pemilih-1440.png"), fullPage: true });

const izinPeran = (kode) => psql(`select coalesce(string_agg(izin, ','), '') from public.peran_izin where peran = '${kode}';`).split(",").filter(Boolean);
const mulai = async (kode) => {
  await page.goto(BASE + "/lihat-sebagai", { waitUntil: "load" });
  await page.click(`button[data-peran="${kode}"]`);
  await page.waitForLoadState("load");
  await page.waitForTimeout(800);
};
const potret = async (nama) => {
  await page.screenshot({ path: path.join(keluar, `${nama}-1440.png`) });
  const hp = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, storageState: await ctx.storageState() });
  const p2 = await hp.newPage();
  await p2.goto(page.url(), { waitUntil: "load" });
  await p2.waitForTimeout(900);
  const pita = await p2.evaluate(() => {
    const b = document.querySelector(".pita-pratinjau")?.getBoundingClientRect();
    const h = document.querySelector("[data-pita-geser], .lgt-header")?.getBoundingClientRect();
    return { pita: b && { atas: Math.round(b.top), bawah: Math.round(b.bottom) }, header: h && { atas: Math.round(h.top) }, lebar: document.documentElement.scrollWidth > innerWidth };
  });
  cek(`${nama} 390px: pita terlihat & header di bawahnya (tidak menutupi), tanpa gulir horizontal`, pita.pita && pita.pita.atas === 0 && (!pita.header || pita.header.atas >= pita.pita.bawah - 1) && !pita.lebar, pita);
  await p2.screenshot({ path: path.join(keluar, `${nama}-390.png`) });
  await hp.close();
};

const PERAN_UJI = [
  ["guru", "guru"],
  ["pustakawan", "pustakawan"],
  ["pegawai", "pegawai"],
  ["laboran", "laboran"],
  ["waka_kurikulum", "ruang-kurikulum"],
  ["waka_kesiswaan", "ruang-kesiswaan"],
  ["waka_sarpras", "ruang-sarpras"],
  ["waka_humas", "ruang-humas"],
  ["operator", "ruang-tata-usaha"],
  ["tim_mutu", "ruang-mutu"],
  ["bk", "ruang-bk"],
  ["kepala_sekolah", "manajemen"],
];
const POTRET = new Set(["guru", "pegawai", "waka_kurikulum", "waka_humas"]);
for (const [kode, nama] of PERAN_UJI) {
  await mulai(kode);
  const label = await page.locator(".pita-pratinjau strong").first().textContent().catch(() => "");
  cek(`${kode}: pita "Anda melihat sebagai: …" tampil`, /Anda melihat sebagai:/.test(label ?? ""), label);
  const izin = izinPeran(kode);
  const harusLabel = RUANG_KERJA.filter((r) => r.izin.some((i) => izin.includes(i))).map((r) => r.label);
  await page.goto(BASE + "/admin", { waitUntil: "load" });
  const ruang = await ruangSidebar(page);
  cek(`${kode}: ruang kerja di sidebar = izin peran [${harusLabel.join(", ") || "-"}], tanpa ruang kerja lain`, JSON.stringify(ruang) === JSON.stringify(harusLabel), { ruang, harus: harusLabel });
  const terbuka = await halamanTerbuka(page);
  // Pengguna & Peran: super admin (semua) dan operator (akun & peran dasar) saja
  cek(`${kode}: Pengguna & Peran ${kode === "operator" ? "terbuka (akun dasar)" : "tertolak"}`, terbuka.includes("Pengguna & Peran") === (kode === "operator"), terbuka);
  if (pembanding[kode]) {
    cek(`${kode}: halaman yang terbuka SAMA dengan login asli peran ini`, JSON.stringify(terbuka) === JSON.stringify(pembanding[kode].halaman), { pratinjau: terbuka, asli: pembanding[kode].halaman });
    cek(`${kode}: ruang kerja sidebar SAMA dengan login asli`, JSON.stringify(ruang) === JSON.stringify(pembanding[kode].ruang), { pratinjau: ruang, asli: pembanding[kode].ruang });
  }
  if (POTRET.has(kode)) {
    await page.goto(BASE + "/admin", { waitUntil: "load" });
    await page.waitForTimeout(600);
    await potret(nama);
  }
}

// menunggu verifikasi (tanpa peran)
await mulai("__tanpa_peran__");
await page.goto(BASE + "/admin", { waitUntil: "load" });
cek("tanpa peran: halaman 'menunggu verifikasi'", /verifikasi|belum diberi peran|menunggu/i.test(await page.textContent("main")), page.url());

// siswa & orang tua: data contoh
for (const [kode, nama] of [["siswa", "siswa"], ["orang_tua", "orang-tua"]]) {
  await mulai(kode);
  cek(`${kode}: diarahkan ke portal`, new URL(page.url()).pathname === "/portal", page.url());
  const teks = await page.textContent("main");
  const anak = (await page.locator("section p.text-3xl").allTextContents()).filter((t) => /[a-z]/i.test(t));
  cek(`${kode}: label "Data contoh" & nama fiktif (${anak.join(", ")})`, teks.includes("Data contoh") && anak.length === (kode === "siswa" ? 1 : 2) && anak.every((a) => a.includes("Contoh")), anak);
  const asli = psql("select coalesce(string_agg(nama, '|'), '') from public.siswa where deleted_at is null limit 5;").split("|").filter(Boolean);
  cek(`${kode}: notifikasi pribadi admin tidak tampil (badge kosong)`, (await page.locator('a[href="/portal/notifikasi"] span').count()) === 0);
  cek(`${kode}: tidak ada nama siswa asli di halaman`, !asli.some((n) => teks.includes(n)), asli.slice(0, 3));
  await potret(nama);
}

// ================= 2b. MENU PER PERAN (A2a + A3): grup bidang hanya untuk pengelola, "Layanan saya" hanya layanan pribadi,
// URL langsung ditolak server, tampilan baca-saja, screenshot 1440/390 =================
/** semua grup dibuka (via localStorage menu) → { judul grup: [href…] } */
const menuLengkap = async () => {
  const judul = await page.evaluate(() => [...document.querySelectorAll("aside button span.flex-1")].map((s) => s.textContent.trim()));
  await page.evaluate((j) => localStorage.setItem("admin-menu-grup", JSON.stringify(j)), judul);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("aside nav li")]
        .filter((li) => li.querySelector(":scope > button span.flex-1"))
        .map((li) => [li.querySelector(":scope > button span.flex-1").textContent.trim(), [...li.querySelectorAll(":scope > ul a")].map((a) => a.getAttribute("href"))]),
    ),
  );
};
// layanan pribadi yang boleh ada di "Layanan saya" (bukan halaman kelola)
const PRIBADI = new Set(["/admin/presensi", "/admin/jadwal-saya", "/admin/tukar-jam", "/admin/kalender", "/admin/kesiswaan/lapor", "/admin/sarpras/kerusakan", "/admin/sarpras/peminjaman", "/admin/perpus", "/admin/perpus/pojok", "/admin/rujukan-bk", "/admin/buku-tamu", "/admin/pengaduan"]);
const BIDANG = ["Pengaduan", "Kesiswaan", "Jadwal", "Kurikulum", "Perpustakaan", "Sarpras", "Humas", "Bimbingan Konseling", "Absensi", "Pengaturan", "Data Induk", "Website", "Mutu", "Alumni"];
const NAMA = { waka_sarpras: "Wakasek Sarpras", waka_kurikulum: "Wakasek Kurikulum", waka_kesiswaan: "Wakasek Kesiswaan", waka_humas: "Wakasek Humas", kepala_sekolah: "Kepala Sekolah", operator: "Operator / TU", bk: "Guru BK", guru: "Guru", piket: "Guru Piket", wali_kelas: "Wali Kelas", pegawai: "Pegawai umum", laboran: "Laboran", pustakawan: "Pustakawan" };
// grup bidang yang BOLEH tampil per peran (selain itu tidak boleh ada); "Layanan saya" & "Akun saya" selalu ada
const ATURAN = {
  waka_sarpras: { grup: ["Sarpras"], buka: ["/admin/sarpras"], tolak: ["/admin/kurikulum", "/admin/kokurikuler", "/admin/bk/laporan", "/admin/survei", "/admin/kontak-media", "/admin/pengguna", "/admin/jadwal", "/admin/kesiswaan", "/admin/perpus/katalog"] },
  waka_kurikulum: { grup: ["Kurikulum", "Jadwal", "Data Induk", "Mutu", "Perpustakaan"], buka: ["/admin/kurikulum", "/admin/jadwal"], tolak: ["/admin/bk/laporan", "/admin/survei", "/admin/pengguna", "/admin/kesiswaan"] },
  waka_kesiswaan: { grup: ["Kesiswaan", "Absensi", "Data Induk", "Pengaduan", "Ekskul & OSIS"], buka: ["/admin/kesiswaan", "/admin/pengaduan"], tolak: ["/admin/kurikulum", "/admin/survei", "/admin/bk", "/admin/pengguna", "/admin/jadwal"] },
  waka_humas: { grup: ["Humas", "Website", "Alumni"], buka: ["/admin/survei", "/admin/kontak-media", "/admin/pengaduan"], tolak: ["/admin/kurikulum", "/admin/bk/laporan", "/admin/pengguna", "/admin/kesiswaan"] },
  kepala_sekolah: { grup: ["Humas", "Kesiswaan", "Absensi", "Kurikulum", "Pengaturan", "Mutu", "Sarpras", "Data Induk", "Website", "Alumni", "Ekskul & OSIS", "Perpustakaan"], buka: ["/admin/survei", "/admin/kontak-media", "/admin/bk/laporan", "/admin/pengaduan", "/admin/log"], tolak: ["/admin/bk", "/admin/pengguna", "/admin/kesiswaan/pengaturan"] },
  operator: { grup: ["Pengaturan", "Data Induk", "Absensi", "Sarpras", "Humas"], buka: ["/admin/pengguna", "/admin/siswa"], tolak: ["/admin/bk/laporan", "/admin/survei", "/admin/jadwal", "/admin/absensi/pengaturan", "/admin/kesiswaan"] },
  bk: { grup: ["Bimbingan Konseling", "Kesiswaan", "Absensi", "Data Induk", "Alumni", "Pengaduan"], buka: ["/admin/bk", "/admin/rujukan-bk", "/admin/pengaduan"], tolak: ["/admin/survei", "/admin/pengguna", "/admin/kemitraan", "/admin/kontak-media"] },
  guru: { grup: [], buka: ["/admin/kurikulum", "/admin/rujukan-bk"], tolak: ["/admin/kontak-media", "/admin/bk/laporan", "/admin/pengguna", "/admin/kesiswaan", "/admin/perpus/katalog"] },
  piket: { grup: ["Absensi", "Jadwal", "Humas"], buka: ["/admin/absensi"], tolak: ["/admin/kesiswaan", "/admin/pengguna", "/admin/perpus/katalog"] },
  wali_kelas: { grup: ["Absensi"], buka: ["/admin/kelas-saya", "/admin/kesiswaan"], tolak: ["/admin/pengguna", "/admin/survei"] },
  pegawai: { grup: [], buka: [], tolak: ["/admin/kurikulum", "/admin/lms", "/admin/supervisi", "/admin/kesiswaan"] },
  laboran: { grup: ["Laboratorium"], buka: ["/admin/sarpras"], tolak: ["/admin/kurikulum", "/admin/kesiswaan"] },
  pustakawan: { grup: ["Perpustakaan"], buka: ["/admin/perpus/katalog"], tolak: ["/admin/kesiswaan", "/admin/kurikulum", "/admin/pengguna"] },
};
for (const [kode, a] of Object.entries(ATURAN)) {
  await mulai(kode);
  await page.goto(BASE + "/admin", { waitUntil: "load" });
  const label = (await page.locator(".pita-pratinjau strong").first().textContent().catch(() => "")) ?? "";
  cek(`${kode}: pita menyebut nama peran spesifik`, label.includes(NAMA[kode] ?? kode), label);
  const menu = await menuLengkap();
  const judul = Object.keys(menu);
  const bidangTampil = judul.filter((j) => BIDANG.includes(j) || j === "Laboratorium");
  const lebih = bidangTampil.filter((j) => !a.grup.includes(j));
  cek(`${kode}: grup bidang hanya ${a.grup.join(", ") || "(tidak ada)"}`, lebih.length === 0 && a.grup.filter((g) => !["Data Induk", "Mutu", "Alumni", "Ekskul & OSIS", "Website", "Perpustakaan", "Humas"].includes(g)).every((g) => judul.includes(g)), { tampil: judul });
  cek(`${kode}: ada "Layanan saya" & "Akun saya"`, judul.includes("Akun saya") && (judul.includes("Layanan saya") || kode === "laboran"), judul);
  const bukanPribadi = (menu["Layanan saya"] ?? []).filter((h) => !PRIBADI.has(h));
  cek(`${kode}: "Layanan saya" hanya layanan pribadi`, bukanPribadi.length === 0, { bukanPribadi, isi: menu["Layanan saya"] });
  if (kode === "bk") {
    cek("bk: tanpa grup Humas; grup Pengaduan hanya daftar pengaduan", !judul.includes("Humas") && JSON.stringify(menu["Pengaduan"]) === JSON.stringify(["/admin/pengaduan"]), menu);
    const semua = Object.values(menu).flat();
    cek("bk: kemitraan, kontak media, survei, website tidak ada di menu", !["/admin/kemitraan", "/admin/kontak-media", "/admin/survei", "/admin/humas", "/admin/berita"].some((h) => semua.includes(h)), semua);
  }
  if (kode === "waka_sarpras") cek("waka_sarpras: tidak ada grup Kesiswaan/Jadwal/Perpustakaan sama sekali", !["Kesiswaan", "Jadwal", "Perpustakaan"].some((g) => judul.includes(g)), judul);
  for (const u of a.buka) cek(`${kode}: ${u} terbuka`, !(await bukaDitolak(page, u)), page.url());
  for (const u of a.tolak) cek(`${kode}: ${u} dibuka langsung → ditolak server`, await bukaDitolak(page, u), page.url());
  if (kode === "kepala_sekolah") {
    await page.goto(BASE + "/admin/survei", { waitUntil: "load" });
    cek("kepala sekolah: Survei tampil tanpa formulir 'Survei baru' (baca saja)", !(await page.textContent("main")).includes("Survei baru"));
    await page.goto(BASE + "/admin/kontak-media", { waitUntil: "load" });
    cek("kepala sekolah: Kontak Media tanpa formulir tambah/arsip", !(await page.textContent("main")).includes("Tambah kontak"));
  }
  if (kode === "operator") {
    await page.goto(BASE + "/admin/pengguna", { waitUntil: "load" });
    const pilihan = await page.locator("input[name=peran]").evaluateAll((xs) => xs.map((x) => x.value));
    cek("operator: formulir akun hanya menawarkan peran dasar", pilihan.length > 0 && pilihan.every((p) => ["guru", "wali_kelas", "piket", "pegawai", "laboran", "siswa", "orang_tua"].includes(p)), pilihan);
  }
  await page.goto(BASE + "/admin", { waitUntil: "load" });
  await page.evaluate(() => localStorage.removeItem("admin-menu-grup"));
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(600);
  await potret(`a3-${kode}`);
}

await mulai("operator");
const jepret = () =>
  psql(`select json_build_object(
    'siswa', (select count(*) from public.siswa), 'pegawai', (select count(*) from public.pegawai),
    'berita', (select count(*) from public.berita), 'pengguna_peran', (select count(*) from public.pengguna_peran),
    'preferensi', (select count(*) from public.preferensi_notifikasi), 'notifikasi_dibaca', (select count(*) from public.notifikasi where dibaca_pada is not null),
    'audit_nonpratinjau', (select count(*) from public.audit_log where tabel <> 'pratinjau' and aksi not in ('LOGIN','LOGOUT','LOGIN_GAGAL')),
    'storage', (select count(*) from storage.objects))::text;`);
const sebelum = jepret();
// a) tombol simpan di UI: form keamanan (ganti sandi) — tetap tampil, kirim → pesan pratinjau, tanpa permintaan ke server
await page.goto(BASE + "/admin/keamanan", { waitUntil: "load" });
const permintaanAksi = [];
page.on("request", (q) => q.headers()["next-action"] && permintaanAksi.push(q.url()));
const form = page.locator("form:has(input[type=password])").first();
cek("tombol simpan tetap tampil saat pratinjau", (await form.locator("button[type=submit]").count()) > 0);
await form.locator("input[type=password]").first().fill("SandiBaru#12345");
await form.locator("button[type=submit]").first().click();
await page.waitForTimeout(700);
cek("klik simpan → pesan pratinjau, tidak ada Server Action terkirim", (await page.textContent(".pesan-pratinjau")) === PESAN && permintaanAksi.length === 0, { pesan: await page.textContent(".pesan-pratinjau"), permintaanAksi });
// b) melewati tampilan: Server Action dikirim langsung (header next-action) di admin & halaman publik
for (const url of ["/admin/siswa", "/admin/berita", "/pengaduan", "/portal-digital"]) {
  const r = await page.request.post(BASE + url, { headers: { "next-action": "0000000000000000000000000000000000000000", "content-type": "text/plain;charset=UTF-8" }, data: "[]", maxRedirects: 0 });
  cek(`Server Action langsung ke ${url} → ditolak server (403 + pesan)`, r.status() === 403 && (await r.text()) === PESAN, r.status());
}
// c) ekspor / unduh data pribadi / unggah / API
for (const url of ["/admin/siswa/ekspor?status=semua", "/admin/pegawai/ekspor", "/admin/sarpras/ekspor", "/berkas/bukti/00000000-0000-0000-0000-000000000001"]) {
  const s = await status(page, url);
  cek(`unduh ${url} → ditolak (403)`, s === 403, s);
}
const unggah = await page.request.post(BASE + "/admin/siswa/impor", { multipart: { berkas: { name: "a.csv", mimeType: "text/csv", buffer: Buffer.from("Nama\nX") } }, maxRedirects: 0 });
cek("unggah (POST multipart) → ditolak (403)", unggah.status() === 403, unggah.status());
const api = await page.request.post(BASE + "/api/notifikasi/kirim", { data: {}, maxRedirects: 0 });
cek("API kirim notifikasi → ditolak (403)", api.status() === 403, api.status());
// d) database: transaksi hanya-baca juga untuk penulisan yang lolos dari server
const sesudah = jepret();
cek("data di database TIDAK berubah selama pratinjau", sebelum === sesudah, { sebelum, sesudah });

// ================= 4. KEDALUWARSA & SELESAI =================
const cookieAsli = (await ctx.cookies()).find((c) => c.name === "sman22_pratinjau");
const uidAdmin = psql("select id from auth.users where email = 'admin@sman22.test';");
await ctx.addCookies([{ name: "sman22_pratinjau", value: tandaCookie({ peran: "guru", uid: uidAdmin, mulai: Date.now() - 31 * 60_000 }), url: BASE }]);
cek("cookie > 30 menit: pratinjau tidak berlaku lagi (hak super admin kembali)", !(await bukaDitolak(page, "/admin/pengguna")), page.url());
await ctx.addCookies([{ ...cookieAsli }]);
await page.goto(BASE + "/admin", { waitUntil: "load" });
await page.click(".pita-pratinjau button[type=submit]");
await page.waitForLoadState("load");
await page.waitForTimeout(600);
const sisa = (await ctx.cookies()).filter((c) => c.name.startsWith("sman22_pratinjau"));
cek("Keluar dari pratinjau → cookie dihapus, kembali ke pemilih", sisa.length === 0 && new URL(page.url()).pathname === "/lihat-sebagai", { url: page.url(), sisa: sisa.map((c) => c.name) });
cek("setelah selesai: hak super admin kembali", !(await bukaDitolak(page, "/admin/pengguna")), page.url());
const log = psql("select aksi || ':' || record_id from public.audit_log where tabel = 'pratinjau' and waktu > now() - interval '15 minutes' order by id;").split("\n");
cek(`catatan audit mulai/selesai tercatat (${log.length} baris)`, log.some((l) => l.startsWith("PRATINJAU_MULAI:siswa")) && log.some((l) => l.startsWith("PRATINJAU_SELESAI:operator")), log.slice(-4));
await page.goto(BASE + "/admin/keamanan", { waitUntil: "load" });
cek("halaman Keamanan menampilkan riwayat Lihat sebagai", (await page.locator("[data-riwayat-pratinjau] li").count()) > 0);
await page.screenshot({ path: path.join(keluar, "keamanan-riwayat-1440.png"), fullPage: true });

// logout saat pratinjau: mengakhiri pratinjau + keluar
await mulai("guru");
await page.goto(BASE + "/admin", { waitUntil: "load" });
await page.locator("details.group\\/akun summary").first().click().catch(() => {});
await page.locator("form[data-keluar-akun] button[type=submit]").first().click({ force: true });
await page.waitForURL((u) => u.pathname.startsWith("/portal-digital/masuk"), { timeout: 15000 }).catch(() => {});
const sisa2 = (await ctx.cookies()).filter((c) => c.name.startsWith("sman22_pratinjau") || c.name.includes("auth-token"));
cek("Keluar akun saat pratinjau → pratinjau berakhir & sesi keluar", new URL(page.url()).pathname.startsWith("/portal-digital/masuk") && sisa2.length === 0, { url: page.url(), sisa: sisa2.map((c) => c.name) });
const akhir = psql("select aksi || ':' || coalesce(data_baru->>'alasan','') from public.audit_log where tabel = 'pratinjau' order by id desc limit 1;");
cek("catatan selesai karena keluar akun", akhir === "PRATINJAU_SELESAI:keluar akun", akhir);

await ctx.close();
await browser.close();
console.log(`server lokal terputus & disambung ulang: ${putus}x`);
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
