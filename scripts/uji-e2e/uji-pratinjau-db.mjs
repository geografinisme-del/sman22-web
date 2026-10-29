// Uji regresi DATABASE untuk pratinjau peran (migrasi 20261228) — HANYA stack lokal.
// Wajib: pengguna biasa tetap bisa menulis; transaksi hanya-baca HANYA untuk pratinjau sah (super admin AAL2 + header).
// - guru, humas, operator (ekspor), siswa, orang tua, admin tanpa MFA: upsert preferensi_notifikasi miliknya
//   (dengan & tanpa header x-pratinjau-peran palsu) → berhasil; siswa juga menambah jurnal_baca.
// - admin AAL2 (TOTP didaftarkan lewat API) TANPA header → bisa menulis; DENGAN header → ditolak (read-only),
//   izin menyempit ke peran yang dilihat; header peran palsu/super_admin → tanpa peran.
// Membersihkan barisnya sendiri & faktor MFA admin lewat docker (kontainer lokal).
// Pakai: node scripts/uji-e2e/uji-pratinjau-db.mjs <akun-uji.json>
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [berkasAkun] = process.argv.slice(2);
const SANDI = JSON.parse(fs.readFileSync(berkasAkun, "utf8")).sandi;
const URL = "http://127.0.0.1:56321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const KONTAINER = "supabase_db_sman22-web-uji";
const psql = (sql) => execFileSync("docker", ["exec", "-i", KONTAINER, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" }).trim();

let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + JSON.stringify(d)}`);
  if (!ok) gagal++;
};
const api = async (jalur, { token, metode = "GET", isi, header = {} } = {}) => {
  const r = await fetch(URL + jalur, {
    method: metode,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates", ...header },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  });
  const teks = await r.text();
  let data = null;
  try {
    data = JSON.parse(teks);
  } catch {}
  return { status: r.status, data, teks };
};
const masuk = async (email, sandi) => {
  const r = await api("/auth/v1/token?grant_type=password", { metode: "POST", isi: { email, password: sandi } });
  if (!r.data?.access_token) throw new Error(`gagal masuk ${email}: ${r.teks.slice(0, 120)}`);
  return { token: r.data.access_token, id: r.data.user.id };
};
const tulisPref = (token, id, header = {}) => api("/rest/v1/preferensi_notifikasi?on_conflict=user_id", { token, metode: "POST", isi: { user_id: id, kategori_mati: ["uji-pratinjau"] }, header });
const PALSU = { "x-pratinjau-peran": "kepala_sekolah" };

// pengunjung TANPA login (anon): membaca data publik & mengirim pengaduan tetap jalan, dengan/tanpa header palsu
for (const [label, header] of [["tanpa header", {}], ["dengan header pratinjau palsu", PALSU]]) {
  const baca = await api("/rest/v1/berita?select=id&limit=1", { header });
  cek(`anon (${label}): membaca berita publik → 200`, baca.status === 200, baca.teks.slice(0, 160));
  const kirim = await api("/rest/v1/rpc/kirim_pengaduan", {
    metode: "POST",
    isi: { p_kategori: "lainnya", p_judul: "Uji pratinjau anon (hapus)", p_isi: "uji regresi pratinjau", p_nama: "", p_kontak: "", p_anonim: true, p_ip_hash: "" },
    header,
  });
  cek(`anon (${label}): mengirim pengaduan publik → berhasil`, kirim.status === 200, kirim.teks.slice(0, 160));
}
psql("delete from public.pengaduan where judul = 'Uji pratinjau anon (hapus)';");

const AKUN = [
  ["guru", "guru@sman22.test", SANDI.guru],
  ["humas", "humas@sman22.test", SANDI.humas],
  ["operator (ekspor)", "ekspor@sman22.test", SANDI.ekspor],
  ["siswa", "9990000001.siswa@portal.sman22bdg.sch.id", SANDI.siswa],
  ["orang tua", "9990000001.ortu@portal.sman22bdg.sch.id", SANDI.ortu],
  ["admin tanpa MFA (AAL1)", "admin@sman22.test", SANDI.admin],
];
const dipakai = [];
psql("delete from auth.mfa_factors where user_id in (select id from auth.users where email = 'admin@sman22.test');");

for (const [nama, email, sandi] of AKUN) {
  const { token, id } = await masuk(email, sandi);
  dipakai.push(id);
  const a = await tulisPref(token, id);
  cek(`${nama}: menulis datanya sendiri (tanpa header) → berhasil`, a.status >= 200 && a.status < 300, a.teks.slice(0, 160));
  const b = await tulisPref(token, id, PALSU);
  cek(`${nama}: dengan header pratinjau PALSU tetap bisa menulis (header diabaikan)`, b.status >= 200 && b.status < 300, b.teks.slice(0, 160));
  const p = await api("/rest/v1/rpc/peran_pratinjau", { token, metode: "POST", isi: {}, header: PALSU });
  cek(`${nama}: peran_pratinjau() = null walau header dikirim`, p.status === 200 && p.data === null, p.teks.slice(0, 120));
}

// siswa: tulisan khas portal (jurnal baca)
{
  const { token } = await masuk("9990000001.siswa@portal.sman22bdg.sch.id", SANDI.siswa);
  const sid = (await api("/rest/v1/rpc/siswa_login", { token, metode: "POST", isi: {} })).data;
  if (!sid) {
    // akun siswa uji lokal belum tertaut ke data siswa (siswa_login() = null) → insert ditolak RLS dengan/tanpa
    // pratinjau; penulisan milik siswa sendiri sudah diuji lewat preferensi_notifikasi di atas
    console.log("LEWATI siswa: jurnal baca — akun siswa uji lokal belum tertaut ke data siswa");
  } else {
    const j = await api("/rest/v1/jurnal_baca", { token, metode: "POST", isi: { siswa_id: sid, judul: "Uji pratinjau (hapus)", ringkasan: "uji regresi" }, header: PALSU });
    cek("siswa: menambah jurnal baca (header palsu diabaikan) → berhasil", j.status === 201, j.teks.slice(0, 160));
  }
psql("delete from public.jurnal_baca where judul = 'Uji pratinjau (hapus)';");
}

// admin AAL2 lewat TOTP
const totp = (rahasia) => {
  const abjad = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bit = "";
  for (const c of rahasia.replace(/=+$/, "").toUpperCase()) bit += abjad.indexOf(c).toString(2).padStart(5, "0");
  const kunci = Buffer.from(bit.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const pencacah = Buffer.alloc(8);
  pencacah.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac("sha1", kunci).update(pencacah).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
};
{
  const { token: t1, id } = await masuk("admin@sman22.test", SANDI.admin);
  const daftar = await api("/auth/v1/factors", { token: t1, metode: "POST", isi: { factor_type: "totp", friendly_name: "uji-pratinjau" } });
  const faktor = daftar.data?.id;
  const tantangan = await api(`/auth/v1/factors/${faktor}/challenge`, { token: t1, metode: "POST", isi: {} });
  const v = await api(`/auth/v1/factors/${faktor}/verify`, { token: t1, metode: "POST", isi: { challenge_id: tantangan.data?.id, code: totp(daftar.data?.totp?.secret ?? "") } });
  const t2 = v.data?.access_token;
  cek("admin: lolos MFA (AAL2)", Boolean(t2), v.teks.slice(0, 160));
  if (t2) {
    const a = await tulisPref(t2, id);
    cek("admin AAL2 TANPA pratinjau → bisa menulis", a.status >= 200 && a.status < 300, a.teks.slice(0, 160));
    const pr = await api("/rest/v1/rpc/peran_pratinjau", { token: t2, metode: "POST", isi: {}, header: { "x-pratinjau-peran": "guru" } });
    cek("admin AAL2 + header guru → peran_pratinjau = guru", pr.data === "guru", pr.teks);
    const b = await tulisPref(t2, id, { "x-pratinjau-peran": "guru" });
    cek("admin AAL2 + pratinjau → penulisan DITOLAK database (read-only)", b.status >= 400 && /read-only/i.test(b.teks), `${b.status} ${b.teks.slice(0, 160)}`);
    const ak = await api("/rest/v1/rpc/akses_saya", { token: t2, metode: "POST", isi: {}, header: { "x-pratinjau-peran": "waka_humas" } });
    const izinHumas = psql("select string_agg(izin, ',' order by izin) from public.peran_izin where peran = 'waka_humas';");
    cek("admin AAL2 + pratinjau humas → akses_saya = peran & izin humas saja", JSON.stringify(ak.data?.peran) === '["waka_humas"]' && [...(ak.data?.izin ?? [])].sort().join(",") === izinHumas, ak.data);
    const pg = await api("/rest/v1/pengguna?select=user_id", { token: t2, header: { "x-pratinjau-peran": "guru" } });
    const pgPenuh = await api("/rest/v1/pengguna?select=user_id", { token: t2 });
    cek(`admin AAL2 + pratinjau guru → data menyempit (pengguna: ${pgPenuh.data?.length} → ${pg.data?.length})`, Array.isArray(pg.data) && pg.data.length < pgPenuh.data.length && pg.data.length <= 1, { pratinjau: pg.data?.length, penuh: pgPenuh.data?.length });
    const sp = await api("/rest/v1/rpc/akses_saya", { token: t2, metode: "POST", isi: {}, header: { "x-pratinjau-peran": "super_admin" } });
    cek("header peran super_admin → tanpa peran (0 izin), bukan hak penuh", Array.isArray(sp.data?.izin) && sp.data.izin.length === 0, sp.data);
    const c = await tulisPref(t2, id);
    cek("admin AAL2 setelah pratinjau (tanpa header) → bisa menulis lagi", c.status >= 200 && c.status < 300, c.teks.slice(0, 160));
  }
}

// bersihkan
psql(`delete from public.preferensi_notifikasi where kategori_mati = array['uji-pratinjau'] and user_id in (${dipakai.map((x) => `'${x}'`).join(",")});
delete from auth.mfa_factors where user_id in (select id from auth.users where email = 'admin@sman22.test');`);
console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
