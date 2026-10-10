-- Uji hak akses & anti-bentrok Fase 5 (jadwal pelajaran). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['humas','guru','piket','siswa']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('humas'), 'kurikulum'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('piket'), 'piket'), (pg_temp.uid('siswa'), 'siswa')
on conflict do nothing;
update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000005a1', '2098/2099', true);
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama) values
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005a1', 'X', 'J-1'),
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005a1', 'X', 'J-2');
insert into public.pegawai (id, nama) values
  ('00000000-0000-0000-0000-0000000005b1', 'Guru Satu'), ('00000000-0000-0000-0000-0000000005b2', 'Guru Dua'),
  ('00000000-0000-0000-0000-0000000005b3', 'Guru Tiga');
create temp table uji as select (public.hari_ini() + ((8 - extract(isodow from public.hari_ini())::int) % 7))::date as senin;
grant select on uji to authenticated;

-- ---------- KURIKULUM ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare n int; begin
  insert into public.mapel (id, nama) values ('00000000-0000-0000-0000-0000000005d1', 'Geografi Uji'), ('00000000-0000-0000-0000-0000000005d2', 'Sejarah Uji');
  insert into public.ruang (id, nama) values ('00000000-0000-0000-0000-0000000005e1', 'Lab Uji');
  perform public.atur_jam_hari(1::smallint, '[{"jenis":"upacara","jam_mulai":"07:00","jam_selesai":"07:40"},
    {"jenis":"pelajaran","jam_mulai":"07:40","jam_selesai":"08:20"},{"jenis":"pelajaran","jam_mulai":"08:20","jam_selesai":"09:00"}]');
  if (select count(*) from public.jam_pelajaran where hari = 1 and jenis = 'pelajaran') <> 2 then raise exception 'GAGAL: jam pelajaran'; end if;
  begin
    perform public.atur_jam_hari(2::smallint, '[{"jenis":"pelajaran","jam_mulai":"07:00","jam_selesai":"07:40"},{"jenis":"pelajaran","jam_mulai":"07:30","jam_selesai":"08:10"}]');
    raise exception 'GAGAL: jam tumpang tindih diterima';
  exception when invalid_parameter_value then null; end;
  insert into public.penugasan_mengajar (id, kelas_id, mapel_id, pegawai_id, jp_per_minggu) values
    ('00000000-0000-0000-0000-0000000005f1', '00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005b1', 2),
    ('00000000-0000-0000-0000-0000000005f2', '00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-0000000005d2', '00000000-0000-0000-0000-0000000005b1', 2);
  n := public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c1',
    '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000005f1","ruang_id":"00000000-0000-0000-0000-0000000005e1"},
      {"hari":1,"jp_ke":2,"penugasan_id":"00000000-0000-0000-0000-0000000005f1"}]');
  if n <> 2 then raise exception 'GAGAL: simpan jadwal J-1'; end if;
  begin
    perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c2', '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000005f2"}]');
    raise exception 'GAGAL: guru yang sama di dua kelas pada jam yang sama diterima';
  exception when exclusion_violation then
    if sqlerrm not like '%Guru Satu sudah mengajar di J-1, Senin JP ke-1%' then raise exception 'GAGAL: pesan bentrok tidak jelas: %', sqlerrm; end if;
  end;
  begin
    perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c2', '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000005f1"}]');
    raise exception 'GAGAL: mapel kelas lain dipakai';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c1', '[{"hari":1,"jp_ke":7,"penugasan_id":"00000000-0000-0000-0000-0000000005f1"}]');
    raise exception 'GAGAL: JP yang belum diatur diterima';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.jadwal where kelas_id = '00000000-0000-0000-0000-0000000005c1') <> 2 then
    raise exception 'GAGAL: simpan gagal tidak boleh mengubah data (harus semua-atau-tidak)'; end if;
  update public.penugasan_mengajar set pegawai_id = '00000000-0000-0000-0000-0000000005b2' where id = '00000000-0000-0000-0000-0000000005f2';
  perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c2', '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000005f2"}]');
  begin
    perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c2', '[{"hari":1,"jp_ke":1,"penugasan_id":"00000000-0000-0000-0000-0000000005f2","ruang_id":"00000000-0000-0000-0000-0000000005e1"}]');
    raise exception 'GAGAL: ruang bentrok diterima';
  exception when exclusion_violation then null; end;
  begin
    update public.penugasan_mengajar set pegawai_id = '00000000-0000-0000-0000-0000000005b2' where id = '00000000-0000-0000-0000-0000000005f1';
    raise exception 'GAGAL: ganti guru penugasan menyebabkan bentrok tetapi diterima';
  exception when unique_violation then null; end;
  begin
    perform public.atur_jam_hari(1::smallint, '[{"jenis":"pelajaran","jam_mulai":"07:00","jam_selesai":"07:40"}]');
    raise exception 'GAGAL: jam dikurangi padahal JP ke-2 terpakai';
  exception when check_violation then null; end;
  if (select guru from public.jadwal_lengkap where kelas_id = '00000000-0000-0000-0000-0000000005c2') <> 'Guru Dua' then
    raise exception 'GAGAL: tampilan jadwal_lengkap'; end if;
  raise notice 'LULUS: kurikulum (anti-bentrok guru, ruang, kelas, jam)';
end $$;
reset role;

-- ---------- PIKET: guru pengganti ----------
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ declare jid uuid; begin
  select id into jid from public.jadwal where kelas_id = '00000000-0000-0000-0000-0000000005c1' and jp_ke = 1;
  begin
    insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id)
    values (jid, (select senin from uji), 'pengganti', '00000000-0000-0000-0000-0000000005b2');
    raise exception 'GAGAL: pengganti yang sedang mengajar diterima';
  exception when exclusion_violation then null; end;
  begin
    insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id)
    values (jid, (select senin from uji) + 1, 'pengganti', '00000000-0000-0000-0000-0000000005b3');
    raise exception 'GAGAL: tanggal bukan hari Senin diterima';
  exception when invalid_parameter_value then null; end;
  if exists (select 1 from public.guru_tersedia(jid, (select senin from uji)) where id = '00000000-0000-0000-0000-0000000005b2') then
    raise exception 'GAGAL: guru sibuk muncul di daftar tersedia'; end if;
  if not exists (select 1 from public.guru_tersedia(jid, (select senin from uji)) where id = '00000000-0000-0000-0000-0000000005b3') then
    raise exception 'GAGAL: guru kosong tidak muncul di daftar tersedia'; end if;
  insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis, pegawai_pengganti_id, catatan)
  values (jid, (select senin from uji), 'pengganti', '00000000-0000-0000-0000-0000000005b3', 'Guru Satu dinas luar');
  if (select dibuat_oleh from public.perubahan_jadwal where jadwal_id = jid) <> auth.uid() then raise exception 'GAGAL: pembuat dipalsukan'; end if;
  begin
    insert into public.mapel (nama) values ('Mapel Liar');
    raise exception 'GAGAL: piket menambah mapel';
  exception when insufficient_privilege then null; end;
  begin
    perform public.simpan_jadwal_kelas('00000000-0000-0000-0000-0000000005c1', '[]');
    raise exception 'GAGAL: piket mengubah jadwal tetap';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: piket (guru pengganti tanpa bentrok)';
end $$;
reset role;

-- ---------- GURU & SISWA: hanya melihat ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.jadwal_lengkap where tahun_ajaran_id = '00000000-0000-0000-0000-0000000005a1') <> 3 then
    raise exception 'GAGAL: guru tidak bisa melihat jadwal'; end if;
  begin
    insert into public.perubahan_jadwal (jadwal_id, tanggal, jenis) select id, (select senin from uji), 'ditiadakan' from public.jadwal
      where kelas_id = '00000000-0000-0000-0000-0000000005c2' limit 1;
    raise exception 'GAGAL: guru biasa mengubah jadwal';
  exception when insufficient_privilege then null; end;
  begin
    perform public.guru_tersedia((select id from public.jadwal limit 1), (select senin from uji));
    raise exception 'GAGAL: guru biasa melihat daftar ketersediaan';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru (lihat saja)';
end $$;
reset role;

select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.perubahan_jadwal) < 1 then raise exception 'GAGAL: siswa tidak melihat perubahan jadwal'; end if;
  update public.jadwal set jp_ke = 2;
  if exists (select 1 from public.jadwal where kelas_id = '00000000-0000-0000-0000-0000000005c2' and jp_ke = 2) then
    raise exception 'GAGAL: siswa mengubah jadwal'; end if;
  raise notice 'LULUS: siswa (lihat saja)';
end $$;
reset role;

rollback;
