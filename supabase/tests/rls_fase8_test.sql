-- Uji hak akses Fase 8 (MFA wajib, kalender, tukar jam). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text, aal text default 'aal2') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', aal)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['admin','humas','guru','walikelas','piket','siswa']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('admin'), 'super_admin'), (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('humas'), 'kurikulum'),
  (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('walikelas'), 'guru'), (pg_temp.uid('piket'), 'piket'), (pg_temp.uid('siswa'), 'siswa')
on conflict do nothing;
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000008a1', '2094/2095', true);
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000008b1', 'Guru Tukar A', pg_temp.uid('guru')),
  ('00000000-0000-0000-0000-0000000008b2', 'Guru Tukar B', pg_temp.uid('walikelas'))
on conflict (user_id) do nothing;
create temp table k8 as select
  (select id from public.pegawai where user_id = pg_temp.uid('guru')) as a,
  (select id from public.pegawai where user_id = pg_temp.uid('walikelas')) as b,
  (public.hari_ini() + 7 + ((8 - extract(isodow from public.hari_ini())::int) % 7))::date as senin;
grant select on k8 to authenticated;
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama) values ('00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008a1', 'X', 'T-1');
insert into public.siswa (id, nisn, nama, user_id) values ('00000000-0000-0000-0000-0000000008d1', '9980000001', 'Siswa T', null);
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
update public.siswa set user_id = pg_temp.uid('siswa') where id = '00000000-0000-0000-0000-0000000008d1';
insert into public.anggota_kelas (siswa_id, kelas_id, tahun_ajaran_id) values
  ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008a1');
insert into public.mapel (id, nama) values ('00000000-0000-0000-0000-0000000008e1', 'Geo Tukar'), ('00000000-0000-0000-0000-0000000008e2', 'Sej Tukar');
delete from public.hari_libur where tanggal between (select senin from k8) and (select senin from k8) + 14;
select pg_temp.sebagai('humas'); set local role authenticated;
select public.atur_jam_hari(1::smallint, '[{"jenis":"pelajaran","jam_mulai":"07:00","jam_selesai":"07:40"},
  {"jenis":"pelajaran","jam_mulai":"07:40","jam_selesai":"08:20"},{"jenis":"pelajaran","jam_mulai":"08:20","jam_selesai":"09:00"}]');
insert into public.penugasan_mengajar (id, kelas_id, mapel_id, pegawai_id, jp_per_minggu) values
  ('00000000-0000-0000-0000-0000000008f1', '00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008e1', (select a from k8), 1),
  ('00000000-0000-0000-0000-0000000008f2', '00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008e2', (select b from k8), 1);
select public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000008c1',
  '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000008f1"},{"hari":1,"jp_ke":2,"penugasan_id":"00000000-0000-0000-0000-0000000008f2"}]');
reset role;
create temp table j8 as select
  (select id from public.jadwal where kelas_id = '00000000-0000-0000-0000-0000000008c1' and jp_ke = 1) as ja,
  (select id from public.jadwal where kelas_id = '00000000-0000-0000-0000-0000000008c1' and jp_ke = 2) as jb;
grant select on j8 to authenticated;
delete from public.notifikasi; delete from public.antrian_kirim;

-- ---------- MFA WAJIB ----------
select pg_temp.sebagai('admin', 'aal1'); set local role authenticated;
do $$ declare a jsonb := public.akses_saya(); begin
  if public.punya_izin('pengguna.kelola') then raise exception 'GAGAL: super admin AAL1 masih punya izin'; end if;
  if public.punya_peran('super_admin') then raise exception 'GAGAL: peran super admin aktif tanpa MFA'; end if;
  if not (a -> 'peran_tertunda') ? 'super_admin' then raise exception 'GAGAL: akses_saya tidak menandai peran tertunda: %', a; end if;
  if jsonb_array_length(a -> 'izin') <> 0 then raise exception 'GAGAL: izin tetap keluar pada AAL1'; end if;
  begin
    insert into public.pengguna_peran (user_id, peran) values (pg_temp.uid('guru'), 'super_admin');
    raise exception 'GAGAL: AAL1 memberi peran super admin';
  exception when insufficient_privilege then null; end;
  begin
    perform public.atur_wajib_mfa('operator', true);
    raise exception 'GAGAL: AAL1 mengatur MFA';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.audit_log) > 0 then raise exception 'GAGAL: AAL1 bisa baca audit'; end if;
  raise notice 'LULUS: super admin tanpa verifikasi dua langkah tidak punya hak admin';
end $$;
reset role;
select pg_temp.sebagai('admin', 'aal2'); set local role authenticated;
do $$ begin
  if not public.punya_izin('pengguna.kelola') then raise exception 'GAGAL: super admin AAL2 kehilangan izin'; end if;
  perform public.atur_wajib_mfa('kurikulum', true);
  begin
    perform public.atur_wajib_mfa('super_admin', false);
    raise exception 'GAGAL: MFA super admin bisa dimatikan';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.atur_wajib_mfa('siswa', true);
    raise exception 'GAGAL: MFA untuk siswa diterima';
  exception when invalid_parameter_value then null; end;
  begin
    update public.peran set wajib_mfa = false where kode = 'super_admin';
    raise exception 'GAGAL: tabel peran bisa diubah langsung';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: super admin AAL2 mengatur peran wajib MFA';
end $$;
reset role;
select pg_temp.sebagai('humas', 'aal1'); set local role authenticated;
do $$ begin
  if public.punya_izin('jadwal.kelola') then raise exception 'GAGAL: kurikulum (wajib MFA) AAL1 masih kelola jadwal'; end if;
  if not public.punya_izin('konten.kelola') then raise exception 'GAGAL: peran humas (tidak wajib MFA) ikut hilang'; end if;
  raise notice 'LULUS: hanya izin dari peran wajib MFA yang ditahan';
end $$;
reset role;
update public.peran set wajib_mfa = false where kode = 'kurikulum';

-- ---------- PERISTIWA KEAMANAN ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  perform public.catat_keamanan('sandi_diubah');
  begin
    perform public.catat_keamanan('mfa_direset');
    raise exception 'GAGAL: peristiwa admin dicatat oleh diri sendiri';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.catat_keamanan_pengguna(pg_temp.uid('walikelas'), 'sandi_direset');
    raise exception 'GAGAL: guru mencatat reset sandi orang lain';
  exception when insufficient_privilege then null; end;
  begin
    perform public.catat_aktivitas('auth', 'HAPUS_SEMUA');
    raise exception 'GAGAL: aksi bebas diterima';
  exception when invalid_parameter_value then null; end;
  perform public.catat_aktivitas('auth', 'LOGIN');
  raise notice 'LULUS: peristiwa keamanan akun sendiri';
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.notifikasi where user_id = pg_temp.uid('guru') and kategori = 'keamanan' and prioritas = 'penting') then
    raise exception 'GAGAL: tidak ada pemberitahuan ganti sandi'; end if;
  if (select count(*) from public.audit_log where user_id = pg_temp.uid('guru') and aksi in ('KEAMANAN', 'LOGIN')) < 2 then
    raise exception 'GAGAL: peristiwa tidak tercatat di log'; end if;
  raise notice 'LULUS: audit & notifikasi keamanan';
end $$;

-- ---------- KALENDER ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare id1 uuid; s date := (select senin from k8); begin
  insert into public.kegiatan_kalender (judul, jenis, mulai, selesai, sasaran, kbm_libur)
  values ('Libur Uji Kalender', 'libur', s + 7, s + 13, 'umum', true) returning id into id1;
  if (select count(*) from public.hari_libur where kegiatan_id = id1) <> 6 then raise exception 'GAGAL: hari libur KBM tidak tersinkron (Minggu dilewati)'; end if;
  update public.kegiatan_kalender set selesai = s + 8 where id = id1;
  if (select count(*) from public.hari_libur where kegiatan_id = id1) <> 2 then raise exception 'GAGAL: ubah tanggal tidak menyinkronkan libur'; end if;
  update public.kegiatan_kalender set deleted_at = now() where id = id1;
  if exists (select 1 from public.hari_libur where kegiatan_id = id1) then raise exception 'GAGAL: libur tetap ada setelah kegiatan dihapus'; end if;
  insert into public.kegiatan_kalender (judul, jenis, mulai, selesai, sasaran) values
    ('Kalender Uji Umum', 'kegiatan', s, s, 'umum'), ('Kalender Uji Warga', 'ujian', s, s + 4, 'warga'), ('Kalender Uji Rapat', 'rapat', s, s, 'pegawai');
  begin
    insert into public.kegiatan_kalender (judul, jenis, mulai, selesai) values ('Terbalik', 'kegiatan', s + 2, s);
    raise exception 'GAGAL: rentang terbalik diterima';
  exception when check_violation then null; end;
  raise notice 'LULUS: kurikulum/humas mengelola kalender + sinkron libur';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.kegiatan_kalender where judul like 'Kalender Uji%') <> 1 then raise exception 'GAGAL: publik melihat kegiatan internal'; end if;
  raise notice 'LULUS: anon hanya melihat kegiatan umum';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.kegiatan_kalender where judul like 'Kalender Uji%') <> 2 then raise exception 'GAGAL: siswa harus melihat umum + warga'; end if;
  begin
    insert into public.kegiatan_kalender (judul, jenis, mulai, selesai) values ('Siswa iseng', 'libur', public.hari_ini(), public.hari_ini());
    raise exception 'GAGAL: siswa menambah kalender';
  exception when insufficient_privilege then null; end;
  if not exists (select 1 from public.notifikasi where judul like '%Kalender Uji Warga%') then raise exception 'GAGAL: siswa tidak diberi tahu ujian'; end if;
  raise notice 'LULUS: siswa melihat kalender warga, tidak bisa mengubah';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.kegiatan_kalender where judul like 'Kalender Uji%') <> 3 then raise exception 'GAGAL: guru harus melihat rapat pegawai'; end if;
  update public.kegiatan_kalender set judul = 'diubah guru' where judul = 'Kalender Uji Rapat';
  if exists (select 1 from public.kegiatan_kalender where judul = 'diubah guru') then raise exception 'GAGAL: guru mengubah kalender'; end if;
  raise notice 'LULUS: guru melihat semua, tidak bisa mengubah';
end $$;
reset role;

-- ---------- TUKAR JAM ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare s date := (select senin from k8); id1 uuid; begin
  begin
    perform public.ajukan_tukar_jadwal((select jb from j8), s, (select b from k8));
    raise exception 'GAGAL: mengajukan jam milik guru lain';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.ajukan_tukar_jadwal((select ja from j8), s + 1, (select b from k8), null, null, 'Rapat dinas');
    raise exception 'GAGAL: tanggal bukan hari Senin diterima';
  exception when invalid_parameter_value then null; end;
  id1 := public.ajukan_tukar_jadwal((select ja from j8), s, (select b from k8), (select jb from j8), s, 'Rapat MGMP tukar');
  begin
    perform public.ajukan_tukar_jadwal((select ja from j8), s, (select b from k8), null, null, 'Dobel');
    raise exception 'GAGAL: pengajuan ganda diterima';
  exception when unique_violation then null; end;
  begin
    insert into public.pengajuan_tukar_jadwal (pemohon_id, jadwal_pemohon, tanggal_pemohon, mitra_id, alasan)
    values ((select a from k8), (select ja from j8), s + 7, (select b from k8), 'langsung');
    raise exception 'GAGAL: insert langsung diterima';
  exception when insufficient_privilege then null; end;
  begin
    perform public.jawab_tukar_jadwal(id1, true);
    raise exception 'GAGAL: pemohon menjawab sendiri';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru mengajukan tukar jam';
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  begin
    perform public.putuskan_tukar_jadwal((select id from public.pengajuan_tukar_jadwal where alasan = 'Rapat MGMP tukar'), true);
    raise exception 'GAGAL: piket memutuskan tukar jam';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: piket tidak bisa menyetujui';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare t uuid := (select id from public.pengajuan_tukar_jadwal where alasan = 'Rapat MGMP tukar'); begin
  if not exists (select 1 from public.notifikasi where judul = 'Permintaan tukar jam') then raise exception 'GAGAL: mitra tidak diberi tahu'; end if;
  perform public.jawab_tukar_jadwal(t, true, 'Siap');
  if (select status from public.pengajuan_tukar_jadwal where id = t) <> 'menunggu_kurikulum' then raise exception 'GAGAL: status setelah diterima mitra'; end if;
  raise notice 'LULUS: mitra menerima';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare t uuid := (select id from public.pengajuan_tukar_jadwal where alasan = 'Rapat MGMP tukar'); begin
  if not exists (select 1 from public.notifikasi where judul = 'Pengajuan tukar jam menunggu persetujuan') then raise exception 'GAGAL: kurikulum tidak diberi tahu'; end if;
  begin
    perform public.putuskan_tukar_jadwal(t, false, '');
    raise exception 'GAGAL: tolak tanpa alasan';
  exception when invalid_parameter_value then null; end;
  perform public.putuskan_tukar_jadwal(t, true, 'OK');
  if (select count(*) from public.perubahan_jadwal where pengajuan_id = t) <> 2 then raise exception 'GAGAL: dua perubahan jadwal tidak terbentuk'; end if;
  if (select count(*) from public.riwayat_jadwal(50, 0, 'pengajuan_tukar_jadwal')) < 1 then raise exception 'GAGAL: riwayat jadwal kosong'; end if;
  raise notice 'LULUS: kurikulum menyetujui → jadwal berubah';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.notifikasi where judul = 'Tukar jam disetujui') then raise exception 'GAGAL: pemohon tidak diberi tahu'; end if;
  begin
    perform public.ajukan_tukar_jadwal((select ja from j8), (select senin from k8), (select b from k8), null, null, 'Lagi');
    raise exception 'GAGAL: slot yang sudah berubah diajukan lagi';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.riwayat_jadwal();
    raise exception 'GAGAL: guru membaca riwayat jadwal';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pemohon diberi tahu, slot terkunci';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.notifikasi where user_id = pg_temp.uid('siswa') and kategori = 'jadwal' and judul like 'Perubahan jadwal%') <> 2 then
    raise exception 'GAGAL: siswa kelas tidak diberi tahu perubahan'; end if;
  if exists (select 1 from public.antrian_kirim where user_id = pg_temp.uid('siswa')) then raise exception 'GAGAL: perubahan jadwal siswa dikirim lewat WA/email'; end if;
  if exists (select 1 from public.notifikasi where user_id = pg_temp.uid('walikelas') and judul like 'Tugas menggantikan%') then
    raise exception 'GAGAL: notifikasi ganda untuk tukar jam'; end if;
  raise notice 'LULUS: siswa kelas diberi tahu (lonceng saja)';
end $$;

rollback;
