-- Uji hak akses Fase 2 (akun, peran, data induk). Jalankan di database UJI.
-- Membutuhkan akun: admin@, operator@, walikelas@, guru@, siswa@, ortu@, humas@ (domain sman22.test).
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
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['operator','walikelas','guru','siswa','ortu','humas']) e
on conflict (user_id) do nothing;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('operator'), 'operator'), (pg_temp.uid('walikelas'), 'wali_kelas'), (pg_temp.uid('walikelas'), 'guru'),
  (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('humas'), 'humas')
on conflict do nothing;

update public.tahun_ajaran set aktif = false where aktif;
insert into public.tahun_ajaran (id, nama, aktif) values ('00000000-0000-0000-0000-0000000000a1', '2099/2100', true);
insert into public.pegawai (id, nama, user_id) values ('00000000-0000-0000-0000-0000000000b1', 'Wali Uji', pg_temp.uid('walikelas'));
insert into public.kelas (id, tahun_ajaran_id, tingkat, nama, wali_kelas_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-X-1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'X', 'UJI-X-2', null);
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '9990000001', 'Siswa Perwalian', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-0000000000d2', '9990000002', 'Siswa Kelas Lain', null);
insert into public.anggota_kelas (siswa_id, kelas_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2');
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-0000000000e1', 'Ortu Uji', pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'ibu');

create or replace function pg_temp.lihat(nisn text) returns int language sql as $$ select count(*)::int from public.siswa where siswa.nisn = lihat.nisn $$;

-- ---------- OPERATOR ----------
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare n int; begin
  if pg_temp.lihat('9990000002') <> 1 then raise exception 'GAGAL: operator tidak melihat semua siswa'; end if;
  update public.siswa set alamat = 'Jl. Uji' where nisn = '9990000002'; get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: operator tidak bisa mengubah siswa'; end if;
  perform public.impor_siswa('[{"nisn":"9990000003","nama":"Impor Uji","kelas":"UJI X 1","nama_ibu":"Ibu Impor"}]'::jsonb);
  if (select count(*) from public.siswa_kelas_aktif where nisn = '9990000003' and kelas = 'UJI-X-1') <> 1 then
    raise exception 'GAGAL: impor tidak menempatkan siswa ke kelas (pencocokan nama kelas)'; end if;
  if (public.impor_siswa('[{"nisn":"9990000003","nama":"Nama Diganti"}]'::jsonb) ->> 'dilewati')::int <> 1 then
    raise exception 'GAGAL: data lama tertimpa tanpa persetujuan'; end if;
  if (select nama from public.siswa where nisn = '9990000003') <> 'Impor Uji' then raise exception 'GAGAL: nama berubah'; end if;
  begin
    perform public.impor_siswa('[{"nisn":"9990000004","nama":"Valid"},{"nisn":"123","nama":"NISN Salah"}]'::jsonb);
    raise exception 'GAGAL: NISN tidak valid diterima';
  exception when check_violation then null; end;
  if pg_temp.lihat('9990000004') <> 0 then raise exception 'GAGAL: impor tidak atomik (sebagian tersimpan)'; end if;
  begin
    delete from public.siswa where nisn = '9990000002';
    raise exception 'GAGAL: hapus permanen siswa diizinkan';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.pengguna_peran (user_id, peran) values (auth.uid(), 'super_admin');
    raise exception 'GAGAL: operator bisa menjadikan dirinya super admin';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.audit_log) <> 0 then raise exception 'GAGAL: operator membaca audit log'; end if;
  raise notice 'LULUS: operator';
end $$;
reset role;

-- ---------- WALI KELAS ----------
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ declare n int; begin
  if pg_temp.lihat('9990000001') <> 1 then raise exception 'GAGAL: wali kelas tidak melihat siswa perwaliannya'; end if;
  if pg_temp.lihat('9990000002') <> 0 then raise exception 'GAGAL: wali kelas melihat siswa kelas lain'; end if;
  if (select count(*) from public.orang_tua where nama = 'Ortu Uji') <> 1 then raise exception 'GAGAL: wali kelas tidak melihat ortu siswanya'; end if;
  update public.siswa set alamat = 'diretas' where nisn = '9990000001'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: wali kelas bisa mengubah data induk'; end if;
  if (select count(*) from public.pegawai) <> 1 then raise exception 'GAGAL: wali kelas melihat data pegawai lain'; end if;
  raise notice 'LULUS: wali kelas';
end $$;
reset role;

-- ---------- GURU (bukan wali kelas) ----------
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if (select count(*) from public.siswa) <> 0 then raise exception 'GAGAL: guru biasa melihat data siswa'; end if;
  if (select count(*) from public.kelas where nama like 'UJI-%') <> 2 then raise exception 'GAGAL: guru tidak melihat daftar kelas'; end if;
  begin
    perform public.impor_siswa('[{"nama":"Coba"}]'::jsonb);
    raise exception 'GAGAL: guru bisa impor siswa';
  exception when insufficient_privilege then null; end;
  if public.is_editor() then raise exception 'GAGAL: guru dianggap editor konten'; end if;
  raise notice 'LULUS: guru';
end $$;
reset role;

-- ---------- SISWA ----------
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if pg_temp.lihat('9990000001') <> 1 then raise exception 'GAGAL: siswa tidak melihat datanya sendiri'; end if;
  if pg_temp.lihat('9990000002') <> 0 then raise exception 'GAGAL: siswa melihat data siswa lain'; end if;
  if (select count(*) from public.pengguna) <> 1 then raise exception 'GAGAL: siswa melihat daftar pengguna'; end if;
  raise notice 'LULUS: siswa';
end $$;
reset role;

-- ---------- ORANG TUA ----------
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if pg_temp.lihat('9990000001') <> 1 then raise exception 'GAGAL: ortu tidak melihat data anaknya'; end if;
  if pg_temp.lihat('9990000002') <> 0 then raise exception 'GAGAL: ortu melihat siswa lain'; end if;
  raise notice 'LULUS: orang tua';
end $$;
reset role;

-- ---------- HUMAS ----------
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare n int; begin
  if not public.is_editor() then raise exception 'GAGAL: humas tidak bisa kelola konten'; end if;
  if (select count(*) from public.siswa) <> 0 then raise exception 'GAGAL: humas melihat data siswa'; end if;
  update public.profil_sekolah set slogan = slogan where id = 1; get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: humas tidak bisa ubah profil website'; end if;
  raise notice 'LULUS: humas';
end $$;
reset role;

-- ---------- ANON ----------
set local role anon;
do $$ begin
  begin
    perform 1 from public.siswa;
    raise exception 'GAGAL: anon bisa membaca siswa';
  exception when insufficient_privilege then null; end;
  begin
    perform public.impor_siswa('[]'::jsonb);
    raise exception 'GAGAL: anon bisa memanggil impor';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: anon';
end $$;
reset role;

-- ---------- SUPER ADMIN terakhir tidak bisa dicabut ----------
select pg_temp.sebagai('admin'); set local role authenticated;
do $$ begin
  begin
    delete from public.pengguna_peran where user_id = auth.uid() and peran = 'super_admin';
    raise exception 'GAGAL: super admin terakhir bisa dicabut';
  exception when check_violation then null; end;
  if (select count(*) from public.audit_log where tabel = 'siswa') < 1 then raise exception 'GAGAL: perubahan siswa tidak tercatat di audit'; end if;
  raise notice 'LULUS: super admin & audit';
end $$;
reset role;

rollback;
