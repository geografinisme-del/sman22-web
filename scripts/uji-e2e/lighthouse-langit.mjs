// Lighthouse (seluler, simulasi) untuk beberapa rute + ringkasan skor, metrik, dan audit yang gagal.
// Pakai: node scripts/uji-e2e/lighthouse-langit.mjs <base-url> <folder-keluar> <jalur1,jalur2> [kategori] [ekstra-header-json]
// Butuh CHROME_PATH. Untuk pratinjau Vercel terlindungi, kirim header cookie _vercel_jwt lewat argumen ke-5.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [base, keluar, daftar, kategori = "performance,accessibility,best-practices,seo", ekstra] = process.argv.slice(2);
fs.mkdirSync(keluar, { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const ringkas = [];
for (const jalur of daftar.split(",")) {
  const nama = jalur === "/" ? "beranda" : jalur.replace(/^\//, "").replace(/[/?=&]/g, "_");
  const berkas = path.join(keluar, `${nama}.json`);
  const arg = ["-y", "lighthouse@12.8.2", base + jalur, `--only-categories=${kategori}`, "--output=json", `--output-path=${berkas}`, "--chrome-flags=--headless=new", "--quiet"];
  if (ekstra) arg.push(`--extra-headers=${ekstra}`);
  try {
    execFileSync(npx, arg, { stdio: "ignore", shell: process.platform === "win32" });
  } catch {
    /* lighthouse bisa keluar ≠ 0 walau laporan tertulis */
  }
  if (!fs.existsSync(berkas)) {
    ringkas.push({ jalur, galat: "tanpa laporan" });
    continue;
  }
  const d = JSON.parse(fs.readFileSync(berkas, "utf8"));
  const a = d.audits;
  const ids = new Set(Object.values(d.categories).flatMap((c) => c.auditRefs.map((r) => r.id)));
  ringkas.push({
    jalur,
    skor: Object.fromEntries(Object.entries(d.categories).map(([k, c]) => [k, c.score])),
    LCP: a["largest-contentful-paint"]?.displayValue,
    CLS: a["cumulative-layout-shift"]?.displayValue,
    TBT: a["total-blocking-time"]?.displayValue,
    bobotKB: Math.round((a["total-byte-weight"]?.numericValue ?? 0) / 1024),
    gagal: Object.entries(a)
      .filter(([k, v]) => v.score === 0 && ids.has(k))
      .map(([k, v]) => `${k}: ${(v.details?.items ?? []).slice(0, 2).map((i) => i.node?.selector ?? i.url ?? i.description ?? "").join(" | ")}`),
  });
}
fs.writeFileSync(path.join(keluar, "ringkasan.json"), JSON.stringify(ringkas, null, 1));
for (const r of ringkas) console.log(JSON.stringify(r));
