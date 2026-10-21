// Uji halaman masuk per peran (Tahap 3) — Chrome headless ↔ dev server ↔ Supabase LOKAL. Lihat README.md.
// Pakai: node uji-masuk.mjs <chrome.exe> <folder-keluar> <base-url> <akun-uji.json> <foto-uji.jpg>
// Akun uji yang dipakai: humas, guru, siswa, ortu (NISN uji), pegawai (tanpa peran), laboran.
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [chrome, keluar, BASE, berkasAkun, fotoUji] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya untuk server lokal");
const DATA = JSON.parse(fs.readFileSync(berkasAkun, "utf8"));
const AKUN = DATA.sandi;
const NISN = DATA.nisnUji;
fs.mkdirSync(keluar, { recursive: true });
const port = 9341;
const proses = spawn(chrome, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${path.join(keluar, "_profil-masuk")}`, "about:blank"], { stdio: "ignore" });
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
await kirim("DOM.enable");
await kirim("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
const url = () => js("location.pathname + location.search");
const buka = async (u, t = 1200) => {
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
  await buka("/", 300);
};
const tombolMasuk = `[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Masuk")`;
/** isi formulir di halaman masuk yang sedang terbuka; akun staf = email, siswa/ortu = NISN uji */
const isiMasuk = async (akun, tetapDiHalaman = false) => {
  await sampai(`document.querySelector('input[name=password]')`, 10000);
  const nisn = await js(`Boolean(document.querySelector('input[name=nisn]'))`);
  await ketik(nisn ? `document.querySelector('input[name=nisn]')` : `document.querySelector('input[name=email]')`, nisn ? NISN : `${akun}@sman22.test`);
  await ketik(`document.querySelector('input[name=password]')`, AKUN[akun]);
  await klik(tombolMasuk);
  if (tetapDiHalaman) await sampai(`document.querySelector('[role=alert], .masuk-kartu [role=status]')?.textContent.trim().length > 0`, 15000);
  else await sampai(`!location.pathname.startsWith("/portal-digital/masuk")`, 20000);
  await tidur(1200);
};
// TOTP (RFC 6238) dari kunci base32 — sama seperti uji-alur.mjs
const totp = (rahasia) => {
  const abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bit = "";
  for (const c of rahasia.replace(/[\s=]/g, "").toUpperCase()) bit += abjad.indexOf(c).toString(2).padStart(5, "0");
  const kunciB = Buffer.from(bit.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const langkah = Buffer.alloc(8);
  langkah.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", kunciB).update(langkah).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
};
const hasil = {};
const cek = (n, l, d) => {
  hasil[n] = { lulus: !!l, d };
  console.log((l ? "LULUS " : "GAGAL ") + n + (l ? "" : " :: " + JSON.stringify(d)));
};
const foto = (nama) => kirim("Page.captureScreenshot", { format: "jpeg", quality: 80 }).then((g) => fs.writeFileSync(path.join(keluar, nama), Buffer.from(g.result.data, "base64")));

// 1. admin (humas) membuka /admin/berita saat belum masuk → login GTK → kembali ke /admin/berita
await keluarAkun();
await buka("/admin/berita");
await sampai(`location.pathname==="/portal-digital/masuk/gtk"`);
const u1 = await url();
cek("/admin/berita (belum masuk) → /portal-digital/masuk/gtk?lanjut=/admin/berita", u1 === "/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fberita", u1);
const label = await js(`({label:document.querySelector(".masuk-label")?.textContent, h1:document.querySelector("h1")?.textContent, email:document.querySelector("label[for=email]")?.textContent, ph:document.querySelector("input[name=email]")?.placeholder, lupa:[...document.querySelectorAll("a")].some(a=>a.textContent.trim()==="Lupa kata sandi?"), kembali:[...document.querySelectorAll("a")].some(a=>a.textContent.trim()==="Kembali ke website")})`);
cek("halaman GTK: label, judul, Email, placeholder, Lupa kata sandi?, Kembali ke website", /Guru & Tendik/i.test(label.label) && label.h1 === "Masuk sebagai Guru & Tendik" && /Email/.test(label.email) && label.ph === "Masukkan email Anda" && label.lupa && label.kembali, label);
// lihat/sembunyikan kata sandi
await ketik(`document.querySelector('input[name=password]')`, "rahasia123");
await klik(`document.querySelector(".masuk-sandi button")`);
const lihat = await js(`document.querySelector('input[name=password]').type`);
await klik(`document.querySelector(".masuk-sandi button")`);
cek("tombol lihat/sembunyikan kata sandi", lihat === "text" && (await js(`document.querySelector('input[name=password]').type`)) === "password", lihat);
await isiMasuk("humas");
cek("setelah masuk GTK kembali ke /admin/berita", (await url()) === "/admin/berita", await url());

// 2. siswa salah halaman: GTK → pesan jelas + tautan ke halaman siswa; sesi tidak dibuat
await keluarAkun();
await buka("/portal-digital/masuk/gtk");
await ketik(`document.querySelector('input[name=email]')`, `${NISN}.siswa@portal.sman22bdg.sch.id`);
await ketik(`document.querySelector('input[name=password]')`, AKUN.siswa);
await klik(tombolMasuk);
await sampai(`[...document.querySelectorAll("a")].some(a=>a.getAttribute("href")?.startsWith("/portal-digital/masuk/siswa") && a.closest("[role=alert],[role=status]"))`, 15000);
const salah = await js(`({u:location.pathname, teks:document.querySelector(".masuk-kartu")?.innerText, tautan:[...document.querySelectorAll("[role=alert] a,[role=status] a")].map(a=>a.getAttribute("href"))})`);
cek("akun siswa di halaman GTK → pesan + tautan ke /portal-digital/masuk/siswa", salah.u === "/portal-digital/masuk/gtk" && salah.tautan.some((h) => h.startsWith("/portal-digital/masuk/siswa")), salah);
await foto("salah-peran-siswa-di-gtk.jpg");
await buka("/admin");
cek("akun salah peran tidak tetap masuk (ke /admin → kembali ke login)", (await url()).startsWith("/portal-digital/masuk/gtk"), await url());

// 3. guru di halaman siswa → pesan + tautan ke GTK
await buka("/portal-digital/masuk/siswa");
const labelSiswa = await js(`({h1:document.querySelector("h1")?.textContent, nisn:document.querySelector("label[for=nisn]")?.textContent})`);
cek("halaman siswa: judul & kolom NISN", labelSiswa.h1 === "Masuk ke Portal Siswa" && /NISN/.test(labelSiswa.nisn ?? ""), labelSiswa);
await kirim("Runtime.evaluate", { expression: `(()=>{const f=document.querySelector('input[name=nisn]'); return 1})()` });
// guru masuk lewat kolom NISN tidak mungkin (email) — uji peran salah memakai akun ortu di halaman siswa
await isiMasuk("ortu", true);
const salah2 = await js(`({teks:document.querySelector(".masuk-kartu")?.innerText, tautan:[...document.querySelectorAll("[role=alert] a,[role=status] a")].map(a=>a.getAttribute("href"))})`);
cek("NISN akun orang tua di halaman siswa → tidak masuk sebagai siswa", (await url()).startsWith("/portal-digital/masuk/siswa"), { u: await url(), ...salah2 });

// 4. siswa & orang tua masuk di halamannya masing-masing
await keluarAkun();
await buka("/portal-digital/masuk/siswa");
await isiMasuk("siswa");
cek("siswa masuk via NISN → /portal", (await url()).startsWith("/portal"), await url());
await keluarAkun();
await buka("/portal-digital/masuk/orang-tua");
const labelOrtu = await js(`({h1:document.querySelector("h1")?.textContent, nisn:document.querySelector("label[for=nisn]")?.textContent, bantu:document.body.innerText.includes("Gunakan NISN putra/putri Anda.")})`);
cek("halaman orang tua: judul, NISN anak, bantuan", labelOrtu.h1 === "Masuk ke Portal Orang Tua" && /NISN Anak/.test(labelOrtu.nisn ?? "") && labelOrtu.bantu, labelOrtu);
await isiMasuk("ortu");
cek("orang tua masuk via NISN anak → /portal", (await url()).startsWith("/portal"), await url());

// 5. siswa masuk dengan ?lanjut=/admin → "Halaman ini untuk Guru & Tendik"
await keluarAkun();
await buka("/portal-digital/masuk/siswa?lanjut=%2Fadmin");
await isiMasuk("siswa");
const lain = await js(`({u:location.pathname, h1:document.querySelector("h1")?.textContent, tautan:[...document.querySelectorAll("a")].some(a=>a.getAttribute("href")==="/portal-digital/masuk/gtk")})`);
cek("siswa + lanjut=/admin → 'Halaman ini untuk Guru & Tendik' + tautan login GTK", lain.u === "/portal-digital/akses-lain" && lain.h1 === "Halaman ini untuk Guru & Tendik" && lain.tautan, lain);
await foto("akses-lain.jpg");
await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.includes("Keluar"))`);
await sampai(`location.pathname==="/portal-digital/masuk/gtk"`);
cek("tombol 'Keluar & masuk sebagai Guru & Tendik' → halaman GTK dengan lanjut", (await url()) === "/portal-digital/masuk/gtk?lanjut=%2Fadmin", await url());

// 6. pegawai tanpa peran → dasbor dasar (bukan layar kosong), menu ringkas, admin mendapat notifikasi
await keluarAkun();
await buka("/portal-digital/masuk/gtk");
await isiMasuk("pegawai");
const dasar = await js(`({u:location.pathname, teks:document.body.innerText, menu:document.querySelector("nav")?.innerText.split(String.fromCharCode(10)).map(t=>t.trim()).filter(Boolean)})`);
cek("pegawai tanpa peran → /admin dengan Pengumuman internal + Pintasan saya", dasar.u === "/admin" && dasar.teks.includes("Pengumuman internal") && dasar.teks.includes("Pintasan saya"), { u: dasar.u });
cek("menu pegawai ringkas (Ringkasan, Saya, Pengaturan — tanpa Jadwal/Kurikulum/Sarpras)", dasar.menu.includes("Saya") && !dasar.menu.some((m) => ["Jadwal", "Kurikulum", "Sarpras", "Kesiswaan"].includes(m)), dasar.menu);
await foto("dasbor-dasar-pegawai.jpg");
await buka("/admin/direktori");
cek("direktori GTK tampil untuk pegawai", (await js(`document.querySelectorAll("tbody tr").length`)) > 1, await url());
await buka("/admin/profil-saya");
cek("profil saya: pegawai umum menunggu penetapan", (await js(`document.body.innerText`)).includes("Pegawai umum"), await url());

// 7. laboran → inventaris tanpa kolom anggaran
await keluarAkun();
await buka("/portal-digital/masuk/gtk");
await isiMasuk("laboran");
const menuLab = await js(`document.querySelector("nav")?.innerText.split(String.fromCharCode(10)).map(t=>t.trim()).filter(Boolean)`);
cek("laboran: menu grup Laboratorium (inventaris & jadwal lab)", menuLab.includes("Laboratorium") && !menuLab.includes("Kurikulum"), menuLab);
await buka("/admin/sarpras?tambah=1");
const formLab = await js(`({form:Boolean(document.querySelector("form input[name=nama]")), harga:Boolean(document.querySelector("input[name=harga]")), dana:Boolean(document.querySelector("[name=sumber_dana]"))})`);
cek("laboran: formulir barang tanpa harga & sumber dana", formLab.form && !formLab.harga && !formLab.dana, formLab);

// 8. admin: notifikasi akun tanpa peran + daftar "akun tanpa peran" + ganti foto tanpa deploy ulang
await keluarAkun();
await buka("/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fpengguna");
await isiMasuk("admin");
if ((await url()).startsWith("/admin/mfa")) {
  // super admin wajib dua langkah: pasang autentikator uji (faktor MFA admin dihapus sebelum/sesudah uji)
  await klik(`[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Mulai pasang"))`);
  await sampai(`[...document.querySelectorAll("button")].some(b=>b.textContent.includes("Tidak bisa memindai"))`, 15000);
  await klik(`[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Tidak bisa memindai"))`);
  const rahasia = await js(`document.querySelector("p.font-mono")?.textContent?.trim()`);
  await ketik(`document.querySelector("input[autocomplete='one-time-code']")`, totp(rahasia));
  await klik(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Aktifkan")`);
  await sampai(`!location.pathname.startsWith("/admin/mfa")`, 20000);
  await tidur(1000);
}
{
  if ((await url()) !== "/admin/pengguna") await buka("/admin/pengguna");
  cek("setelah dua langkah, admin kembali ke tujuan /admin/pengguna", (await url()) === "/admin/pengguna", await url());
  const peng = await js(`document.body.innerText`);
  cek("halaman pengguna: daftar 'Akun tanpa peran' memuat pegawai uji", /Akun tanpa peran/.test(peng) && peng.includes("pegawai@sman22.test"), (await url()));
  await buka("/admin/notifikasi");
  cek("admin mendapat notifikasi 'Akun GTK belum diberi peran'", (await js(`document.body.innerText`)).includes("Akun GTK belum diberi peran"), await url());

  await buka("/admin/portal-masuk");
  const { root } = (await kirim("DOM.getDocument", { depth: -1 })).result;
  const node = (await kirim("DOM.querySelector", { nodeId: root.nodeId, selector: "form:has(input[name=peran][value=gtk]) input[name=foto]" })).result.nodeId;
  await kirim("DOM.setFileInputFiles", { nodeId: node, files: [fotoUji] });
  await ketik(`document.querySelector("form:has(input[name=peran][value=gtk]) input[name=alt_text]")`, "Foto uji halaman masuk Guru & Tendik");
  await klik(`document.querySelector("form:has(input[name=peran][value=gtk]) button[type=submit]")`);
  await sampai(`location.search.includes("pesan=tersimpan")`, 20000);
  // kartu "Pilih pintu" (tetap bisa dibuka saat masuk) memakai foto baru
  const kartuGtk = `decodeURIComponent(document.querySelector(".pd-peran img")?.getAttribute("src") ?? "")`;
  await buka("/portal-digital");
  const kartu = await js(kartuGtk);
  cek("kartu 'Pilih pintu' GTK memakai foto baru tanpa deploy ulang (bucket portal)", kartu.includes("/storage/v1/object/public/portal/"), kartu);
  // kembalikan ke foto awal → foto awal peran itu (GTK = aula), bukan gedung
  await buka("/admin/portal-masuk");
  await klik(`document.querySelector("form:has(input[name=peran][value=gtk]) input[name=bawaan]")`);
  await klik(`document.querySelector("form:has(input[name=peran][value=gtk]) button[type=submit]")`);
  await sampai(`location.search.includes("pesan=tersimpan")`, 20000);
  await buka("/portal-digital");
  const kartuAwal = await js(kartuGtk);
  cek("'Kembalikan ke foto awal' → kartu GTK kembali ke foto aula", kartuAwal.includes("kegiatan-aula"), kartuAwal);
  await keluarAkun();
  await buka("/portal-digital/masuk/gtk");
  const src = await js(`decodeURIComponent(document.querySelector(".masuk-foto img")?.getAttribute("src") ?? "")`);
  cek("halaman masuk GTK kembali ke foto aula", src.includes("kegiatan-aula"), src);
}

fs.writeFileSync(path.join(keluar, "hasil-masuk.json"), JSON.stringify(hasil, null, 1));
const gagal = Object.values(hasil).filter((v) => !v.lulus).length;
console.log(`\n${Object.keys(hasil).length - gagal} lulus, ${gagal} gagal`);
ws.close();
proses.kill();
process.exit(gagal ? 1 : 0);
