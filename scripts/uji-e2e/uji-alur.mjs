// Uji alur nyata (Chrome headless + CDP) terhadap server dev yang tersambung ke Supabase LOKAL terisolasi.
// Pakai: node uji-alur.mjs <chrome.exe> <folder-keluar> <base-url> <akun-uji.json>
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [chrome, keluar, BASE, berkasAkun] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
fs.mkdirSync(keluar, { recursive: true });
const port = 9336;
const proses = spawn(chrome, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${path.join(keluar, "_profil-alur")}`, "about:blank"], { stdio: "ignore" });
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
const kirim = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    tunggu.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const js = async (e) => {
  const r = await kirim("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(e.slice(0, 80) + " :: " + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
};
await kirim("Page.enable");
await kirim("Runtime.enable");
await kirim("Network.enable");
await kirim("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
// catat lambaian pemandu sejak dokumen dibuat (animasi hanya ±1,6 detik)
await kirim("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__lambai=0;new MutationObserver(()=>{if(document.querySelector(".pemandu-tombol.melambai"))window.__lambai++}).observe(document,{subtree:true,attributes:true,attributeFilter:["class"],childList:true})`,
});

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
const klik = async (selektor) => {
  const r = await js(`(()=>{const e=${selektor}; if(!e) return null; e.scrollIntoView({block:"center",behavior:"instant"}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  if (!r) throw new Error("tidak ditemukan: " + selektor);
  for (const type of ["mousePressed", "mouseReleased"]) await kirim("Input.dispatchMouseEvent", { type, x: r.x, y: r.y, button: "left", clickCount: 1 });
};
const ketik = async (selektor, teks) => {
  await js(`(()=>{const e=${selektor}; e.focus(); e.value=""; return 1})()`);
  await kirim("Input.insertText", { text: teks });
};
const tombolTeks = (t) => `[...document.querySelectorAll("button,a")].find(e=>e.textContent.trim().startsWith(${JSON.stringify(t)}))`;
const kunci = async (key, code, vk, text) => {
  await kirim("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text });
  await kirim("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
};
const foto = async (nama, w, h) => {
  if (w) await kirim("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  const g = await kirim("Page.captureScreenshot", { format: "jpeg", quality: 76 });
  fs.writeFileSync(path.join(keluar, nama), Buffer.from(g.result.data, "base64"));
};
const keluarAkun = async () => {
  await kirim("Network.clearBrowserCookies");
  await buka("/", 600);
  await js("try{sessionStorage.clear();localStorage.clear()}catch{};1");
};
const masuk = async (akun, sebagai = "staf") => {
  await keluarAkun();
  await buka(`/admin/login?sebagai=${sebagai}`);
  await ketik(`document.querySelector('input[name=email]')`, `${akun}@sman22.test`);
  await ketik(`document.querySelector('input[name=password]')`, AKUN[akun]);
  await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Masuk")`);
  await sampai(`!location.pathname.startsWith("/admin/login")`, 20000);
  await tidur(1500);
};
// TOTP (RFC 6238) dari kunci base32 — sama seperti aplikasi autentikator
const totp = (rahasia, geser = 0) => {
  const abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bit = "";
  for (const c of rahasia.replace(/[\s=]/g, "").toUpperCase()) bit += abjad.indexOf(c).toString(2).padStart(5, "0");
  const kunciB = Buffer.from(bit.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const langkah = Buffer.alloc(8);
  langkah.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + geser));
  const h = createHmac("sha1", kunciB).update(langkah).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, "0");
};

const hasil = {};
const cek = (nama, lulus, detail) => {
  hasil[nama] = { lulus: Boolean(lulus), ...(detail !== undefined ? { detail } : {}) };
  console.log((lulus ? "LULUS " : "GAGAL ") + nama + (lulus ? "" : " :: " + JSON.stringify(detail)));
};

// ===== 1. RUANG KERJA =====
await masuk("pustakawan");
cek("satu penugasan (pustakawan) → langsung ke ruang kerja Perpustakaan", (await url()).startsWith("/admin/perpus"), await url());
cek("pustakawan: tidak ada pemilih ruang kerja (cukup tautan)", (await js(`!document.querySelector("#ruang-kerja-sisi") && document.body.innerText.includes("Ruang kerja:")`)) === true);
await buka("/admin/tampilan");
cek("pustakawan: URL Tema & Tampilan langsung ditolak", (await url()).includes("pesan=tanpa-akses"), await url());

await masuk("guru");
cek("guru tanpa penugasan → Ringkasan, bukan admin", (await url()) === "/admin" && !(await js(`!!document.querySelector("#ruang-kerja-sisi")`)), await url());
for (const u of ["/admin/tampilan", "/pratinjau/tampilan", "/admin/pengguna", "/admin/berita"]) {
  await buka(u);
  cek(`guru: akses langsung ${u} ditolak`, (await url()).includes("tanpa-akses"), await url());
}

await masuk("humas");
cek("beberapa penugasan (humas) → Ringkasan + pemilih", (await url()) === "/admin" && (await js(`[...document.querySelectorAll("#ruang-kerja-sisi option")].map(o=>o.textContent)`)).join("|") === "Ringkasan (semua tugas)|Humas|Website", await js(`[...document.querySelectorAll("#ruang-kerja-sisi option")].map(o=>o.textContent)`));
await js(`(()=>{const s=document.querySelector("#ruang-kerja-sisi"); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set; set.call(s,"website"); s.dispatchEvent(new Event("change",{bubbles:true})); return 1})()`);
await sampai(`location.pathname==="/admin/berita"`);
cek("pemilih ruang kerja: pindah ke Website tanpa menambah izin", (await url()) === "/admin/berita" && (await js(`document.querySelector("#ruang-kerja-sisi").value`)) === "website", await url());
await buka("/admin/pengguna");
cek("humas: setelah pindah ruang kerja tetap tidak bisa membuka Pengguna & Peran", (await url()).includes("tanpa-akses"), await url());

// ===== 2. EDITOR TAMPILAN: draf → pratinjau → terapkan → pulihkan =====
// Tema lama diarsipkan (hanya "Langit cerah"); alur diuji lewat tingkat gerak (data-gerak) + susunan widget.
await buka("/admin/tampilan", 2500);
await foto("20-admin-tema.jpg");
const temaAwal = await (async () => {
  await buka("/", 1500);
  return js(`document.querySelector(".situs-publik").dataset.gerak`);
})();
await buka("/admin/tampilan", 2500);
await klik(`[...document.querySelectorAll("#panel-tema label")].find(l=>l.textContent.includes("Dinamis"))`);
await tidur(300);
await klik(`document.querySelector("#tab-susunan")`);
await tidur(300);
// pembuka: tata "penuh"
await klik(`[...document.querySelectorAll("button[aria-controls='atur-hero']")][0]`);
await js(`(()=>{const s=document.querySelector("#hero-tata"); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set; set.call(s,"penuh"); s.dispatchEvent(new Event("change",{bubbles:true})); return 1})()`);
// lepas widget berita (data sumber harus tetap ada)
await klik(`document.querySelector("button[aria-label^='Lepas Berita']")`);
// pindahkan kontak naik satu langkah dengan tombol keyboard
await js(`document.querySelector("button[aria-label='Naikkan Kontak & lokasi']").focus()`);
await kunci("Enter", "Enter", 13, "\r");
await tidur(200);
const susunanEditor = await js(`[...document.querySelectorAll("#panel-susunan > ol > li")].map(l=>l.querySelector("span.block.font-semibold").textContent.replace(/^\\d+\\. /,""))`);
await foto("21-admin-susunan.jpg");
await klik(tombolTeks("Simpan draf"));
await sampai(`document.body.innerText.includes("Draf tersimpan")`);
await buka("/", 1500);
cek("draf tersimpan TIDAK mengubah situs publik", (await js(`document.querySelector(".situs-publik").dataset.gerak`)) === temaAwal && (await js(`!!document.querySelector("[data-widget*='berita']")`)), { temaAwal });
await buka("/pratinjau/tampilan", 2500);
const pra = await js(`({tema:document.querySelector(".situs-publik").dataset.gerak, penuh:!!document.querySelector("[data-hero-langit]"), berita:!!document.querySelector("[data-widget*='berita']"), pita:document.body.innerText.includes("Pratinjau draf")})`);
cek("pratinjau (pengelola) menampilkan draf: gerak Dinamis, hero langit (tata lama → fallback), berita dilepas", pra.tema === "dinamis" && pra.penuh && !pra.berita && pra.pita, pra);
await foto("22-pratinjau-draf-desktop.jpg");
await buka("/admin/tampilan", 2500);
await ketik(`document.querySelector("input[placeholder^='contoh: ganti']")`, "Uji terapkan gerak Dinamis");
await klik(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Terapkan")`);
await sampai(`document.body.innerText.includes("Tampilan diterapkan")`, 20000);
await tidur(2500);
await buka("/", 2500);
const pub = await js(`({tema:document.querySelector(".situs-publik").dataset.gerak, penuh:!!document.querySelector("[data-hero-langit]"), berita:!!document.querySelector("[data-widget*='berita']"), urutan:[...document.querySelectorAll("[data-widget]")].map(s=>s.dataset.widget)})`);
cek("setelah Terapkan: publik memakai konfigurasi baru", pub.tema === "dinamis" && pub.penuh && !pub.berita, { pub, susunanEditor });
await buka("/berita", 1500);
cek("melepas widget Berita tidak menghapus data berita", (await js(`document.body.innerText.includes("Pekan literasi sekolah")`)) === true);
await buka("/admin/tampilan", 2500);
await klik(`document.querySelector("#tab-riwayat")`);
const jmlRiwayat = await js(`document.querySelectorAll("#panel-riwayat li").length`);
cek("riwayat mencatat versi terbit", jmlRiwayat >= 1, jmlRiwayat);

// kembalikan ke gerak Minimal lewat draf + terapkan, lalu pulihkan versi Dinamis dari riwayat
await klik(`document.querySelector("#tab-tema")`);
await klik(`[...document.querySelectorAll("#panel-tema label")].find(l=>l.textContent.includes("Minimal"))`);
await tidur(300);
await klik(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Terapkan")`);
await sampai(`document.body.innerText.includes("Tampilan diterapkan")`, 20000);
await tidur(2500);
await buka("/", 2000);
const setelahAkademik = await js(`document.querySelector(".situs-publik").dataset.gerak`);
await buka("/admin/tampilan", 2500);
await klik(`document.querySelector("#tab-riwayat")`);
await klik(`[...document.querySelectorAll("#panel-riwayat li")][1].querySelector("button")`);
await sampai(`document.body.innerText.includes("dipulihkan ke draf")`, 15000);
await tidur(2500);
await buka("/pratinjau/tampilan", 2500);
const pulih = await js(`document.querySelector(".situs-publik").dataset.gerak`);
await buka("/", 1500);
cek("pulihkan versi lama → masuk draf (pratinjau Dinamis), publik tetap Minimal sampai diterapkan", setelahAkademik === "minimal" && pulih === "dinamis" && (await js(`document.querySelector(".situs-publik").dataset.gerak`)) === "minimal", { setelahAkademik, pulih });
// terapkan versi Dinamis yang dipulihkan untuk pemeriksaan visual & popup berikutnya
await buka("/admin/tampilan", 2500);
await klik(`[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Terapkan")`);
await sampai(`document.body.innerText.includes("Tampilan diterapkan")`, 20000);
await tidur(2500);

// ===== 3. POPUP PRIORITAS & PANEL RUTIN (pengunjung) =====
await keluarAkun();
await buka("/", 600);
const sebelum = await js(`document.querySelector("dialog.dialog-prioritas")?.open ?? null`);
await sampai(`document.querySelector("dialog.dialog-prioritas")?.open`, 6000);
const modal = await js(`(()=>{const d=document.querySelector("dialog.dialog-prioritas"); const img=d.querySelector(".poster-prioritas img"); return {buka:d.open, modal:d.matches(":modal"), fokusDalam:d.contains(document.activeElement), kunci:document.documentElement.classList.contains("kunci-gulir"), alt:img?.getAttribute("alt"), fit:img&&getComputedStyle(img).objectFit, tautan:d.querySelector(".dialog-info-kaki a")?.getAttribute("href"), judul:d.querySelector("#prioritas-judul").textContent}})()`);
cek("modal prioritas: muncul setelah pembuka terlihat, modal, fokus di dalam, scroll terkunci, poster utuh beralt, tautan berfungsi", sebelum === false && modal.buka && modal.modal && modal.fokusDalam && modal.kunci && modal.fit === "contain" && modal.alt?.length > 5 && modal.tautan === "/spmb", { sebelum, modal });
await foto("23-modal-prioritas-desktop.jpg");
await kunci("Escape", "Escape", 27);
await tidur(500);
const tutup = await js(`({buka:document.querySelector("dialog.dialog-prioritas").open, kunci:document.documentElement.classList.contains("kunci-gulir"), fokus:document.activeElement?.id || document.activeElement?.tagName})`);
cek("Escape menutup modal, scroll dibuka, fokus ke konten utama", !tutup.buka && !tutup.kunci && tutup.fokus === "konten", tutup);
await js(`window.scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*0.4,behavior:"instant"})`);
await tidur(1200);
const rutin = await js(`({panel:!!document.querySelector(".info-panel,.info-teaser"), tombol:!!document.querySelector(".info-tombol"), modal:document.querySelector("dialog.dialog-prioritas").open})`);
// desain "Langit cerah": hanya SATU tombol mengambang (pemandu) — panel rutin & tombol "Informasi" dimatikan;
// pengumuman tersedia lewat menu Kabar & Agenda.
cek("setelah modal prioritas: panel rutin TIDAK otomatis & tanpa tombol Informasi mengambang", !rutin.panel && !rutin.tombol && !rutin.modal, rutin);
await buka("/", 2500);
cek("muat ulang di sesi yang sama: modal prioritas tidak muncul lagi", (await js(`document.querySelector("dialog.dialog-prioritas")?.open`)) === false);
const mengambang = await js(`[...document.querySelectorAll("body *")].filter(e=>{const s=getComputedStyle(e); return s.position==="fixed" && (e.matches("button,a") || e.querySelector("button,a")) && e.getBoundingClientRect().height>0 && !e.closest("header,dialog")}).map(e=>e.className.toString().slice(0,30))`);
cek("maksimal satu tombol mengambang di beranda", mengambang.length <= 1, mengambang);

// ===== 4. PEMANDU =====
await keluarAkun();
await kirim("Network.clearBrowserCookies");
// sesi baru tanpa prioritas: tandai prioritas sudah tampil agar lambaian boleh berjalan
await buka("/", 300);
await js(`sessionStorage.setItem("sman22:overlay:prioritas","1");1`);
await buka("/", 600);
const lambai = await sampai(`window.__lambai > 0`, 6000);
const diam = await sampai(`!document.querySelector(".pemandu-tombol.melambai")`, 4000);
cek("pemandu melambai sekali lalu diam (tanpa teks otomatis)", lambai && diam && !(await js(`!!document.querySelector(".pemandu-panel")`)));
await js(`document.querySelector(".pemandu-tombol").focus()`);
await kunci("Enter", "Enter", 13, "\r");
await tidur(300);
await klik(tombolTeks("Calon murid"));
await tidur(200);
const pilihan = await js(`[...document.querySelectorAll(".pemandu-panel a")].map(a=>a.getAttribute("href"))`);
await foto("25-pemandu-desktop.jpg");
await kunci("Escape", "Escape", 27);
await tidur(200);
cek("pemandu: dibuka dengan keyboard, rute nyata, Esc menutup & fokus kembali", pilihan.includes("/spmb") && (await js(`!document.querySelector(".pemandu-panel") && document.activeElement?.classList.contains("pemandu-tombol")`)), pilihan);
for (const h of pilihan) {
  const r = await fetch(BASE + h, { redirect: "manual" });
  if (r.status >= 400) cek(`rute pemandu ${h} tersedia`, false, r.status);
}

// ===== 5. MFA (super admin wajib MFA) =====
await masuk("admin");
cek("super admin wajib MFA → diarahkan ke verifikasi dua langkah", (await url()).startsWith("/admin/mfa"), await url());
await foto("26-mfa-pasang.jpg");
await klik(tombolTeks("Mulai pasang"));
await sampai(`[...document.querySelectorAll("button")].some(b=>b.textContent.includes("Tidak bisa memindai"))`, 15000);
await klik(tombolTeks("Tidak bisa memindai"));
const rahasia = await js(`document.querySelector("p.font-mono")?.textContent?.trim()`);
const input = `document.querySelector("input[autocomplete='one-time-code']")`;
const attr = await js(`(()=>{const i=${input}; return {inputmode:i.inputMode, ac:i.autocomplete, pola:i.pattern, ph:i.placeholder}})()`);
cek("input kode MFA: numerik, one-time-code, tanpa placeholder", attr.inputmode === "numeric" && attr.ac === "one-time-code" && !attr.ph, attr);
await ketik(input, "000000");
await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Aktifkan")`);
await sampai(`!!document.querySelector("[role=alert]")`, 10000);
const salah = await js(`document.querySelector("[role=alert]")?.textContent`);
cek("kode salah ditolak dengan pesan jelas", Boolean(salah), salah);
// tempel kode dengan spasi (paste) → hanya angka yang tersimpan, nol di depan dipertahankan
const kode = totp(rahasia);
await js(`(()=>{const i=${input}; i.focus(); const dt=new DataTransfer(); dt.setData("text","${kode.slice(0, 3)} ${kode.slice(3)}"); i.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true})); return 1})()`);
await tidur(200);
const nilaiTempel = await js(`${input}.value`);
cek("tempel kode berspasi → 6 angka utuh", nilaiTempel === kode, { nilaiTempel, panjang: kode.length });
await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Aktifkan")`);
await sampai(`location.pathname === "/admin"`, 20000);
cek("kode TOTP benar → masuk; pimpinan mulai di Ringkasan", (await url()) === "/admin", await url());

fs.writeFileSync(path.join(keluar, "hasil-alur.json"), JSON.stringify(hasil, null, 1));
const gagal = Object.entries(hasil).filter(([, v]) => !v.lulus).length;
console.log(`\n${Object.keys(hasil).length - gagal} lulus, ${gagal} gagal`);
ws.close();
proses.kill();
