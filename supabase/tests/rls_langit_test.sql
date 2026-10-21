-- Uji hak akses "Langit cerah" Tahap A: kartu_beranda. Jalankan di database UJI. Semua perubahan di-rollback.
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

insert into public.kartu_beranda (id, urutan, aktif, label, judul, url) values
  ('00000000-0000-0000-0000-00000000ca01', 90, true, 'Uji', 'Kartu uji aktif', '/profil'),
  ('00000000-0000-0000-0000-00000000ca02', 91, false, 'Uji', 'Kartu uji nonaktif', '/profil');

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.kartu_beranda where judul = 'Kartu uji aktif') then raise exception 'GAGAL: anon tidak melihat kartu aktif'; end if;
  if exists (select 1 from public.kartu_beranda where judul = 'Kartu uji nonaktif') then raise exception 'GAGAL: anon melihat kartu nonaktif'; end if;
  begin insert into public.kartu_beranda (label, judul, url) values ('x', 'Sisipan anon', '/'); raise exception 'GAGAL: anon menambah kartu'; exception when insufficient_privilege then null; end;
  begin update public.kartu_beranda set judul = 'diubah anon'; raise exception 'GAGAL: anon mengubah kartu'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca kartu aktif, tidak bisa menulis';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  if exists (select 1 from public.kartu_beranda where judul = 'Kartu uji nonaktif') then raise exception 'GAGAL: guru melihat kartu nonaktif'; end if;
  begin insert into public.kartu_beranda (label, judul, url) values ('x', 'Sisipan guru', '/profil'); raise exception 'GAGAL: guru menambah kartu'; exception when insufficient_privilege then null; end;
  update public.kartu_beranda set judul = 'diubah guru' where judul = 'Kartu uji aktif';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah kartu'; end if;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis kartu';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  if not exists (select 1 from public.kartu_beranda where judul = 'Kartu uji nonaktif') then raise exception 'GAGAL: pengelola tidak melihat kartu nonaktif'; end if;
  insert into public.kartu_beranda (label, judul, url) values ('Uji', 'Kartu uji humas', '/spmb');
  update public.kartu_beranda set aktif = true where judul = 'Kartu uji nonaktif';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa mengubah kartu'; end if;
  begin insert into public.kartu_beranda (label, judul, url) values ('Uji', 'Tautan berbahaya', 'javascript:alert(1)'); raise exception 'GAGAL: tautan javascript: diterima'; exception when check_violation then null; end;
  begin insert into public.kartu_beranda (label, judul, url) values ('Uji', 'Tautan luar', '//evil.example'); raise exception 'GAGAL: tautan protokol-relatif diterima'; exception when check_violation then null; end;
  begin insert into public.kartu_beranda (label, judul, url, foto_url) values ('Uji', 'Foto berbahaya', '/', 'javascript:x'); raise exception 'GAGAL: foto_url berbahaya diterima'; exception when check_violation then null; end;
  begin delete from public.kartu_beranda where judul = 'Kartu uji humas'; raise exception 'GAGAL: hapus permanen diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten menulis kartu dengan validasi tautan; hapus permanen ditolak';
end $$;
reset role;

rollback;
