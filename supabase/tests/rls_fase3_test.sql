-- Uji hak akses Fase 3 (absensi & disiplin). Jalankan di database UJI.
-- Akun: walikelas@, guru@, piket@, kesiswaan@, siswa@, ortu@ (domain sman22.test).
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

-- ---------- data uji ----------
insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['walikelas','guru','piket','kesiswaan','siswa','ortu']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('walikelas'), 'wali_kelas'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('piket'), 'piket'),
  (pg_temp.uid('kesiswaan'), 'kesiswaan'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua')
on conflict do nothing;
update public.pengaturan_absensi set hari_sekolah = '{1,2,3,4,5,6,7}', jam_pulang_mulai = '00:00';
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif, mulai_hitung_absensi) values ('00000000-0000-0000-0000-0000000000a1', '2099/2100', true, public.hari_ini() - 60);
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'Wali Uji', pg_temp.uid('walikelas')),
  ('00000000-0000-0000-0000-0000000000b2', 'Guru Uji', pg_temp.uid('guru'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama, wali_kelas_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-2', null);
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '9990000001', 'Siswa Perwalian', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000000d2', '9990000002', 'Siswa Kelas Lain', null);
insert into public.anggota_kelas (siswa_id, kelas_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2');
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-0000000000e1', 'Ortu Uji', pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'ibu');
-- dua alpa lama (dicatat admin sistem)
insert into public.absensi_siswa (siswa_id, tanggal, status, sumber) values
  ('00000000-0000-0000-0000-0000000000d1', public.awal_minggu_ini() - 10, 'A', 'admin'),
  ('00000000-0000-0000-0000-0000000000d1', public.awal_minggu_ini() - 9, 'A', 'admin');

-- ---------- WALI KELAS ----------
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare n int; v uuid; begin
  insert into public.absensi_siswa (siswa_id, tanggal, status, dicatat_oleh)
  values ('00000000-0000-0000-0000-0000000000d1', public.hari_ini(), 'A', '00000000-0000-0000-0000-000000000000');
  select dicatat_oleh into v from public.absensi_siswa where siswa_id = '00000000-0000-0000-0000-0000000000d1' and tanggal = public.hari_ini();
  if v <> auth.uid() then raise exception 'GAGAL: pencatat bisa dipalsukan'; end if;
  insert into public.absensi_kelas_harian (kelas_id, tanggal) values ('00000000-0000-0000-0000-0000000000c1', public.hari_ini());
  begin
    insert into public.absensi_siswa (siswa_id, tanggal, status) values ('00000000-0000-0000-0000-0000000000d2', public.hari_ini(), 'A');
    raise exception 'GAGAL: wali kelas mencatat siswa kelas lain';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.absensi_siswa (siswa_id, tanggal, status) values ('00000000-0000-0000-0000-0000000000d1', public.awal_minggu_ini() - 1, 'S');
    raise exception 'GAGAL: wali kelas mencatat minggu lalu langsung';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.absensi_siswa (siswa_id, tanggal, status) values ('00000000-0000-0000-0000-0000000000d1', public.hari_ini() + 1, 'S');
    raise exception 'GAGAL: tanggal masa depan diterima';
  exception when insufficient_privilege then null; end;
  update public.absensi_siswa set status = 'S' where siswa_id = '00000000-0000-0000-0000-0000000000d1' and tanggal = public.awal_minggu_ini() - 10;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: wali kelas mengubah absensi minggu lalu'; end if;
  insert into public.pengajuan_koreksi (siswa_id, tanggal, status_baru, alasan, status_lama)
  values ('00000000-0000-0000-0000-0000000000d1', public.awal_minggu_ini() - 10, 'S', 'Ada surat dokter yang baru diserahkan', 'T');
  if (select status_lama from public.pengajuan_koreksi where alasan like 'Ada surat%') <> 'A' then
    raise exception 'GAGAL: status lama pengajuan bisa dipalsukan'; end if;
  begin
    insert into public.pengajuan_koreksi (siswa_id, tanggal, status_baru, alasan) values ('00000000-0000-0000-0000-0000000000d2', public.hari_ini() - 1, 'S', 'Coba kelas lain');
    raise exception 'GAGAL: pengajuan untuk siswa kelas lain';
  exception when insufficient_privilege then null; end;
  begin
    perform public.putuskan_pengajuan((select id from public.pengajuan_koreksi limit 1), true);
    raise exception 'GAGAL: wali kelas menyetujui pengajuannya sendiri';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.status_disiplin() where label = 'SP 1') <> 1 then raise exception 'GAGAL: wali kelas tidak melihat status SP siswanya'; end if;
  begin
    insert into public.tindak_lanjut_disiplin (siswa_id, tahun_ajaran_id, jenis, ambang, label, jumlah_saat_itu, catatan)
    values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'alpa', 3, 'SP 1', 3, 'coba');
    raise exception 'GAGAL: wali kelas mengonfirmasi SP';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: wali kelas (jendela minggu ini, kelas sendiri, pengajuan)';
end $$;
reset role;

-- ---------- PIKET ----------
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  insert into public.absensi_siswa (siswa_id, tanggal, status, jam, sumber) values ('00000000-0000-0000-0000-0000000000d2', public.hari_ini(), 'T', '07:31', 'piket');
  insert into public.absensi_siswa (siswa_id, tanggal, status, sumber) values ('00000000-0000-0000-0000-0000000000d2', public.awal_minggu_ini() - 20, 'T', 'piket');
  perform public.putuskan_pengajuan((select id from public.pengajuan_koreksi where status = 'menunggu' and siswa_id = '00000000-0000-0000-0000-0000000000d1' limit 1), true, 'Surat valid');
  if (select status from public.absensi_siswa where siswa_id = '00000000-0000-0000-0000-0000000000d1' and tanggal = public.awal_minggu_ini() - 10) <> 'S' then
    raise exception 'GAGAL: persetujuan koreksi tidak diterapkan'; end if;
  begin
    perform public.putuskan_pengajuan((select id from public.pengajuan_koreksi where siswa_id = '00000000-0000-0000-0000-0000000000d1' limit 1), false);
    raise exception 'GAGAL: pengajuan diputuskan dua kali';
  exception when check_violation then null; end;
  if (select count(*) from public.siswa) < 2 then raise exception 'GAGAL: piket tidak bisa mencari siswa'; end if;
  begin
    perform public.atur_mulai_hitung('00000000-0000-0000-0000-0000000000a1', current_date);
    raise exception 'GAGAL: piket mengubah tanggal mulai hitung';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: piket';
end $$;
reset role;

-- ---------- KESISWAAN ----------
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ begin
  -- alpa: 1 (lama, sisa) + 1 hari ini = 2 (satu dikoreksi jadi S) → belum SP; tambah satu lagi
  insert into public.absensi_siswa (siswa_id, tanggal, status, sumber) values ('00000000-0000-0000-0000-0000000000d1', public.awal_minggu_ini() - 3, 'A', 'admin');
  if (select count(*) from public.status_disiplin() where siswa_id = '00000000-0000-0000-0000-0000000000d1' and label = 'SP 1' and not dikonfirmasi) <> 1 then
    raise exception 'GAGAL: SP 1 tidak muncul setelah 3 alpa'; end if;
  insert into public.tindak_lanjut_disiplin (siswa_id, tahun_ajaran_id, jenis, ambang, label, jumlah_saat_itu, catatan)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'alpa', 3, 'SP 1', 3, 'Orang tua sudah dipanggil, siswa berjanji hadir');
  if (select count(*) from public.status_disiplin() where label = 'SP 1' and dikonfirmasi) <> 1 then raise exception 'GAGAL: konfirmasi SP tidak tercatat'; end if;
  perform public.atur_mulai_hitung('00000000-0000-0000-0000-0000000000a1', public.hari_ini() - 60);
  if (select count(*) from public.rekap_absensi_kelas('00000000-0000-0000-0000-0000000000c1', public.hari_ini() - 30, public.hari_ini())) <> 1 then
    raise exception 'GAGAL: rekap kelas'; end if;
  raise notice 'LULUS: kesiswaan (SP otomatis, konfirmasi, rekap)';
end $$;
reset role;

-- ---------- GURU (bukan wali) ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.absensi_siswa) <> 0 then raise exception 'GAGAL: guru biasa melihat absensi siswa'; end if;
  if (select count(*) from public.status_disiplin()) <> 0 then raise exception 'GAGAL: guru biasa melihat status disiplin'; end if;
  perform public.presensi_saya('masuk');
  if (select count(*) from public.absensi_pegawai where pegawai_id = '00000000-0000-0000-0000-0000000000b2') <> 1 then raise exception 'GAGAL: presensi masuk'; end if;
  begin
    perform public.presensi_saya('masuk');
    raise exception 'GAGAL: presensi masuk dua kali';
  exception when unique_violation then null; end;
  begin
    insert into public.absensi_pegawai (pegawai_id, tanggal, jam_masuk) values ('00000000-0000-0000-0000-0000000000b2', public.hari_ini() - 1, '06:00');
    raise exception 'GAGAL: guru menulis jam presensi sendiri';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.absensi_pegawai) <> 1 then raise exception 'GAGAL: guru melihat presensi guru lain'; end if;
  perform public.presensi_saya('pulang');
  raise notice 'LULUS: guru (presensi mandiri jam server, tidak melihat data siswa)';
end $$;
reset role;

-- ---------- SISWA & ORANG TUA ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.absensi_siswa where siswa_id <> '00000000-0000-0000-0000-0000000000d1') <> 0 then raise exception 'GAGAL: siswa melihat absensi siswa lain'; end if;
  if (select count(*) from public.absensi_siswa) < 1 then raise exception 'GAGAL: siswa tidak melihat absensinya sendiri'; end if;
  begin
    insert into public.absensi_siswa (siswa_id, tanggal, status) values ('00000000-0000-0000-0000-0000000000d1', public.hari_ini() - 1, 'I');
    raise exception 'GAGAL: siswa mengisi absensinya sendiri';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if (select count(*) from public.tindak_lanjut_disiplin) <> 1 then raise exception 'GAGAL: ortu tidak melihat tindak lanjut anaknya'; end if;
  if (select count(*) from public.absensi_siswa where siswa_id = '00000000-0000-0000-0000-0000000000d2') <> 0 then raise exception 'GAGAL: ortu melihat siswa lain'; end if;
  raise notice 'LULUS: orang tua';
end $$;
reset role;

set local role anon;
do $$ begin
  begin
    perform 1 from public.absensi_siswa;
    raise exception 'GAGAL: anon membaca absensi';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: anon';
end $$;
reset role;

rollback;
