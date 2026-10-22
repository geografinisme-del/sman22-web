// Proxy HTTP lokal yang menambahkan latensi tetap ke setiap request Supabase — untuk mengukur kecepatan admin
// secara lebih realistis (produksi: Vercel sin1 → Supabase ap-southeast-1 + waktu proses PostgREST/Auth).
// Pakai: node scripts/uji-e2e/proxy-latensi.mjs <port-dengar> <url-tujuan> <jeda-ms>
//   mis. node scripts/uji-e2e/proxy-latensi.mjs 56330 http://127.0.0.1:56321 30
import http from "node:http";

const [port = "56330", tujuan = "http://127.0.0.1:56321", jeda = "30"] = process.argv.slice(2);
const t = new URL(tujuan);
http
  .createServer((req, res) => {
    const potongan = [];
    req.on("data", (c) => potongan.push(c));
    req.on("end", () => {
      setTimeout(() => {
        const keluar = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: { ...req.headers, host: `${t.hostname}:${t.port}` } }, (r) => {
          res.writeHead(r.statusCode ?? 502, r.headers);
          r.pipe(res);
        });
        keluar.on("error", (e) => {
          res.writeHead(502);
          res.end(String(e));
        });
        keluar.end(Buffer.concat(potongan));
      }, Number(jeda));
    });
  })
  .listen(Number(port), "127.0.0.1", () => console.log(`proxy latensi ${jeda} ms: http://127.0.0.1:${port} → ${tujuan}`));
