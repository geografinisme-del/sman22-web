-- Uji hak akses Fase 4 (portal & izin orang tua). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['walikelas','guru','piket','siswa','ortu','operator']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('walikelas'), 'wali_kelas'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('piket'), 'piket'),
  (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('operator'), 'operator')
on conflict do nothing;
update public.pengaturan_absensi set hari_sekolah = '{1,2,3,4,5,6,7}';
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000000a1', '2099/2100', true);
insert into public.pegawai (id, nama, user_id) values ('00000000-0000-0000-0000-0000000000b1', 'Wali Uji', pg_temp.uid('walikelas'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama, wali_kelas_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-2', null);
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '9990000001', 'Anak Ortu', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000000d2', '9990000002', 'Anak Lain', null),
  ('00000000-0000-0000-0000-0000000000d3', '9990000003', 'Tanpa Akun', null);
insert into public.anggota_kelas (siswa_id, kelas_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1');
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-0000000000e1', 'Ortu Uji', pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'ibu');

-- ---------- ORANG TUA ----------
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  insert into public.izin_ortu (siswa_id, jenis, tanggal_mulai, tanggal_selesai, alasan, status, diajukan_oleh)
  values ('00000000-0000-0000-0000-0000000000d1', 'S', public.hari_ini(), public.hari_ini() + 1, 'Demam, istirahat di rumah', 'diterima', '00000000-0000-0000-0000-000000000000');
  if (select status from public.izin_ortu limit 1) <> 'menunggu' then raise exception 'GAGAL: ortu bisa langsung menyetujui izinnya'; end if;
  if (select diajukan_oleh from public.izin_ortu limit 1) <> auth.uid() then raise exception 'GAGAL: pengaju bisa dipalsukan'; end if;
  begin
    insert into public.izin_ortu (siswa_id, jenis, tanggal_mulai, tanggal_selesai, alasan) values ('00000000-0000-0000-0000-0000000000d2', 'I', public.hari_ini(), public.hari_ini(), 'Coba anak orang lain');
    raise exception 'GAGAL: ortu mengajukan izin untuk anak orang lain';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.izin_ortu (siswa_id, jenis, tanggal_mulai, tanggal_selesai, alasan) values ('00000000-0000-0000-0000-0000000000d1', 'I', public.hari_ini() - 10, public.hari_ini() - 10, 'Izin terlambat sekali');
    raise exception 'GAGAL: izin mundur >3 hari diterima';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.proses_izin_ortu((select id from public.izin_ortu limit 1), true);
    raise exception 'GAGAL: ortu memproses izin sendiri';
  exception when insufficient_privilege then null; end;
  begin
    update public.izin_ortu set status = 'diterima';
    if (select status from public.izin_ortu limit 1) = 'diterima' then raise exception 'GAGAL: ortu mengubah status izin'; end if;
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.siswa) <> 1 then raise exception 'GAGAL: ortu melihat siswa selain anaknya'; end if;
  begin
    perform public.daftarkan_akun_portal(auth.uid(), 'siswa', '00000000-0000-0000-0000-0000000000d3', 'x@y.z');
    raise exception 'GAGAL: ortu bisa mendaftarkan akun';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: orang tua (izin anak sendiri, tidak bisa menyetujui)';
end $$;
reset role;

-- ---------- GURU (bukan wali) ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.izin_ortu) <> 0 then raise exception 'GAGAL: guru biasa melihat izin ortu'; end if;
  begin
    perform public.proses_izin_ortu((select id from public.izin_ortu limit 1), true);
    raise exception 'GAGAL: guru biasa memproses izin';
  exception when insufficient_privilege or no_data_found then null; end;
  raise notice 'LULUS: guru';
end $$;
reset role;

-- ---------- WALI KELAS ----------
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare n int; begin
  if (select count(*) from public.izin_ortu) <> 1 then raise exception 'GAGAL: wali kelas tidak melihat izin siswanya'; end if;
  n := public.proses_izin_ortu((select id from public.izin_ortu limit 1), true, 'Semoga lekas sembuh');
  if n <> 2 then raise exception 'GAGAL: izin 2 hari harus mengisi 2 hari absensi (hasil %)', n; end if;
  if (select count(*) from public.absensi_siswa where siswa_id = '00000000-0000-0000-0000-0000000000d1' and status = 'S') <> 2 then
    raise exception 'GAGAL: absensi sakit tidak terisi otomatis'; end if;
  begin
    perform public.proses_izin_ortu((select id from public.izin_ortu limit 1), false);
    raise exception 'GAGAL: izin diproses dua kali';
  exception when check_violation then null; end;
  raise notice 'LULUS: wali kelas (terima izin → absensi terisi)';
end $$;
reset role;

-- ---------- SISWA ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin
    insert into public.izin_ortu (siswa_id, jenis, tanggal_mulai, tanggal_selesai, alasan) values ('00000000-0000-0000-0000-0000000000d1', 'I', public.hari_ini(), public.hari_ini(), 'Siswa izin sendiri');
    raise exception 'GAGAL: siswa mengajukan izin sendiri (harus orang tua)';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa';
end $$;
reset role;

-- ---------- OPERATOR: daftarkan akun ----------
-- akun login baru khusus uji (belum punya data pengguna)
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000004f1', 'uji-portal-1@sman22.test'), ('00000000-0000-0000-0000-0000000004f2', 'uji-portal-2@sman22.test');
create temp table uji_uid as select '00000000-0000-0000-0000-0000000004f1'::uuid as guru, '00000000-0000-0000-0000-0000000004f2'::uuid as piket;
grant select on uji_uid to authenticated;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ begin
  if (select count(*) from public.status_akun_portal('00000000-0000-0000-0000-0000000000c1')) <> 2 then raise exception 'GAGAL: status akun portal'; end if;
  perform public.daftarkan_akun_portal((select guru from uji_uid), 'orang_tua', '00000000-0000-0000-0000-0000000000d3', 'ortu-baru@x.test');
  if not (select akun_ortu from public.status_akun_portal('00000000-0000-0000-0000-0000000000c1') where nisn = '9990000003') then
    raise exception 'GAGAL: akun ortu tidak tertaut'; end if;
  begin
    perform public.daftarkan_akun_portal((select piket from uji_uid), 'siswa', '00000000-0000-0000-0000-0000000000d1', 'dup@x.test');
    raise exception 'GAGAL: siswa yang sudah punya akun didaftarkan lagi';
  exception when unique_violation then null; end;
  raise notice 'LULUS: operator (akun portal)';
end $$;
reset role;

rollback;
