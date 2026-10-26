// Kembalikan data uji LOKAL ke keadaan awal sebelum menjalankan uji-alur / uji-ekspor / uji-pengalihan.
// HANYA menyasar kontainer Supabase lokal `supabase_db_sman22-web-uji` (lewat docker exec) — tidak pernah production.
// - hapus faktor MFA admin@sman22.test (uji-alur & uji-masuk mendaftarkan TOTP; uji-alur mengharapkan belum ada)
// - susunan widget beranda (draf & terbit) = SUSUNAN_BAWAAN kode (uji-alur melepas Berita & memindah Kontak, lalu
//   sengaja menerapkannya), tingkat gerak = bawaan kode (uji-alur menerapkan "dinamis")
// - kosongkan teks bantuan sandi bertanda "Uji" (uji-masuk mengubahnya; data publik di-cache 60 detik)
// - hapus siswa hasil uji-impor (NISN fiktif 00900000xx) beserta baris yang merujuknya
// - pastikan akun uji ekspor@sman22.test (peran manajemen tanpa super_admin → tidak wajib MFA) ada & aktif
// Pakai: node scripts/uji-e2e/reset-data-uji-lokal.mjs
import { execFileSync } from "node:child_process";
import { SUSUNAN_BAWAAN } from "../../src/lib/tampilan/widget.ts";
import { KONFIGURASI_BAWAAN } from "../../src/lib/tampilan/konfigurasi.ts";

const KONTAINER = "supabase_db_sman22-web-uji";
const nama = execFileSync("docker", ["ps", "--filter", `name=^${KONTAINER}$`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim();
if (nama !== KONTAINER) throw new Error(`kontainer ${KONTAINER} tidak berjalan — reset dibatalkan`);

const susunan = JSON.stringify(SUSUNAN_BAWAAN).replace(/'/g, "''");
const PERAN_EKSPOR = ["kepala_sekolah", "wakasek", "kurikulum", "operator", "sarpras", "humas", "kesiswaan", "tim_mutu", "admin_alumni", "keuangan", "pustakawan", "wali_kelas"];
const sql = `
begin;
delete from auth.mfa_factors where user_id in (select id from auth.users where email = 'admin@sman22.test');
update public.tampilan_draf set konfigurasi = jsonb_set(jsonb_set(konfigurasi, '{beranda}', '${susunan}'::jsonb), '{gerak}', '"${KONFIGURASI_BAWAAN.gerak}"') where id = 1;
update public.pengaturan_situs set tema = jsonb_set(jsonb_set(tema, '{tampilan,beranda}', '${susunan}'::jsonb), '{tampilan,gerak}', '"${KONFIGURASI_BAWAAN.gerak}"') where id = 1;
update public.portal_login set bantuan_sandi = null where bantuan_sandi ilike 'uji%';
insert into public.pengguna (user_id, nama, email, aktif)
  select id, 'Operator ekspor (uji)', email, true from auth.users where email = 'ekspor@sman22.test'
  on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran)
  select u.id, k from auth.users u, unnest(array[${PERAN_EKSPOR.map((p) => `'${p}'`).join(",")}]) k where u.email = 'ekspor@sman22.test'
  on conflict do nothing;
-- siswa hasil uji-impor (NISN fiktif 00900000xx + nama "Uji …"): hapus baris yang merujuknya, lalu siswanya,
-- agar impor berikutnya kembali tercatat sebagai "Data baru"
do $$
declare r record; ids uuid[];
begin
  select array_agg(id) into ids from public.siswa where nisn ~ '^00900000[0-9]{2}$' and nama like 'Uji %';
  if ids is null then return; end if;
  for r in
    select c.conrelid::regclass as tabel, a.attname as kolom
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.siswa'::regclass
  loop
    execute format('delete from %s where %I = any($1)', r.tabel, r.kolom) using ids;
  end loop;
  delete from public.siswa where id = any(ids);
end $$;
select 'siswa uji impor tersisa: ' || (select count(*) from public.siswa where nisn ~ '^00900000[0-9]{2}$');
select 'mfa admin: ' || (select count(*) from auth.mfa_factors f join auth.users u on u.id = f.user_id where u.email = 'admin@sman22.test');
select 'gerak: ' || (select tema->'tampilan'->>'gerak' from public.pengaturan_situs where id = 1);
select 'susunan terbit: ' || (select jsonb_path_query_array(tema->'tampilan', '$.beranda[*].jenis')::text from public.pengaturan_situs where id = 1);
select 'akun ekspor: ' || (select count(*) from public.pengguna_peran pp join auth.users u on u.id = pp.user_id where u.email = 'ekspor@sman22.test') || ' peran';
commit;
`;
const keluaran = execFileSync("docker", ["exec", "-i", KONTAINER, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
console.log(keluaran.trim());
console.log("Catatan: data publik di-cache 60 detik oleh server Next lokal — tunggu ±1 menit (atau mulai ulang server) sebelum uji.");
