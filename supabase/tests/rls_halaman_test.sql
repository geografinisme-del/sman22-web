-- Uji hak akses "Langit cerah" Tahap C: staf_publik, fasilitas, halaman_cms. Jalankan di database UJI. Semua perubahan di-rollback.
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


insert into public.staf_publik (nama, jabatan, bidang, aktif) values ('Staf uji aktif', 'Guru', 'Matematika', true), ('Staf uji nonaktif', 'Guru', 'Fisika', false);
insert into public.fasilitas (nama, aktif) values ('Fasilitas uji aktif', true), ('Fasilitas uji nonaktif', false);
insert into public.halaman_cms (slug, judul, terbit) values ('uji-terbit', 'Halaman uji terbit', true), ('uji-draf', 'Halaman uji draf', false);

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.staf_publik where nama = 'Staf uji aktif') then raise exception 'GAGAL: anon tidak melihat staf aktif'; end if;
  if exists (select 1 from public.staf_publik where nama = 'Staf uji nonaktif') then raise exception 'GAGAL: anon melihat staf nonaktif'; end if;
  if not exists (select 1 from public.fasilitas where nama = 'Fasilitas uji aktif') then raise exception 'GAGAL: anon tidak melihat fasilitas aktif'; end if;
  if exists (select 1 from public.fasilitas where nama = 'Fasilitas uji nonaktif') then raise exception 'GAGAL: anon melihat fasilitas nonaktif'; end if;
  if not exists (select 1 from public.halaman_cms where slug = 'uji-terbit') then raise exception 'GAGAL: anon tidak melihat halaman terbit'; end if;
  if exists (select 1 from public.halaman_cms where slug = 'uji-draf') then raise exception 'GAGAL: anon melihat halaman draf'; end if;
  begin insert into public.staf_publik (nama) values ('Sisipan anon'); raise exception 'GAGAL: anon menambah staf'; exception when insufficient_privilege then null; end;
  begin insert into public.fasilitas (nama) values ('Sisipan anon'); raise exception 'GAGAL: anon menambah fasilitas'; exception when insufficient_privilege then null; end;
  begin update public.halaman_cms set judul = 'diubah anon'; raise exception 'GAGAL: anon mengubah halaman'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca baris aktif/terbit, tidak bisa menulis';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  if exists (select 1 from public.staf_publik where nama = 'Staf uji nonaktif') then raise exception 'GAGAL: guru melihat staf nonaktif'; end if;
  if exists (select 1 from public.halaman_cms where slug = 'uji-draf') then raise exception 'GAGAL: guru melihat halaman draf'; end if;
  begin insert into public.staf_publik (nama) values ('Sisipan guru'); raise exception 'GAGAL: guru menambah staf'; exception when insufficient_privilege then null; end;
  begin insert into public.halaman_cms (slug, judul) values ('sisipan-guru', 'Sisipan guru'); raise exception 'GAGAL: guru menambah halaman'; exception when insufficient_privilege then null; end;
  update public.fasilitas set nama = 'diubah guru' where nama = 'Fasilitas uji aktif';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah fasilitas'; end if;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  if not exists (select 1 from public.staf_publik where nama = 'Staf uji nonaktif') then raise exception 'GAGAL: pengelola tidak melihat staf nonaktif'; end if;
  if not exists (select 1 from public.halaman_cms where slug = 'uji-draf') then raise exception 'GAGAL: pengelola tidak melihat draf'; end if;
  insert into public.staf_publik (nama, bidang) values ('Staf uji humas', 'Biologi');
  insert into public.fasilitas (nama, deskripsi) values ('Fasilitas uji humas', 'Uji');
  update public.halaman_cms set terbit = true where slug = 'uji-draf';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa menerbitkan halaman'; end if;
  begin insert into public.halaman_cms (slug, judul) values ('Slug Salah!', 'Slug tidak valid'); raise exception 'GAGAL: slug tidak valid diterima'; exception when check_violation then null; end;
  begin insert into public.staf_publik (nama, foto_url) values ('Foto berbahaya', 'javascript:x'); raise exception 'GAGAL: foto_url berbahaya diterima'; exception when check_violation then null; end;
  begin insert into public.fasilitas (nama, foto_url) values ('Foto berbahaya', '//evil.example/x.jpg'); raise exception 'GAGAL: foto protokol-relatif diterima'; exception when check_violation then null; end;
  begin delete from public.staf_publik where nama = 'Staf uji humas'; raise exception 'GAGAL: hapus permanen staf diizinkan'; exception when insufficient_privilege then null; end;
  begin delete from public.fasilitas where nama = 'Fasilitas uji humas'; raise exception 'GAGAL: hapus permanen fasilitas diizinkan'; exception when insufficient_privilege then null; end;
  begin delete from public.halaman_cms where slug = 'uji-terbit'; raise exception 'GAGAL: hapus permanen halaman diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten menulis dengan validasi; hapus permanen ditolak';
end $$;
reset role;

rollback;
