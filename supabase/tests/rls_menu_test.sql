-- Uji hak akses navigasi (migrasi 20261223): menu_grup, menu_keterangan, menu_sorotan. Jalankan di database UJI.
-- Semua perubahan di-rollback.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, aud, role)
select gen_random_uuid(), e || '@sman22.test', 'authenticated', 'authenticated' from unnest(array['humas', 'guru']) e
where not exists (select 1 from auth.users u where u.email = e || '@sman22.test');

create or replace function pg_temp.uid(e text) returns uuid language sql as $$ select id from auth.users where email = e || '@sman22.test' $$;
create or replace function pg_temp.sebagai(e text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(e), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.uid(e)::text, ''), true);
end $$;
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

update public.peran set wajib_mfa = false;
insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['humas', 'guru']) e
on conflict (user_id) do update set aktif = true;
delete from public.pengguna_peran where user_id in (pg_temp.uid('humas'), pg_temp.uid('guru'));
insert into public.pengguna_peran (user_id, peran) values (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('guru'), 'guru');

insert into public.menu_grup (kunci, pengantar) values ('profil', 'Pengantar uji') on conflict (kunci) do update set pengantar = 'Pengantar uji';
insert into public.menu_sorotan (grup, urutan, aktif, judul, tautan) values ('profil', 90, true, 'Sorotan uji aktif', '/profil'), ('profil', 91, false, 'Sorotan uji nonaktif', '/profil');

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.menu_grup where kunci = 'profil') then raise exception 'GAGAL: anon tidak membaca menu_grup'; end if;
  if not exists (select 1 from public.menu_sorotan where judul = 'Sorotan uji aktif') then raise exception 'GAGAL: anon tidak melihat sorotan aktif'; end if;
  if exists (select 1 from public.menu_sorotan where judul = 'Sorotan uji nonaktif') then raise exception 'GAGAL: anon melihat sorotan nonaktif'; end if;
  begin update public.menu_grup set pengantar = 'diubah anon'; raise exception 'GAGAL: anon mengubah menu'; exception when insufficient_privilege then null; end;
  begin insert into public.menu_sorotan (grup, judul, tautan) values ('profil', 'Sisipan anon', '/'); raise exception 'GAGAL: anon menambah sorotan'; exception when insufficient_privilege then null; end;
  begin insert into public.menu_keterangan (grup, href, keterangan) values ('profil', '/sambutan', 'x'); raise exception 'GAGAL: anon menambah keterangan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca menu (sorotan aktif saja), tidak bisa menulis';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  if exists (select 1 from public.menu_sorotan where judul = 'Sorotan uji nonaktif') then raise exception 'GAGAL: guru melihat sorotan nonaktif'; end if;
  begin insert into public.menu_keterangan (grup, href, keterangan) values ('profil', '/sambutan', 'x'); raise exception 'GAGAL: guru menambah keterangan'; exception when insufficient_privilege then null; end;
  update public.menu_grup set pengantar = 'diubah guru' where kunci = 'profil';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah menu_grup'; end if;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  if not exists (select 1 from public.menu_sorotan where judul = 'Sorotan uji nonaktif') then raise exception 'GAGAL: pengelola tidak melihat sorotan nonaktif'; end if;
  update public.menu_grup set pengantar = 'Pengantar humas' where kunci = 'profil';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa mengubah menu_grup'; end if;
  insert into public.menu_keterangan (grup, href, keterangan) values ('profil', '/sambutan', 'Keterangan humas');
  insert into public.menu_sorotan (grup, judul, tautan, fokus_x, fokus_y) values ('kehidupan', 'Sorotan humas', '/prestasi', 30, 70);
  begin insert into public.menu_grup (kunci) values ('lainnya'); raise exception 'GAGAL: kunci menu tak dikenal diterima'; exception when check_violation then null; end;
  begin insert into public.menu_sorotan (grup, judul, tautan) values ('kabar', 'Salah grup', '/berita'); raise exception 'GAGAL: sorotan untuk menu kabar diterima'; exception when check_violation then null; end;
  begin insert into public.menu_sorotan (grup, judul, tautan) values ('profil', 'Tautan berbahaya', 'javascript:alert(1)'); raise exception 'GAGAL: tautan javascript: diterima'; exception when check_violation then null; end;
  begin insert into public.menu_sorotan (grup, judul, tautan, foto_url) values ('profil', 'Foto luar', '/', '//evil.example/x.jpg'); raise exception 'GAGAL: foto protokol-relatif diterima'; exception when check_violation then null; end;
  begin insert into public.menu_sorotan (grup, judul, tautan, fokus_x) values ('profil', 'Fokus salah', '/', 140); raise exception 'GAGAL: fokus di luar 0-100 diterima'; exception when check_violation then null; end;
  begin delete from public.menu_sorotan where judul = 'Sorotan humas'; raise exception 'GAGAL: hapus permanen sorotan diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten menulis menu dengan validasi; hapus permanen ditolak';
end $$;
reset role;

rollback;
