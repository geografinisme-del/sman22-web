// Kumpulkan galat konsol & exception di halaman penting (server dev lokal + Supabase lokal).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [chrome, keluar, BASE, berkasAkun] = process.argv.slice(2);
if (!/^http:\/\/localhost:\d+$/.test(BASE)) throw new Error("hanya lokal");
const AKUN = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const port = 9337;
const proses = spawn(chrome, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(keluar, "_profil-konsol")}`, "about:blank"], { stdio: "ignore" });
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
let halaman = "";
const temuan = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && tunggu.has(m.id)) {
    tunggu.get(m.id)(m);
    tunggu.delete(m.id);
  } else if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
    temuan.push({ halaman, jenis: m.params.type, pesan: m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 4000) });
  } else if (m.method === "Runtime.exceptionThrown") {
    temuan.push({ halaman, jenis: "exception", pesan: (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 4000) });
  } else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
    temuan.push({ halaman, jenis: "log", pesan: `${m.params.entry.text} ${m.params.entry.url ?? ""}`.slice(0, 300) });
  }
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
await kirim("Log.enable");
await kirim("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
const buka = async (u) => {
  halaman = u;
  await kirim("Page.navigate", { url: BASE + u });
  await tidur(3500);
};
for (const u of ["/", "/perpustakaan", "/agenda", "/profil", "/admin/login"]) await buka(u);
// masuk sebagai humas
await js(`(()=>{const e=document.querySelector('input[name=email]'); e.focus(); return 1})()`);
await kirim("Input.insertText", { text: "humas@sman22.test" });
await js(`document.querySelector('input[name=password]').focus()`);
await kirim("Input.insertText", { text: AKUN.humas });
await js(`[...document.querySelectorAll("button[type=submit]")].find(b=>b.textContent.trim()==="Masuk").click()`);
await tidur(5000);
for (const u of ["/admin", "/admin/tampilan", "/admin/pengumuman", "/pratinjau/tampilan"]) await buka(u);
const unik = [...new Map(temuan.map((t) => [t.halaman + t.pesan, t])).values()];
console.log(JSON.stringify(unik, null, 1));
ws.close();
proses.kill();
