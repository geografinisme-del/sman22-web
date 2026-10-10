-- Uji hak akses Fase 6 (CMS lanjutan & absensi lanjutan). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['humas','kesiswaan','guru','walikelas','siswa','ortu']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('kesiswaan'), 'kepala_sekolah'), (pg_temp.uid('guru'), 'guru'),
  (pg_temp.uid('walikelas'), 'guru'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua')
on conflict do nothing;
update public.pengaturan_situs set persetujuan_wajib = true;

-- ---------- CMS: humas ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  begin
    insert into public.berita (slug, judul, status) values ('uji-langsung-terbit', 'Uji langsung terbit', 'terbit');
    raise exception 'GAGAL: humas menerbitkan tanpa persetujuan';
  exception when insufficient_privilege then null; end;
  insert into public.berita (id, slug, judul, status, isi) values ('00000000-0000-0000-0000-000000000601', 'uji-diajukan', 'Uji diajukan', 'diajukan', 'versi 1');
  if (select diajukan_oleh from public.berita where id = '00000000-0000-0000-0000-000000000601') <> auth.uid() then raise exception 'GAGAL: pengaju tidak tercatat'; end if;
  update public.berita set isi = 'versi 2' where id = '00000000-0000-0000-0000-000000000601';
  if (select count(*) from public.berita_revisi where berita_id = '00000000-0000-0000-0000-000000000601') <> 1 then raise exception 'GAGAL: revisi tidak tersimpan'; end if;
  begin
    insert into public.berita_revisi (berita_id, data, status) values ('00000000-0000-0000-0000-000000000601', '{}', 'draft');
    raise exception 'GAGAL: revisi bisa dipalsukan';
  exception when insufficient_privilege then null; end;
  begin
    perform public.putuskan_berita('00000000-0000-0000-0000-000000000601', true);
    raise exception 'GAGAL: humas menyetujui sendiri';
  exception when insufficient_privilege then null; end;
  begin
    update public.pengaturan_situs set persetujuan_wajib = false;
    raise exception 'GAGAL: humas mematikan kewajiban persetujuan';
  exception when insufficient_privilege then null; end;
  update public.pengaturan_situs set hero_teks = 'Teks uji';
  insert into public.hero_slide (gambar_url, alt, aktif) values ('/images/gedung.jpg', 'Slide aktif uji', true), ('/images/gedung.jpg', 'Slide mati uji', false);
  insert into public.hero_slide (gambar_url, alt, tayang_mulai) values ('/images/gedung.jpg', 'Slide nanti uji', now() + interval '2 days');
  raise notice 'LULUS: humas (draf/ajukan, revisi, tidak bisa menerbitkan sendiri)';
end $$;
reset role;

-- ---------- CMS: kepala sekolah ----------
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ begin
  if (select count(*) from public.berita where status = 'diajukan' and id = '00000000-0000-0000-0000-000000000601') <> 1 then
    raise exception 'GAGAL: kepala tidak melihat berita yang diajukan'; end if;
  perform public.putuskan_berita('00000000-0000-0000-0000-000000000601', true, 'Bagus');
  if (select status from public.berita where id = '00000000-0000-0000-0000-000000000601') <> 'terbit' then raise exception 'GAGAL: persetujuan'; end if;
  begin
    perform public.putuskan_berita('00000000-0000-0000-0000-000000000601', false, 'lagi');
    raise exception 'GAGAL: diputus dua kali';
  exception when check_violation then null; end;
  update public.pengaturan_situs set persetujuan_wajib = true;
  raise notice 'LULUS: kepala sekolah (menyetujui)';
end $$;
reset role;
update public.berita set tayang_mulai = now() + interval '1 day', status = 'terbit', slug = 'uji-terjadwal', judul = 'Uji terjadwal'
 where id = '00000000-0000-0000-0000-000000000601';
insert into public.berita (slug, judul, status) values ('uji-sudah-tayang', 'Uji sudah tayang', 'terbit');

set local role anon;
do $$ begin
  if exists (select 1 from public.berita where slug = 'uji-terjadwal') then raise exception 'GAGAL: berita terjadwal tampil sebelum waktunya'; end if;
  if not exists (select 1 from public.berita where slug = 'uji-sudah-tayang') then raise exception 'GAGAL: berita terbit tidak tampil'; end if;
  if (select hero_teks from public.pengaturan_situs) <> 'Teks uji' then raise exception 'GAGAL: pengaturan situs tidak terbaca publik'; end if;
  if exists (select 1 from public.hero_slide where alt in ('Slide mati uji', 'Slide nanti uji')) then raise exception 'GAGAL: slide nonaktif/terjadwal tampil'; end if;
  if not exists (select 1 from public.hero_slide where alt = 'Slide aktif uji') then raise exception 'GAGAL: slide aktif tidak tampil'; end if;
  begin
    if exists (select 1 from public.berita_revisi) then raise exception 'GAGAL: publik membaca revisi'; end if;
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung (jadwal tayang & slide)';
end $$;
reset role;

-- ---------- ABSENSI PER JP ----------
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000006a1', '2097/2098', true);
delete from public.hari_libur where tanggal = public.hari_ini();
insert into public.pegawai (id, nama, user_id) values
  ('00000000-0000-0000-0000-0000000006b1', 'Guru Mapel Uji', pg_temp.uid('guru')),
  ('00000000-0000-0000-0000-0000000006b2', 'Guru Lain Uji', pg_temp.uid('walikelas'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama) values
  ('00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006a1', 'X', 'Q-1'),
  ('00000000-0000-0000-0000-0000000006c2', '00000000-0000-0000-0000-0000000006a1', 'X', 'Q-2');
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000006d1', '9960000001', 'Siswa Q1', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000006d2', '9960000002', 'Siswa Q1 b', null),
  ('00000000-0000-0000-0000-0000000006d3', '9960000003', 'Siswa Q2', null);
insert into public.anggota_kelas (siswa_id, kelas_id) values
  ('00000000-0000-0000-0000-0000000006d1', '00000000-0000-0000-0000-0000000006c1'),
  ('00000000-0000-0000-0000-0000000006d2', '00000000-0000-0000-0000-0000000006c1'),
  ('00000000-0000-0000-0000-0000000006d3', '00000000-0000-0000-0000-0000000006c2');
insert into public.mapel (id, nama) values ('00000000-0000-0000-0000-0000000006e1', 'Mapel Q');
delete from public.jam_pelajaran where hari = extract(isodow from public.hari_ini())::smallint;
insert into public.jam_pelajaran (hari, urutan, jenis, jp_ke, jam_mulai, jam_selesai)
values (extract(isodow from public.hari_ini())::smallint, 1, 'pelajaran', 1, '07:00', '07:40');
insert into public.penugasan_mengajar (id, kelas_id, mapel_id, pegawai_id) values
  ('00000000-0000-0000-0000-0000000006f1', '00000000-0000-0000-0000-0000000006c1', '00000000-0000-0000-0000-0000000006e1', '00000000-0000-0000-0000-0000000006b1');
insert into public.jadwal (id, penugasan_id, kelas_id, tahun_ajaran_id, hari, jp_ke) values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-0000000006f1', '00000000-0000-0000-0000-0000000006c1',
   '00000000-0000-0000-0000-0000000006a1', extract(isodow from public.hari_ini())::smallint, 1);
create temp table uji6 (token text);
grant all on uji6 to authenticated;

select pg_temp.sebagai('guru'); set local role authenticated;
do $$ declare n int; begin
  n := public.simpan_absensi_jp('00000000-0000-0000-0000-000000000611', public.hari_ini(),
        '[{"siswa_id":"00000000-0000-0000-0000-0000000006d2","status":"A","keterangan":"tidak di kelas"}]', 'Bab 1', '');
  if n <> 1 then raise exception 'GAGAL: jumlah hadir JP (hasil %)', n; end if;
  begin
    perform public.simpan_absensi_jp('00000000-0000-0000-0000-000000000611', public.hari_ini(), '[{"siswa_id":"00000000-0000-0000-0000-0000000006d3","status":"A"}]');
    raise exception 'GAGAL: siswa kelas lain diterima';
  exception when invalid_parameter_value then null; end;
  begin
    insert into public.absensi_jp (jadwal_id, tanggal, siswa_id, status) values ('00000000-0000-0000-0000-000000000611', public.hari_ini(), '00000000-0000-0000-0000-0000000006d1', 'A');
    raise exception 'GAGAL: tulis langsung ke absensi_jp';
  exception when insufficient_privilege then null; end;
  insert into uji6 values (public.token_qr('00000000-0000-0000-0000-000000000611'));
  if (select materi from public.jurnal_jp where jadwal_id = '00000000-0000-0000-0000-000000000611') <> 'Bab 1' then raise exception 'GAGAL: jurnal mengajar'; end if;
  raise notice 'LULUS: guru pengajar (absensi JP, jurnal, QR)';
end $$;
reset role;

select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  begin
    perform public.simpan_absensi_jp('00000000-0000-0000-0000-000000000611', public.hari_ini(), '[]');
    raise exception 'GAGAL: guru lain mengisi absensi JP';
  exception when insufficient_privilege then null; end;
  begin
    perform public.token_qr('00000000-0000-0000-0000-000000000611');
    raise exception 'GAGAL: guru lain membuat QR';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.absensi_jp) then raise exception 'GAGAL: guru lain membaca absensi JP'; end if;
  raise notice 'LULUS: guru bukan pengajar';
end $$;
reset role;

-- guru pengganti mengambil alih
insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id)
values ('00000000-0000-0000-0000-000000000611', public.hari_ini(), 'pengganti', '00000000-0000-0000-0000-0000000006b2');
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  perform public.simpan_absensi_jp('00000000-0000-0000-0000-000000000611', public.hari_ini(), '[]', 'Diganti', '');
  raise notice 'LULUS: guru pengganti dapat mengisi absensi JP';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin
    perform public.simpan_absensi_jp('00000000-0000-0000-0000-000000000611', public.hari_ini(), '[]');
    raise exception 'GAGAL: guru yang digantikan masih mengisi';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru yang digantikan tidak dapat mengisi';
end $$;
reset role;

-- ---------- QR: siswa memindai ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ declare r jsonb; begin
  r := public.scan_qr((select token from uji6));
  if not (r->>'baru')::boolean or r->>'kelas' <> 'Q-1' then raise exception 'GAGAL: scan QR (%)', r; end if;
  r := public.scan_qr((select token from uji6));
  if (r->>'baru')::boolean then raise exception 'GAGAL: scan ganda tercatat dua kali'; end if;
  begin
    perform public.scan_qr(replace((select token from uji6), substr((select token from uji6), length((select token from uji6)) - 3), 'ffff'));
    raise exception 'GAGAL: token palsu diterima';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.scan_qr('00000000-0000-0000-0000-000000000611.1.abc');
    raise exception 'GAGAL: token kedaluwarsa diterima';
  exception when invalid_parameter_value then null; end;
  raise notice 'LULUS: siswa memindai QR (sekali, tidak bisa dipalsukan)';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  begin
    perform public.scan_qr((select token from uji6));
    raise exception 'GAGAL: orang tua memindai QR kehadiran';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: orang tua tidak bisa memindai QR';
end $$;
reset role;

-- ---------- IZIN PEGAWAI & PRESENSI LOKASI ----------
update public.pengaturan_absensi set lokasi_lat = -6.9, lokasi_lng = 107.6, lokasi_radius = 150;
insert into public.kelompok_kerja (id, nama, jam_masuk, jam_pulang, hari_kerja, wajib_lokasi)
values ('00000000-0000-0000-0000-000000000691', 'Kelompok Uji', '00:01', '23:58', '{1,2,3,4,5,6,7}', true);
update public.pegawai set kelompok_kerja_id = '00000000-0000-0000-0000-000000000691' where id = '00000000-0000-0000-0000-0000000006b1';
delete from public.absensi_pegawai where pegawai_id = '00000000-0000-0000-0000-0000000006b1';

select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin
    perform public.presensi_saya('masuk');
    raise exception 'GAGAL: presensi tanpa lokasi diterima';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.presensi_saya('masuk', -6.95, 107.65, 20);
    raise exception 'GAGAL: presensi dari luar radius diterima';
  exception when invalid_parameter_value then null; end;
  perform public.presensi_saya('masuk', -6.9005, 107.6005, 15);
  if (select jarak_masuk from public.absensi_pegawai where pegawai_id = '00000000-0000-0000-0000-0000000006b1' and tanggal = public.hari_ini()) > 150 then
    raise exception 'GAGAL: jarak tidak tercatat'; end if;
  insert into public.pengajuan_izin_pegawai (pegawai_id, jenis, tanggal_mulai, tanggal_selesai, alasan)
  values ('00000000-0000-0000-0000-0000000006b2', 'DL', public.hari_ini() + 1, public.hari_ini() + 2, 'Rapat MGMP kota');
  if (select pegawai_id from public.pengajuan_izin_pegawai where alasan = 'Rapat MGMP kota' limit 1) <> '00000000-0000-0000-0000-0000000006b1' then
    raise exception 'GAGAL: pengajuan atas nama orang lain'; end if;
  begin
    perform public.putuskan_izin_pegawai((select id from public.pengajuan_izin_pegawai where alasan = 'Rapat MGMP kota' limit 1), true);
    raise exception 'GAGAL: guru menyetujui pengajuannya';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru (presensi berlokasi, pengajuan izin atas nama sendiri)';
end $$;
reset role;
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ declare n int; begin
  n := public.putuskan_izin_pegawai((select id from public.pengajuan_izin_pegawai where alasan = 'Rapat MGMP kota' limit 1), true, 'Silakan');
  if n <> 2 then raise exception 'GAGAL: izin 2 hari harus mengisi 2 hari (hasil %)', n; end if;
  if (select count(*) from public.absensi_pegawai where pegawai_id = '00000000-0000-0000-0000-0000000006b1' and status = 'DL') <> 2 then
    raise exception 'GAGAL: absensi pegawai tidak terisi otomatis'; end if;
  raise notice 'LULUS: kepala sekolah (menyetujui izin pegawai → kehadiran terisi)';
end $$;
reset role;

rollback;
