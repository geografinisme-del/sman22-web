// Keyboard ponsel (viewport dipendekkan), reduced motion tema Modern, dan rekaman gulir nyata.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [chrome, keluar, BASE] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya lokal");
fs.mkdirSync(keluar, { recursive: true });
const port = 9338;
const proses = spawn(chrome, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${path.join(keluar, "_profil-ponsel")}`, "about:blank"], { stdio: "ignore" });
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
const pendengar = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && tunggu.has(m.id)) {
    tunggu.get(m.id)(m);
    tunggu.delete(m.id);
  } else if (m.method) pendengar.forEach((f) => f(m));
});
const kirim = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    tunggu.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const js = async (e) => (await kirim("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
await kirim("Page.enable");
await kirim("Runtime.enable");
const layar = (w, h, mobile) => kirim("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const buka = async (u, t = 2500) => {
  await kirim("Page.navigate", { url: BASE + u });
  await tidur(t);
};
const hasil = {};
const cek = (n, l, d) => {
  hasil[n] = { lulus: !!l, d };
  console.log((l ? "LULUS " : "GAGAL ") + n + (l ? "" : " :: " + JSON.stringify(d)));
};

// 1. keyboard ponsel terbuka: tinggi viewport ±390px
for (const u of ["/admin/login?sebagai=siswa", "/admin/login?sebagai=staf"]) {
  await layar(390, 844, true);
  await buka(u);
  await layar(390, 390, true);
  await tidur(400);
  const r = await js(`(()=>{const h=document.documentElement, b=document.body; const kunci=[h,b].some(e=>getComputedStyle(e).overflowY==="hidden"); const pw=document.querySelector("input[name=password]"); pw.focus(); pw.scrollIntoView({block:"center",behavior:"instant"}); const rp=pw.getBoundingClientRect(); const tombol=[...document.querySelectorAll("button[type=submit]")].find(x=>x.textContent.trim()==="Masuk"); tombol.scrollIntoView({block:"nearest",behavior:"instant"}); const rt=tombol.getBoundingClientRect(); return {kunci, bisaGulir:h.scrollHeight>innerHeight, sandiTerlihat:rp.top>=0&&rp.bottom<=innerHeight, tombolTerlihat:rt.top>=0&&rt.bottom<=innerHeight, lebarDok:h.scrollWidth}})()`);
  cek(`keyboard ponsel terbuka (390×390) ${u}: formulir bisa digulir, kolom & tombol terjangkau`, !r.kunci && r.sandiTerlihat && r.tombolTerlihat && r.lebarDok <= 390, r);
}
await layar(390, 390, true);
await kirim("Page.captureScreenshot", { format: "jpeg", quality: 75 }).then((g) => fs.writeFileSync(path.join(keluar, "30-login-keyboard-390.jpg"), Buffer.from(g.result.data, "base64")));

// 2. reduced motion pada tema Modern: tidak ada konten tersembunyi, slideshow tanpa putar, tanpa parallax
await kirim("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await layar(1280, 800, false);
await buka("/", 3000);
await js(`sessionStorage.setItem("sman22:overlay:prioritas","1");1`);
const rm = await js(`(async()=>{window.scrollTo({top:document.documentElement.scrollHeight*0.5,behavior:"instant"}); await new Promise(r=>setTimeout(r,400)); return {akan:document.querySelectorAll(".akan-muncul").length, tema:document.querySelector(".situs-publik").dataset.tema, animPembuka:getComputedStyle(document.querySelector(".pembuka-isi > h1")).animationDuration}})()`);
cek("reduced motion (tema Modern): konten langsung tampil", rm.akan === 0 && (rm.animPembuka === "1e-05s" || parseFloat(rm.animPembuka) < 0.01), rm);
await kirim("Emulation.setEmulatedMedia", { features: [] });

// 3. rekaman gulir nyata (screencast)
async function rekam(nama, w, h, mobile, durasi) {
  await layar(w, h, mobile);
  await buka("/", 600);
  await js(`sessionStorage.clear();sessionStorage.setItem("sman22:overlay:prioritas","1");1`);
  await buka("/", 3500);
  const dir = path.join(keluar, "_bingkai-" + nama);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  const bingkai = [];
  const f = (m) => {
    if (m.method !== "Page.screencastFrame") return;
    bingkai.push({ data: m.params.data, t: m.params.metadata.timestamp });
    kirim("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  };
  pendengar.push(f);
  await kirim("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: w, maxHeight: h, everyNthFrame: 1 });
  await tidur(1200);
  await js(`(async()=>{const total=document.documentElement.scrollHeight-innerHeight; const mulai=performance.now(); const D=${durasi}; await new Promise(r=>{function l(t){const p=Math.min(1,(t-mulai)/D); const e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2; window.scrollTo({top:total*e,behavior:"instant"}); p<1?requestAnimationFrame(l):r()} requestAnimationFrame(l)}); await new Promise(r=>setTimeout(r,1200)); return 1})()`);
  await kirim("Page.stopScreencast");
  pendengar.splice(pendengar.indexOf(f), 1);
  const daftar = [];
  bingkai.forEach((b, i) => {
    const berkas = path.join(dir, `f${String(i).padStart(5, "0")}.jpg`).replace(/\\/g, "/");
    fs.writeFileSync(berkas, Buffer.from(b.data, "base64"));
    daftar.push(`file '${berkas}'\nduration ${(i + 1 < bingkai.length ? Math.max(0.016, bingkai[i + 1].t - b.t) : 0.5).toFixed(3)}`);
  });
  daftar.push(`file '${path.join(dir, `f${String(bingkai.length - 1).padStart(5, "0")}.jpg`).replace(/\\/g, "/")}'`);
  fs.writeFileSync(path.join(dir, "daftar.txt"), daftar.join("\n"));
  const mp4 = path.join(keluar, `${nama}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "daftar.txt"), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "26", mp4]);
  return { nama, bingkai: bingkai.length };
}
console.log(JSON.stringify([await rekam("rekaman-modern-desktop", 1280, 800, false, 15000), await rekam("rekaman-modern-ponsel", 390, 844, true, 14000)]));
ws.close();
proses.kill();
