// Uji alur Portal Digital 22 (Chrome headless ↔ dev server ↔ Supabase LOKAL). Lihat README.md.
// Pakai: node uji-portal.mjs <chrome.exe> <folder-keluar> <base-url> <akun-uji.json>
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [chrome, keluar, BASE, berkasAkun] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
fs.mkdirSync(keluar, { recursive: true });
const port = 9340;
const proses = spawn(chrome, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${path.join(keluar, "_profil-portal")}`, "about:blank"], { stdio: "ignore" });
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await tidur(200);
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page")?.webSocketDebuggerUrl;
  } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const tunggu = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && tunggu.has(m.id)) {
    tunggu.get(m.id)(m);
    tunggu.delete(m.id);
  }
});
const kirim = (method, params = {}) => new Promise((r) => { const i = ++id; tunggu.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await kirim("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await kirim("Page.enable");
await kirim("Network.enable");
await kirim("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
const url = () => js("location.pathname + location.search");
const buka = async (u, t = 1500) => {
  await kirim("Page.navigate", { url: BASE + u });
  await tidur(t);
  await js(`(async()=>{for(let i=0;i<50&&document.readyState!=="complete";i++) await new Promise(r=>setTimeout(r,200));return 1})()`);
};
const sampai = async (cek, ms = 15000) => {
  const akhir = Date.now() + ms;
  while (Date.now() < akhir) {
    if (await js(cek).catch(() => false)) return true;
    await tidur(250);
  }
  return false;
};
const klik = async (sel) => {
  const r = await js(`(()=>{const e=${sel}; if(!e) return null; e.scrollIntoView({block:"center",behavior:"instant"}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  if (!r) throw new Error("tidak ditemukan: " + sel);
  for (const type of ["mousePressed", "mouseReleased"]) await kirim("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
};
const ketik = async (sel, t) => {
  await js(`(()=>{const e=${sel}; e.focus(); e.value=""; return 1})()`);
  await kirim("Input.insertText", { text: t });
};
const keluarAkun = async () => {
  await kirim("Network.clearBrowserCookies");
  await buka("/portal-digital", 400);
};
// isi formulir masuk yang SEDANG terbuka (tujuan kembali dibawa formulir)
const isiMasuk = async (akun) => {
  await ketik(`document.querySelector('input[name=email]')`, `${akun}@sman22.test`);
  await ketik(`document.querySelector('input[name=password]')`, AKUN[akun]);
  await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Masuk")`);
  await sampai(`!location.pathname.startsWith("/portal-digital/masuk")`, 20000);
  await tidur(1500);
};
const hasil = {};
const cek = (n, l, d) => {
  hasil[n] = { lulus: !!l, d };
  console.log((l ? "LULUS " : "GAGAL ") + n + (l ? "" : " :: " + JSON.stringify(d)));
};

// 1. pengunjung
await keluarAkun();
const anon = await js(`({kartu:[...document.querySelectorAll(".pd-peran h3, .pd-daftar strong")].map(h=>h.childNodes[0].textContent.trim()), sistem:document.body.innerText.includes("Administrasi Sistem"), surel:/@sman22\\.test|"user_?[iI]d"|"izin":\\[|"peran":\\[/.test(document.documentElement.outerHTML)})`);
cek("pengunjung: 13 kartu bidang terlihat, administrasi sistem tersembunyi, tanpa data pribadi di payload", anon.kartu.length === 13 && !anon.sistem && !anon.surel, anon);
await klik(`[...document.querySelectorAll(".pd-peran a, .pd-daftar a")].find(a=>a.textContent.includes("Kurikulum"))`);
await sampai(`location.pathname==="/portal-digital/masuk/gtk"`);
const u1 = await url();
cek("kartu Kurikulum (belum masuk) → halaman masuk Guru & Tendik dengan tujuan kembali", u1.startsWith("/portal-digital/masuk/gtk") && u1.includes("lanjut=%2Fportal-digital%2Fbuka%2Fkurikulum"), u1);

// 2. humas memilih Kurikulum → kembali ke pintu → ditolak dengan penjelasan
await isiMasuk("humas");
const tolak = await js(`({u:location.pathname, judul:document.querySelector("h1")?.textContent, alasan:document.body.innerText.includes("tidak menambah hak akses")})`);
cek("setelah masuk kembali ke pintu; humas tanpa penugasan Kurikulum mendapat penjelasan, bukan akses", tolak.u === "/portal-digital/buka/kurikulum" && /Belum ada akses/.test(tolak.judul) && tolak.alasan, tolak);
// Struktur Kurikulum memang bisa dibaca semua staf; halaman yang butuh izin kelola diuji lewat URL langsung
for (const u of ["/admin/pengguna", "/admin/jadwal/tukar", "/admin/tahun-ajaran"]) {
  await buka(u);
  cek(`humas: URL langsung ${u} ditolak server`, (await url()).includes("tanpa-akses"), await url());
}
await buka("/portal-digital/buka/humas");
await sampai(`location.pathname.startsWith("/admin/humas")`);
cek("humas memilih Humas → ruang kerja Humas", (await url()).startsWith("/admin/humas"), await url());
const aksen = await js(`({bidang:document.querySelector(".ruang-bidang")?.dataset.bidang, pita:document.body.innerText.includes("Ruang kerja · Humas")})`);
cek("aksen bidang di ruang kerja (warna Humas + pita nama), tanpa mengubah hak", aksen.bidang === "humas" && aksen.pita, aksen);
await buka("/portal-digital");
const status = await js(`({akun:document.querySelector(".pd-akun")?.innerText, milik:[...document.querySelectorAll(".pd-peran a, .pd-daftar a")].filter(a=>a.querySelector(".pd-status")).map(a=>a.querySelector("h3, strong").childNodes[0].textContent.trim())})`);
cek("portal menampilkan status akun & menandai bidang yang menjadi akses pengguna", /Masuk sebagai/.test(status.akun ?? "") && status.milik.includes("Humas") && !status.milik.includes("Kurikulum"), status);
await kirim("Page.captureScreenshot", { format: "jpeg", quality: 78 }).then((g) => fs.writeFileSync(path.join(keluar, "portal-masuk-humas.jpg"), Buffer.from(g.result.data, "base64")));

// 3. pustakawan: satu penugasan → langsung; kartu E-Library publik; Pojok Guru
await keluarAkun();
await buka("/portal-digital/buka/guru");
await isiMasuk("pustakawan");
// /portal-digital/buka/guru memutuskan di server lalu mengalihkan — tunggu sampai pengalihan selesai
await sampai(`!location.pathname.startsWith("/portal-digital/buka")`, 15000).catch(() => {});
cek("pustakawan memilih Pojok Guru → dasbor staf (/admin)", (await url()).startsWith("/admin") && !(await url()).includes("login"), await url());
await buka("/portal-digital/buka/elibrary");
cek("kartu E-Library → katalog publik", (await url()) === "/perpustakaan", await url());

// 4. tujuan kembali berbahaya diabaikan
await keluarAkun();
await buka("/portal-digital/masuk/gtk?lanjut=https%3A%2F%2Fevil.test%2F");
cek("formulir tidak membawa tujuan eksternal", (await js(`!document.querySelector('input[name=lanjut]')`)) === true);
await isiMasuk("guru");
cek("setelah masuk tidak dialihkan ke situs luar", (await js("location.host")) === new URL(BASE).host, await js("location.href"));

// 5. siswa memilih kartu staf tanpa akun siswa: tidak ada akses (tidak ada akun siswa uji → cukup cek guru memilih Manajemen)
await buka("/portal-digital/buka/manajemen");
cek("guru memilih Manajemen → penjelasan akses", /Belum ada akses/.test((await js(`document.querySelector("h1")?.textContent`)) ?? ""));

fs.writeFileSync(path.join(keluar, "hasil-portal.json"), JSON.stringify(hasil, null, 1));
const gagal = Object.values(hasil).filter((v) => !v.lulus).length;
console.log(`\n${Object.keys(hasil).length - gagal} lulus, ${gagal} gagal`);
ws.close();
proses.kill();
