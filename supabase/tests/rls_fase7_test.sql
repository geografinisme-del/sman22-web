-- Uji hak akses Fase 7 (kesiswaan & notifikasi). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['guru','walikelas','kesiswaan','siswa','ortu','piket']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('walikelas'), 'wali_kelas'), (pg_temp.uid('kesiswaan'), 'kesiswaan'),
  (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('piket'), 'bk')
on conflict do nothing;
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000007a1', '2096/2097', true);
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000007b1', 'Guru Mapel K', pg_temp.uid('guru')),
  ('00000000-0000-0000-0000-0000000007b2', 'Wali K', pg_temp.uid('walikelas'))
on conflict (user_id) do nothing;
create temp table k7 as select (select id from public.pegawai where user_id = pg_temp.uid('walikelas')) as wali;
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama, wali_kelas_id)
values ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007a1', 'X', 'K-1', (select wali from k7));
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000007d1', '9970000001', 'Siswa K', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000007d2', '9970000002', 'Siswa Lain K', null);
insert into public.anggota_kelas (siswa_id, kelas_id) values
  ('00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007c1'),
  ('00000000-0000-0000-0000-0000000007d2', '00000000-0000-0000-0000-0000000007c1');
insert into public.orang_tua (id, nama, user_id, telepon) values ('00000000-0000-0000-0000-0000000007e1', 'Ortu K', pg_temp.uid('ortu'), '0812-3456-7890')
on conflict (user_id) do update set telepon = excluded.telepon;
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-0000000007d1', (select id from public.orang_tua where user_id = pg_temp.uid('ortu')), 'ibu');
insert into public.jenis_pelanggaran (id, nama, kategori, poin) values ('00000000-0000-0000-0000-0000000007f1', 'Uji pelanggaran 30 poin', 'sedang', 30);
delete from public.notifikasi; delete from public.antrian_kirim;
grant select on k7 to authenticated;

-- ---------- GURU melapor ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  insert into public.pelanggaran_siswa (id, siswa_id, jenis_id, poin, status, tanggal, kronologi, saksi)
  values ('00000000-0000-0000-0000-000000000771', '00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007f1', 999, 'terverifikasi',
          public.hari_ini(), 'Terlihat merokok di belakang kantin saat istirahat', 'Pak Satpam');
  if (select poin from public.pelanggaran_siswa where id = '00000000-0000-0000-0000-000000000771') <> 30 then raise exception 'GAGAL: poin bisa dipalsukan'; end if;
  if (select status from public.pelanggaran_siswa where id = '00000000-0000-0000-0000-000000000771') <> 'dilaporkan' then raise exception 'GAGAL: status bisa dipalsukan'; end if;
  begin
    insert into public.pelanggaran_siswa (siswa_id, jenis_id, tanggal, kronologi) values ('00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007f1', public.hari_ini() + 1, 'Kejadian di masa depan');
    raise exception 'GAGAL: tanggal masa depan diterima';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.verifikasi_pelanggaran('00000000-0000-0000-0000-000000000771', true);
    raise exception 'GAGAL: guru memverifikasi';
  exception when insufficient_privilege then null; end;
  begin
    update public.pelanggaran_siswa set poin = 1;
    raise exception 'GAGAL: guru mengubah catatan';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.pelanggaran_siswa) <> 1 then raise exception 'GAGAL: guru harus hanya melihat laporannya sendiri'; end if;
  if (select count(*) from public.cari_siswa('Siswa K')) < 1 then raise exception 'GAGAL: guru tidak bisa mencari siswa'; end if;
  begin
    perform public.kirim_notif(auth.uid(), 'x', 'palsu');
    raise exception 'GAGAL: pengguna bisa membuat notifikasi sendiri';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru (lapor pelanggaran, poin & status tidak bisa dipalsukan)';
end $$;
reset role;

-- ---------- SISWA ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  begin
    insert into public.pelanggaran_siswa (siswa_id, jenis_id, tanggal, kronologi) values ('00000000-0000-0000-0000-0000000007d2', '00000000-0000-0000-0000-0000000007f1', public.hari_ini(), 'Siswa melaporkan teman');
    raise exception 'GAGAL: siswa melaporkan pelanggaran';
  exception when insufficient_privilege then null; end;
  insert into public.prestasi_siswa (siswa_id, nama_kegiatan, bidang, tingkat, peringkat, tanggal, poin, status)
  values ('00000000-0000-0000-0000-0000000007d1', 'Olimpiade Geografi Kota', 'akademik', 'kota', 'juara1', public.hari_ini(), 500, 'terverifikasi');
  if (select poin from public.prestasi_siswa where siswa_id = '00000000-0000-0000-0000-0000000007d1' limit 1) <> 15 or (select status from public.prestasi_siswa where siswa_id = '00000000-0000-0000-0000-0000000007d1' limit 1) <> 'diajukan' then
    raise exception 'GAGAL: poin/status prestasi bisa dipalsukan'; end if;
  begin
    insert into public.prestasi_siswa (siswa_id, nama_kegiatan, bidang, tingkat, peringkat, tanggal)
    values ('00000000-0000-0000-0000-0000000007d2', 'Atas nama teman', 'seni', 'kota', 'juara1', public.hari_ini());
    raise exception 'GAGAL: siswa mengajukan prestasi orang lain';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.pelanggaran_siswa) then raise exception 'GAGAL: siswa membaca tabel pelanggaran langsung'; end if;
  raise notice 'LULUS: siswa (ajukan prestasi sendiri, tidak bisa melapor/membaca pelanggaran mentah)';
end $$;
reset role;

-- ---------- KESISWAAN memverifikasi ----------
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare baru uuid; begin
  perform public.verifikasi_pelanggaran('00000000-0000-0000-0000-000000000771', true, 'Sudah dikonfirmasi');
  perform public.verifikasi_prestasi((select id from public.prestasi_siswa where siswa_id = '00000000-0000-0000-0000-0000000007d1' limit 1), true);
  baru := public.ubah_jenis_pelanggaran('00000000-0000-0000-0000-0000000007f1', 'Uji pelanggaran 30 poin', 'sedang', 40::smallint);
  if (select poin from public.pelanggaran_siswa where id = '00000000-0000-0000-0000-000000000771') <> 30 then raise exception 'GAGAL: perubahan aturan mengubah riwayat'; end if;
  if (select versi from public.jenis_pelanggaran where id = baru) <> 2 then raise exception 'GAGAL: versi aturan'; end if;
  if (select poin_bersih from public.rekap_poin() where siswa_id = '00000000-0000-0000-0000-0000000007d1') <> 30 then raise exception 'GAGAL: rekap poin'; end if;
  if (select tindakan from public.rekap_poin() where siswa_id = '00000000-0000-0000-0000-0000000007d1') <> 'Pembinaan oleh wali kelas' then raise exception 'GAGAL: tindakan sesuai poin'; end if;
  raise notice 'LULUS: kesiswaan (verifikasi, aturan berversi, rekap poin)';
end $$;
reset role;

-- ---------- NOTIFIKASI ----------
do $$ begin
  if (select count(*) from public.notifikasi where user_id = pg_temp.uid('ortu') and kategori = 'kesiswaan') <> 1 then raise exception 'GAGAL: ortu tidak diberi tahu pelanggaran'; end if;
  if exists (select 1 from public.notifikasi where user_id = pg_temp.uid('ortu') and (isi like '%merokok%' or isi like '%Satpam%')) then raise exception 'GAGAL: rincian/saksi bocor di notifikasi ortu'; end if;
  if (select count(*) from public.notifikasi where user_id = pg_temp.uid('walikelas') and kategori = 'disiplin') <> 1 then raise exception 'GAGAL: ambang 25 poin tidak memicu notifikasi wali'; end if;
  if (select count(*) from public.notifikasi where user_id = pg_temp.uid('ortu') and kategori = 'prestasi') <> 1 then raise exception 'GAGAL: ortu tidak diberi selamat prestasi'; end if;
  if (select count(*) from public.notifikasi where user_id = pg_temp.uid('kesiswaan') and kategori in ('kesiswaan', 'prestasi')) < 2 then raise exception 'GAGAL: kesiswaan tidak diberi tahu laporan baru'; end if;
  if not exists (select 1 from public.antrian_kirim where user_id = pg_temp.uid('ortu') and kanal = 'whatsapp' and tujuan = '6281234567890') then
    raise exception 'GAGAL: WhatsApp ortu tidak masuk antrian / nomor tidak dibakukan'; end if;
  if exists (select 1 from public.antrian_kirim where user_id = pg_temp.uid('siswa') and kanal = 'email') then raise exception 'GAGAL: siswa dikirimi email'; end if;
  perform public.kirim_notif(pg_temp.uid('ortu'), 'kesiswaan', 'Kedua', 'spam?');
  if (select count(*) from public.antrian_kirim where user_id = pg_temp.uid('ortu') and kanal = 'whatsapp' and kategori = 'kesiswaan') <> 1 then
    raise exception 'GAGAL: anti-spam (10 menit) tidak bekerja'; end if;
  raise notice 'LULUS: notifikasi (privasi, ambang poin, WhatsApp, anti-spam)';
end $$;

-- ---------- ORANG TUA ----------
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ declare r jsonb; begin
  r := public.rekap_karakter('00000000-0000-0000-0000-0000000007d1');
  if jsonb_array_length(r->'pelanggaran') <> 1 or jsonb_array_length(r->'prestasi') <> 1 then raise exception 'GAGAL: rekap karakter (%)', r; end if;
  if r::text like '%Satpam%' or r::text like '%merokok%' then raise exception 'GAGAL: saksi/kronologi bocor ke ortu'; end if;
  begin
    perform public.rekap_karakter('00000000-0000-0000-0000-0000000007d2');
    raise exception 'GAGAL: ortu melihat siswa lain';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.notifikasi) <> (select count(*) from public.notifikasi where user_id = auth.uid()) then raise exception 'GAGAL: melihat notifikasi orang lain'; end if;
  perform public.tandai_dibaca();
  if exists (select 1 from public.notifikasi where dibaca_pada is null) then raise exception 'GAGAL: tandai dibaca'; end if;
  begin
    perform public.ambil_antrian(5);
    raise exception 'GAGAL: pengguna mengambil antrian kirim';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.antrian_kirim) then raise exception 'GAGAL: ortu membaca antrian'; end if;
  raise notice 'LULUS: orang tua (rekap aman, notifikasi milik sendiri)';
end $$;
reset role;

-- ---------- WALI, RUJUKAN BK ----------
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  insert into public.pembinaan_siswa (siswa_id, jenis, tanggal, uraian) values ('00000000-0000-0000-0000-0000000007d1', 'bimbingan_wali', public.hari_ini(), 'Bimbingan tentang bahaya rokok');
  insert into public.rujukan_bk (siswa_id, alasan) values ('00000000-0000-0000-0000-0000000007d1', 'Perlu pendampingan berhenti merokok');
  if exists (select 1 from public.rujukan_bk) then raise exception 'GAGAL: wali membaca isi rujukan BK'; end if;
  if (select count(*) from public.status_rujukan_saya() where siswa = 'Siswa K') <> 1 then raise exception 'GAGAL: perujuk tidak melihat status'; end if;
  if (select count(*) from public.pelanggaran_siswa) < 1 then raise exception 'GAGAL: wali tidak melihat pelanggaran siswanya'; end if;
  raise notice 'LULUS: wali kelas (pembinaan & rujukan BK)';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin
    insert into public.pembinaan_siswa (siswa_id, jenis, tanggal, uraian) values ('00000000-0000-0000-0000-0000000007d1', 'lainnya', public.hari_ini(), 'Guru mapel mencoba');
    raise exception 'GAGAL: guru mapel mencatat pembinaan';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru mapel tidak mencatat pembinaan';
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  if (select count(*) from public.rujukan_bk where siswa_id = '00000000-0000-0000-0000-0000000007d1') <> 1 then raise exception 'GAGAL: BK tidak melihat rujukan'; end if;
  update public.rujukan_bk set status = 'ditangani', catatan_bk = 'Sesi 1 terjadwal' where siswa_id = '00000000-0000-0000-0000-0000000007d1';
  raise notice 'LULUS: BK (menangani rujukan)';
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.notifikasi where user_id = pg_temp.uid('walikelas') and kategori = 'bk' and judul like '%ditangani%') then
    raise exception 'GAGAL: perujuk tidak diberi tahu'; end if;
  raise notice 'LULUS: notifikasi rujukan BK';
end $$;

-- ---------- AMBANG ALPA → NOTIFIKASI ORTU ----------
delete from public.absensi_siswa where siswa_id = '00000000-0000-0000-0000-0000000007d1';
insert into public.absensi_siswa (siswa_id, tanggal, status) select '00000000-0000-0000-0000-0000000007d1', public.hari_ini() - g, 'A' from generate_series(1, 3) g;
do $$ begin
  if not exists (select 1 from public.notifikasi where user_id = pg_temp.uid('ortu') and kategori = 'disiplin' and prioritas = 'penting') then
    raise exception 'GAGAL: alpa 3× tidak memberi tahu orang tua'; end if;
  raise notice 'LULUS: alpa mencapai ambang SP → orang tua & wali diberi tahu';
end $$;

rollback;
