// Uji DATABASE hak akses per bidang (migrasi 20261229) — HANYA stack lokal (kontainer supabase_db_sman22-web-uji).
// Setiap skenario berjalan dalam SATU transaksi yang selalu di-ROLLBACK: akun sementara per peran, siswa, pengaduan
// (biasa & rahasia), rujukan BK, kasus BK, kemitraan dibuat di dalamnya lalu dibuang. Database tidak berubah.
// Peran disimulasikan persis seperti PostgREST: role `authenticated` + request.jwt.claims (sub, aal) + pra_permintaan().
// Pakai: node scripts/uji-e2e/uji-hak-akses-db.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const KONTAINER = "supabase_db_sman22-web-uji";
let gagal = 0;
const cek = (n, ok, d = "") => {
  console.log(`${ok ? "LULUS" : "GAGAL"} ${n}${ok ? "" : " :: " + JSON.stringify(d)}`);
  if (!ok) gagal++;
};

// uuid tetap per peran (hanya hidup di dalam transaksi)
const PERAN = ["super_admin", "kepala_sekolah", "operator", "waka_kurikulum", "waka_kesiswaan", "waka_sarpras", "waka_humas", "bk", "guru", "piket"];
const uid = (i) => `00000000-0000-4000-a000-0000000000${String(10 + i).padStart(2, "0")}`;
const U = Object.fromEntries(PERAN.map((p, i) => [p, uid(i)]));
U.guru2 = uid(40); // guru lain (bukan perujuk)
U.korban = uid(41); // akun ber-peran bk (dilindungi) untuk uji operator
U.target = uid(42); // akun guru biasa untuk uji operator
const SISWA = "00000000-0000-4000-a000-000000000099";

const fixture = `
insert into auth.users (id, aud, role, email) select x.id::uuid, 'authenticated', 'authenticated', 'uji-ha-' || x.id || '@contoh.invalid'
  from (values ${[...Object.values(U)].map((v) => `('${v}')`).join(",")}) x(id);
insert into public.pengguna (user_id, nama, email, aktif) select id, 'Uji ' || id, email, true from auth.users where email like 'uji-ha-%'
  on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  ${PERAN.map((p) => `('${U[p]}', '${p}')`).join(", ")}, ('${U.guru2}', 'guru'), ('${U.korban}', 'bk'), ('${U.target}', 'guru');
insert into public.pegawai (nama, user_id) select 'Pegawai ' || x, x::uuid from unnest(array['${U.guru}', '${U.guru2}', '${U.bk}', '${U.waka_humas}']) x;
insert into public.siswa (id, nama, nisn, alamat, telepon) values ('${SISWA}', 'Siswa Uji Hak Akses', '9999000099', 'Jl. Rahasia 1', '0800000099');
-- pengaduan biasa & rahasia (lewat jalur publik)
select count(*) from public.kirim_pengaduan('layanan', 'Uji aduan biasa', 'isi pengaduan biasa untuk uji hak akses', 'Pelapor', '0811', false, '');
select public.kirim_pengaduan('perundungan', 'Uji aduan rahasia', 'isi pengaduan rahasia untuk uji hak akses', 'Korban', '0812', false, '');
-- rujukan BK oleh guru (trigger mengisi dirujuk_oleh dari auth.uid())
select set_config('request.jwt.claims', json_build_object('sub', '${U.guru}', 'role', 'authenticated')::text, true);
insert into public.rujukan_bk (siswa_id, alasan) values ('${SISWA}', 'alasan rujukan uji hak akses');
update public.rujukan_bk set catatan_bk = 'CATATAN BK RAHASIA' where alasan = 'alasan rujukan uji hak akses';
select set_config('request.jwt.claims', '', true);
insert into public.kasus_bk (kode, siswa_id, kategori) values ('UJI-HA-1', '${SISWA}', (select kode from public.kategori_konseling limit 1));
insert into public.kemitraan (mitra) values ('Mitra uji hak akses');
`;

/** jalankan `sql` sebagai `peran` (aal1/aal2) di dalam transaksi ber-fixture; keluaran baris -At, galat ikut dikembalikan */
const sebagai = (peran, sql, { aal = "aal1", header = {} } = {}) => {
  const sub = U[peran] ?? peran;
  const naskah = `\\set ON_ERROR_STOP 0
begin;
${fixture}
select set_config('request.jwt.claims', json_build_object('sub', '${sub}', 'role', 'authenticated', 'aal', '${aal}')::text, true) is null;
select set_config('request.headers', '${JSON.stringify(header)}', true) is null;
set local role authenticated;
select public.pra_permintaan();
\\echo ===MULAI
${sql}
rollback;`;
  return jalankan(naskah);
};
/** psql di kontainer; kembalikan keluaran SETELAH penanda ===MULAI + seluruh pesan galat (stderr) */
function jalankan(naskah) {
  // UJI_PRODUKSI=1: lewat backup/psql-prod.sh (URL dari .env.local, tidak ditampilkan). Semua skenario tetap ROLLBACK.
  const r = process.env.UJI_PRODUKSI === "1"
    ? (fs.writeFileSync("backup/_uji-hak-akses.sql", naskah), spawnSync("bash", ["backup/psql-prod.sh", "backup/_uji-hak-akses.sql", "-At", "-q"], { encoding: "utf8" }))
    : spawnSync("docker", ["exec", "-i", KONTAINER, "psql", "-U", "postgres", "-At", "-q"], { input: naskah, encoding: "utf8" });
  const keluar = (r.stdout ?? "").split("===MULAI")[1]?.trim() ?? r.stdout ?? "";
  const err = (r.stderr ?? "").split("\n").filter((l) => /ERROR/.test(l)).join("\n");
  return err ? `${keluar}\n${err}`.trim() : keluar;
}
/** transaksi ber-fixture sebagai pemilik database: `persiapan` lalu `sql` (keluaran yang dinilai), selalu ROLLBACK */
const transaksi = (persiapan, sql, { tanpaFixture = false } = {}) =>
  jalankan(["\\set ON_ERROR_STOP 0", "begin;", tanpaFixture ? "" : fixture, persiapan, "\\echo ===MULAI", sql, "rollback;"].join("\n"));
const angka = (s) => Number((s.match(/-?\d+/) ?? ["NaN"])[0]);
const galat = (s) => /ERROR/.test(s);

// ---------------------------------------------------------------- 1. matriks izin
const HARAP = {
  kepala_sekolah: "absensi_pegawai.lihat,absensi.lihat,alumni.lihat,audit.baca,bk.agregat,data_induk.baca,disiplin.lihat,ekskul.anggaran,ekskul.lihat,humas.lihat,izin_pegawai.setujui,kesiswaan.lihat,konten.terbitkan,mutu.lihat,pengaduan.lihat,perpus.lihat,sarpras.lihat,supervisi.kelola",
  operator: "absensi_pegawai.kelola,absensi_pegawai.lihat,absensi.lihat,akun_portal.kelola,data_induk.baca,data_induk.kelola,pengguna.kelola_dasar,sarpras.lihat,tamu.catat",
  waka_kurikulum: "data_induk.baca,jadwal.kelola,jadwal.pengganti,kalender.kelola,kurikulum.kelola,mutu.lihat,perpus.lihat,supervisi.kelola",
  waka_kesiswaan: "absensi.atur,absensi.kelola,absensi.lihat,data_induk.baca,disiplin.kelola,disiplin.lihat,ekskul.kelola,ekskul.lihat,kesiswaan.kelola,kesiswaan.lihat,pengaduan.rahasia",
  waka_sarpras: "sarpras.inventaris,sarpras.kelola,sarpras.lihat",
  waka_humas: "alumni.kelola,alumni.lihat,humas.kelola,konten.kelola,pengaduan.kelola,tamu.catat",
};
for (const [p, harap] of Object.entries(HARAP)) {
  const r = sebagai(p, `select string_agg(x, ',' order by x) from jsonb_array_elements_text(public.akses_saya() -> 'izin') x;`);
  cek(`izin ${p} = matriks A2`, r === harap, { dapat: r, harap });
}
{
  const r = sebagai("super_admin", `select string_agg(x, ',' order by x) from jsonb_array_elements_text(public.akses_saya() -> 'izin') x;`, { aal: "aal2" });
  const iz = r.split(",");
  cek("super admin: tetap pengguna.kelola & data_induk.kelola; tanpa bk.rujukan/bk.konseling/pengaduan.kelola/rahasia; ada pengaduan.metadata",
    iz.includes("pengguna.kelola") && iz.includes("data_induk.kelola") && iz.includes("pengaduan.metadata") && !iz.some((i) => ["bk.rujukan", "bk.konseling", "pengaduan.kelola", "pengaduan.rahasia"].includes(i)), r);
}
cek("peran wakasek generik sudah tidak ada", sebagai("super_admin", "select count(*) from public.peran where kode in ('wakasek','kurikulum','kesiswaan','sarpras','humas');", { aal: "aal2" }) === "0");

// ---------------------------------------------------------------- 2. BK
for (const p of ["super_admin", "kepala_sekolah", "waka_kesiswaan", "guru", "operator"]) {
  const r = sebagai(p, `select (select count(*) from public.kasus_bk where siswa_id = '${SISWA}') + (select count(*) from public.rujukan_bk where alasan = 'alasan rujukan uji hak akses');`, { aal: "aal2" });
  cek(`${p}: tidak bisa membaca kasus BK maupun tabel rujukan BK`, r === "0", r);
}
const bkBaca = sebagai("bk", `select (select count(*) from public.kasus_bk where siswa_id = '${SISWA}') + (select count(*) from public.rujukan_bk where alasan = 'alasan rujukan uji hak akses');`);
cek("bk: bisa membaca kasus & rujukan BK", bkBaca === "2", bkBaca);
{
  const r = sebagai("guru", `select alasan || '|' || status from public.rujukan_saya() where alasan = 'alasan rujukan uji hak akses';`);
  cek("guru perujuk: melihat status rujukannya lewat rujukan_saya()", r === "alasan rujukan uji hak akses|baru", r);
  cek("rujukan_saya() tidak memuat catatan BK", !/catatan/.test(sebagai("guru", `select row_to_json(r)::text from public.rujukan_saya() r limit 1;`)));
  cek("guru lain: rujukan_saya() kosong", sebagai("guru2", `select count(*) from public.rujukan_saya();`) === "0");
}
cek("log aktivitas: perubahan rujukan BK tidak menyimpan alasan/catatan",
  !/CATATAN BK RAHASIA|alasan rujukan uji/.test(sebagai("super_admin", `select coalesce(string_agg(coalesce(data_lama::text,'') || coalesce(data_baru::text,''), ' '), '') from public.audit_log where tabel = 'rujukan_bk';`, { aal: "aal2" })));

// ---------------------------------------------------------------- 3 & 4. pengaduan
const bacaAduan = (p, opsi) => sebagai(p, `select coalesce(string_agg(judul, ',' order by judul), '-') from public.pengaduan where judul like 'Uji aduan%';`, opsi);
const ubahAduan = (p, judul, opsi) => sebagai(p, `with u as (update public.pengaduan set catatan_internal = 'uji' where judul = '${judul}' returning 1) select count(*) from u;`, opsi);
cek("bk: membaca aduan rahasia saja", bacaAduan("bk") === "Uji aduan rahasia", bacaAduan("bk"));
cek("bk: bisa menindaklanjuti aduan rahasia", ubahAduan("bk", "Uji aduan rahasia") === "1");
cek("waka_kesiswaan: membaca & menindaklanjuti aduan rahasia", bacaAduan("waka_kesiswaan") === "Uji aduan rahasia" && ubahAduan("waka_kesiswaan", "Uji aduan rahasia") === "1");
cek("waka_humas: membaca aduan biasa saja", bacaAduan("waka_humas") === "Uji aduan biasa", bacaAduan("waka_humas"));
cek("waka_humas: bisa menindaklanjuti aduan biasa, tidak aduan rahasia", ubahAduan("waka_humas", "Uji aduan biasa") === "1" && ubahAduan("waka_humas", "Uji aduan rahasia") === "0");
cek("kepala sekolah: membaca kedua aduan", bacaAduan("kepala_sekolah") === "Uji aduan biasa,Uji aduan rahasia", bacaAduan("kepala_sekolah"));
cek("kepala sekolah: tidak bisa mengubah aduan", ubahAduan("kepala_sekolah", "Uji aduan biasa") === "0" && ubahAduan("kepala_sekolah", "Uji aduan rahasia") === "0");
cek("super admin: 0 baris dari tabel pengaduan", bacaAduan("super_admin", { aal: "aal2" }) === "-", bacaAduan("super_admin", { aal: "aal2" }));
{
  const r = sebagai("super_admin", `select count(*) from public.pengaduan_ringkas where tiket is not null and created_at > now() - interval '1 minute';`, { aal: "aal2" });
  cek("super admin: metadata kedua aduan dari pengaduan_ringkas", r === "2", r);
  const kolom = sebagai("super_admin", `select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name = 'pengaduan_ringkas';`, { aal: "aal2" });
  cek("pengaduan_ringkas tanpa isi/judul/nama/kontak/catatan", !/\b(isi|judul|nama|kontak|catatan_internal|pelapor_id)\b/.test(kolom), kolom);
}
cek("guru biasa: tidak melihat pengaduan maupun ringkasannya", sebagai("guru", `select (select count(*) from public.pengaduan) + (select count(*) from public.pengaduan_ringkas);`) === "0");
cek("log aktivitas: pengaduan tidak menyimpan isi", !/isi pengaduan/.test(sebagai("super_admin", `select coalesce(string_agg(coalesce(data_lama::text,'') || coalesce(data_baru::text,''), ' '), '') from public.audit_log where tabel = 'pengaduan';`, { aal: "aal2" })));

// ---------------------------------------------------------------- 5. operator
const tambahPeran = (pelaku, target, peran, opsi) => sebagai(pelaku, `insert into public.pengguna_peran (user_id, peran) values ('${target}', '${peran}');`, opsi);
cek("operator: memberi peran dasar (piket) ke akun guru", !galat(tambahPeran("operator", U.target, "piket")), tambahPeran("operator", U.target, "piket"));
for (const p of ["bk", "kepala_sekolah", "waka_kurikulum", "super_admin", "operator"]) cek(`operator: DITOLAK memberi peran ${p}`, galat(tambahPeran("operator", U.target, p)));
cek("operator: DITOLAK menambah peran dasar ke akun dilindungi (punya bk)", galat(tambahPeran("operator", U.korban, "piket")));
cek("operator: tidak bisa mencabut peran bk", sebagai("operator", `with d as (delete from public.pengguna_peran where user_id = '${U.korban}' and peran = 'bk' returning 1) select count(*) from d;`) !== "1");
cek("operator: tidak bisa menonaktifkan akun dilindungi", sebagai("operator", `with u as (update public.pengguna set aktif = false where user_id = '${U.korban}' returning 1) select count(*) from u;`) === "0");
cek("operator: bisa menonaktifkan/mengubah akun dasar", sebagai("operator", `with u as (update public.pengguna set nama = 'Ubah' where user_id = '${U.target}' returning 1) select count(*) from u;`) === "1");
cek("operator: catat reset sandi akun dasar → boleh", !galat(sebagai("operator", `select public.catat_keamanan_pengguna('${U.target}', 'sandi_direset');`)));
cek("operator: catat reset sandi akun dilindungi → ditolak", galat(sebagai("operator", `select public.catat_keamanan_pengguna('${U.korban}', 'sandi_direset');`)));
cek("operator: reset MFA tetap khusus super admin", galat(sebagai("operator", `select public.catat_keamanan_pengguna('${U.target}', 'mfa_direset');`)));
cek("operator: pemberian peran tercatat di log aktivitas (siapa, kapan, peran)",
  transaksi(
    `select set_config('request.jwt.claims', json_build_object('sub','${U.operator}','role','authenticated')::text, true) is null;
     set local role authenticated; insert into public.pengguna_peran (user_id, peran) values ('${U.target}', 'piket'); reset role;`,
    `select count(*) from public.audit_log where tabel = 'pengguna_peran' and aksi = 'INSERT' and user_id = '${U.operator}' and data_baru ->> 'peran' = 'piket' and waktu > now() - interval '1 minute';`,
  ) === "1");
cek("guru: tidak bisa memberi peran apa pun", galat(tambahPeran("guru", U.target, "piket")));

// ---------------------------------------------------------------- 6. kepala sekolah lihat humas
cek("kepala sekolah: membaca kemitraan", sebagai("kepala_sekolah", `select count(*) from public.kemitraan where mitra = 'Mitra uji hak akses';`) === "1");
cek("kepala sekolah: tidak bisa menambah kemitraan", galat(sebagai("kepala_sekolah", `insert into public.kemitraan (mitra) values ('x');`)));
cek("kepala sekolah: statistik humas terbuka (angka)", !galat(sebagai("kepala_sekolah", `select public.statistik_humas(current_date - 30, current_date) is not null;`)));
// kemitraan memang terbuka baca untuk semua staf aktif (kebijakan lama "baca kemitraan"); kontak media khusus humas
cek("kepala sekolah: membaca kontak media; waka_sarpras tidak", sebagai("kepala_sekolah", `insert into public.kontak_media (nama) values ('x') returning 1;`).includes("ERROR")
  && sebagai("waka_sarpras", `select count(*) from public.kontak_media;`) === "0");

// ---------------------------------------------------------------- 7. kalender
const kal = (p) => sebagai(p, `insert into public.kegiatan_kalender (judul, jenis, mulai, selesai) values ('Uji kalender', 'kegiatan', current_date, current_date);`);
cek("waka_kurikulum: bisa menulis kalender", !galat(kal("waka_kurikulum")), kal("waka_kurikulum"));
for (const p of ["waka_humas", "waka_sarpras", "waka_kesiswaan"]) cek(`${p}: tidak bisa menulis kalender`, galat(kal(p)));

// ---------------------------------------------------------------- 8. log aktivitas disamarkan
{
  const r = transaksi(
    `select set_config('request.jwt.claims', json_build_object('sub','${U.operator}','role','authenticated')::text, true) is null;
     update public.siswa set alamat = 'Jl. Baru Rahasia 2' where id = '${SISWA}';
     update public.kemitraan set catatan = 'catatan mitra terbuka' where mitra = 'Mitra uji hak akses';`,
    `select (select data_baru::text || data_lama::text from public.audit_log where tabel = 'siswa' and record_id = '${SISWA}' and aksi = 'UPDATE' order by id desc limit 1)
       || '###' || (select data_baru::text from public.audit_log where tabel = 'kemitraan' and aksi = 'UPDATE' order by id desc limit 1);
     select count(*) from public.audit_log where public.tabel_audit_sensitif(tabel) and aksi in ('INSERT','UPDATE','DELETE') and not coalesce((coalesce(data_baru, data_lama) ->> '_disamarkan')::boolean, false);`,
  ).split("\n");
  const [sis, mitra] = r[0].split("###");
  cek("log siswa: hanya nama kolom yang berubah, tanpa nilai", /"_disamarkan": true/.test(sis) && /"alamat"/.test(sis) && !/Rahasia/.test(sis), sis);
  cek("log tabel tidak sensitif (kemitraan) tetap lengkap", /catatan mitra terbuka/.test(mitra ?? ""), mitra);
  cek("tidak ada catatan log sensitif lama yang belum disamarkan", r[1] === "0", r[1]);
}

// ---------------------------------------------------------------- 9. super admin tidak pernah terkunci
{
  for (const p of ["operator", "bk", "waka_kurikulum", "kepala_sekolah"]) cek(`super admin (AAL2): bisa memberi peran ${p}`, !galat(tambahPeran("super_admin", U.target, p, { aal: "aal2" })), tambahPeran("super_admin", U.target, p, { aal: "aal2" }));
  cek("super admin: bisa mencabut peran bk", sebagai("super_admin", `with d as (delete from public.pengguna_peran where user_id = '${U.korban}' and peran = 'bk' returning 1) select count(*) from d;`, { aal: "aal2" }) === "1");
  cek("izin pengguna.kelola milik super admin tidak bisa dicabut (bahkan oleh pemilik database)",
    /tidak boleh dicabut/.test(transaksi("", `delete from public.peran_izin where peran = 'super_admin' and izin = 'pengguna.kelola';`, { tanpaFixture: true })));
  cek("super admin: masih bisa memperbaiki data induk (A2a)", sebagai("super_admin", `with u as (update public.siswa set telepon = '0800000100' where id = '${SISWA}' returning 1) select count(*) from u;`, { aal: "aal2" }) === "1");
  cek("super admin tanpa MFA (AAL1): tidak bisa memberi peran", galat(tambahPeran("super_admin", U.target, "piket", { aal: "aal1" })));
}

// ---------------------------------------------------------------- 10. pengunjung & pengguna biasa tetap jalan
cek("anon: membaca galeri publik", !galat(sebagai("anon_dummy", `reset role; set local role anon; select count(*) from public.galeri;`)));
cek("guru: menulis preferensi notifikasi miliknya", sebagai("guru", `insert into public.preferensi_notifikasi (user_id, kategori_mati) values (auth.uid(), array['uji']) on conflict (user_id) do update set kategori_mati = excluded.kategori_mati returning 'ok';`) === "ok");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua LULUS");
process.exit(gagal ? 1 : 0);
