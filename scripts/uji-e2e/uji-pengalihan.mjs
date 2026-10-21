// Uji pengalihan halaman masuk (Tahap 3): tanpa login, tanpa browser — cukup fetch tanpa mengikuti redirect.
// Jalankan: BASE=http://localhost:3001 node scripts/uji-e2e/uji-pengalihan.mjs
const BASE = process.env.BASE ?? "http://localhost:3001";
let gagal = 0;
const cek = (nama, ok, info = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"}  ${nama}${ok ? "" : `  → ${info}`}`);
  if (!ok) gagal++;
};

async function lokasi(path) {
  const r = await fetch(BASE + path, { redirect: "manual" });
  const l = r.headers.get("location") ?? "";
  return { status: r.status, lokasi: l.startsWith("http") ? l.replace(/^https?:\/\/[^/]+/, "") : l };
}

const KASUS = [
  // [alamat, status yang diharapkan (null = 307/308 apa saja), tujuan diharapkan]
  ["/admin/login", 308, "/portal-digital/masuk/gtk"],
  ["/admin/login?sebagai=staf", 308, "/portal-digital/masuk/gtk?sebagai=staf"],
  ["/admin/login?sebagai=siswa", 308, "/portal-digital/masuk/siswa?sebagai=siswa"],
  ["/admin/login?sebagai=ortu", 308, "/portal-digital/masuk/orang-tua?sebagai=ortu"],
  ["/admin/login?sebagai=orang_tua", 308, "/portal-digital/masuk/orang-tua?sebagai=orang_tua"],
  ["/admin/login?lanjut=%2Fadmin%2Fberita", 308, "/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fberita"],
  ["/admin/berita", null, "/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fberita"],
  ["/admin", null, "/portal-digital/masuk/gtk?lanjut=%2Fadmin"],
  ["/papan", null, "/portal-digital/masuk/gtk?lanjut=%2Fpapan"],
  ["/portal/tugas", null, "/portal-digital/masuk/siswa?lanjut=%2Fportal%2Ftugas"],
  ["/portal/izin", null, "/portal-digital/masuk/orang-tua?lanjut=%2Fportal%2Fizin"],
  ["/portal", null, "/portal-digital?lanjut=%2Fportal"],
  ["/alumni/akun", null, "/admin/login"],
];

for (const [path, status, tujuan] of KASUS) {
  const h = await lokasi(path);
  const okStatus = status ? h.status === status : [307, 308].includes(h.status);
  cek(`${path} → ${tujuan}`, okStatus && decodeURIComponent(h.lokasi) === decodeURIComponent(tujuan), `${h.status} ${h.lokasi}`);
}

// halaman masuk tampil (200), noindex, judul tab per peran
for (const [peran, judul] of [["gtk", "Masuk Guru & Tendik"], ["siswa", "Masuk Portal Siswa"], ["orang-tua", "Masuk Portal Orang Tua"]]) {
  const r = await fetch(`${BASE}/portal-digital/masuk/${peran}`);
  const html = await r.text();
  cek(`/portal-digital/masuk/${peran} 200`, r.status === 200, String(r.status));
  cek(`  noindex`, /<meta name="robots" content="noindex, nofollow"/.test(html));
  cek(`  judul tab "${judul}"`, html.includes(`<title>${judul.replace("&", "&amp;")}`), html.match(/<title>[^<]*/)?.[0]);
  cek(`  tanpa pilihan "Masuk sebagai" (radio jenis)`, !/name="jenis"/.test(html));
}
const r404 = await fetch(`${BASE}/portal-digital/masuk/admin`);
cek("/portal-digital/masuk/admin → 404", r404.status === 404, String(r404.status));

// ?lanjut= berbahaya tidak diteruskan ke formulir
for (const jahat of ["//evil.com", "https://evil.com", "/%2F%2Fevil.com", "/\\evil.com", "/javascript:alert(1)"]) {
  const html = await (await fetch(`${BASE}/portal-digital/masuk/gtk?lanjut=${encodeURIComponent(jahat)}`)).text();
  cek(`lanjut ditolak: ${jahat}`, !/name="lanjut"/.test(html));
}
const aman = await (await fetch(`${BASE}/portal-digital/masuk/gtk?lanjut=%2Fadmin%2Fberita`)).text();
cek("lanjut aman diteruskan (/admin/berita)", /name="lanjut" value="\/admin\/berita"/.test(aman));

// Pilih pintu: tiga pintu meneruskan ?lanjut=
const pintu = await (await fetch(`${BASE}/portal-digital?lanjut=%2Fportal`)).text();
for (const p of ["gtk", "siswa", "orang-tua"]) cek(`pintu ${p} membawa ?lanjut=`, pintu.includes(`/portal-digital/masuk/${p}?lanjut=%2Fportal`));
cek("teks pintu GTK resmi", pintu.includes("Untuk guru, manajemen sekolah, TU, pustakawan, laboran, satpam, caraka, dan pegawai lainnya."));

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
