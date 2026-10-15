// Seed HANYA untuk stack Supabase lokal terisolasi (sman22-web-uji, port 56321). Bukan produksi.
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const API = "http://127.0.0.1:56321";
if (!/^http:\/\/127\.0\.0\.1:56321$/.test(API)) throw new Error("hanya lokal");
const status = JSON.parse(execFileSync("docker", ["exec", "supabase_kong_sman22-web-uji", "true"]).toString() || "null");
void status;
const SERVICE = process.env.SB_LOKAL_SERVICE;
const out = process.argv[2];
const akun = ["admin", "humas", "pustakawan", "guru"];
const sandi = Object.fromEntries(akun.map((a) => [a, "Uji-" + randomBytes(9).toString("base64url")]));
const ids = {};
for (const a of akun) {
  const email = `${a}@sman22.test`;
  let r = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: sandi[a], email_confirm: true }),
  });
  let j = await r.json();
  if (!r.ok) {
    // sudah ada → cari & perbarui sandi
    const daftar = await (await fetch(`${API}/auth/v1/admin/users?per_page=200`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
    const u = daftar.users.find((x) => x.email === email);
    r = await fetch(`${API}/auth/v1/admin/users/${u.id}`, {
      method: "PUT",
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: sandi[a] }),
    });
    j = await r.json();
  }
  ids[a] = j.id;
}
fs.writeFileSync(out, JSON.stringify({ catatan: "Akun uji stack LOKAL saja", sandi, ids }, null, 1));
console.log("akun lokal siap:", Object.keys(ids).join(", "));
