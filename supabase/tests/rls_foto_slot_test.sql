-- Uji hak akses foto sementara (migrasi 20261227): foto_slot. Jalankan di database UJI. Semua perubahan di-rollback.
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

insert into public.foto_slot (lokasi, nama, url_aktif, url_asli, fotografer, sumber)
values ('uji.slot', 'Slot uji', '/media/stok/uji.webp', '/images/uji.jpg', 'Fotografer Uji', 'Unsplash')
on conflict (lokasi) do nothing;

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.foto_slot where lokasi = 'uji.slot') then raise exception 'GAGAL: anon tidak membaca foto_slot (kredit & foto asli)'; end if;
  begin update public.foto_slot set url_aktif = '/x.webp' where lokasi = 'uji.slot'; raise exception 'GAGAL: anon mengubah foto_slot'; exception when insufficient_privilege then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif) values ('anon.slot', 'Sisipan anon', '/x.webp'); raise exception 'GAGAL: anon menambah foto_slot'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca foto_slot';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  update public.foto_slot set url_aktif = '/diubah-guru.webp' where lokasi = 'uji.slot';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah foto_slot'; end if;
  begin insert into public.foto_slot (lokasi, nama, url_aktif) values ('guru.slot', 'Sisipan guru', '/x.webp'); raise exception 'GAGAL: guru menambah foto_slot'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis foto_slot';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  update public.foto_slot set url_aktif = url_asli, is_placeholder = false, dikembalikan_pada = now() where lokasi = 'uji.slot';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa mengembalikan foto asli'; end if;
  insert into public.foto_slot (lokasi, nama, url_aktif) values ('humas.slot', 'Slot humas', '/media/stok/humas.webp');
  begin insert into public.foto_slot (lokasi, nama, url_aktif) values ('Lokasi Salah!', 'x', '/x.webp'); raise exception 'GAGAL: lokasi tidak valid diterima'; exception when check_violation then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif) values ('bahaya.slot', 'x', 'javascript:alert(1)'); raise exception 'GAGAL: url javascript: diterima'; exception when check_violation then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif) values ('luar.slot', 'x', '//evil.example/x.jpg'); raise exception 'GAGAL: url protokol-relatif diterima'; exception when check_violation then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif, tabel) values ('tabel.slot', 'x', '/x.webp', 'pengguna'); raise exception 'GAGAL: tabel sasaran tak dikenal diterima'; exception when check_violation then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif, tabel) values ('baris.slot', 'x', '/x.webp', 'galeri'); raise exception 'GAGAL: slot tabel tanpa baris_id diterima'; exception when check_violation then null; end;
  begin insert into public.foto_slot (lokasi, nama, url_aktif, tautan_sumber) values ('sumber.slot', 'x', '/x.webp', 'http://tidak-aman.example'); raise exception 'GAGAL: tautan sumber non-https diterima'; exception when check_violation then null; end;
  begin delete from public.foto_slot where lokasi = 'humas.slot'; raise exception 'GAGAL: hapus foto_slot diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten menulis foto_slot dengan validasi; hapus ditolak';
end $$;
reset role;

rollback;
