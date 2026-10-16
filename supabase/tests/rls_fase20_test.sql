-- Uji hak akses Fase 20 (buku tahunan: prestasi, spmb_info, portal_bidang, is_placeholder). Jalankan di database UJI.
-- Memerlukan akun auth humas@sman22.test, guru@sman22.test (dibuat bila belum ada). Semua perubahan di-rollback.
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

insert into public.prestasi (id, peringkat, nama_lomba, tingkat, terbit, deleted_at) values
  ('00000000-0000-0000-0000-0000000f2001', 'Juara 1', 'Lomba Uji Terbit', 'Kota', true, null),
  ('00000000-0000-0000-0000-0000000f2002', 'Juara 2', 'Lomba Uji Draf', 'Kota', false, null),
  ('00000000-0000-0000-0000-0000000f2003', 'Juara 3', 'Lomba Uji Arsip', 'Kota', true, now());

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.prestasi where nama_lomba like 'Lomba Uji%') <> 1 then raise exception 'GAGAL: anon melihat prestasi draf/arsip'; end if;
  if (select count(*) from public.spmb_info) <> 1 then raise exception 'GAGAL: spmb_info tidak terbaca publik'; end if;
  perform count(*) from public.portal_bidang;
  begin insert into public.prestasi (peringkat, nama_lomba, tingkat) values ('x', 'Sisipan anon', 'Kota'); raise exception 'GAGAL: anon menambah prestasi'; exception when insufficient_privilege then null; end;
  begin update public.spmb_info set aktif = true where id = 1; raise exception 'GAGAL: anon mengubah spmb_info'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca prestasi terbit & info SPMB, tidak bisa menulis';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  if (select count(*) from public.prestasi where nama_lomba like 'Lomba Uji%') <> 1 then raise exception 'GAGAL: guru melihat prestasi draf'; end if;
  begin insert into public.prestasi (peringkat, nama_lomba, tingkat) values ('x', 'Sisipan guru', 'Kota'); raise exception 'GAGAL: guru menambah prestasi'; exception when insufficient_privilege then null; end;
  update public.spmb_info set aktif = true where id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah spmb_info'; end if;
  begin insert into public.portal_bidang (kunci, penanggung_jawab) values ('kurikulum', 'Guru'); raise exception 'GAGAL: guru mengisi penanggung jawab'; exception when insufficient_privilege then null; end;
  begin delete from public.prestasi; raise exception 'GAGAL: guru menghapus prestasi'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis data buku tahunan';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  if (select count(*) from public.prestasi where nama_lomba like 'Lomba Uji%') <> 3 then raise exception 'GAGAL: pengelola tidak melihat semua prestasi'; end if;
  insert into public.prestasi (peringkat, nama_lomba, tingkat) values ('Finalis', 'Lomba Uji Humas', 'Nasional');
  begin insert into public.prestasi (peringkat, nama_lomba, tingkat) values ('x', 'Tingkat salah', 'Galaksi'); raise exception 'GAGAL: tingkat tak dikenal diterima'; exception when check_violation then null; end;
  update public.spmb_info set aktif = true, judul = 'Uji' where id = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa mengubah spmb_info'; end if;
  begin update public.spmb_info set jadwal = '[1,2,3,4,5,6,7]'::jsonb where id = 1; raise exception 'GAGAL: jadwal > 6 langkah diterima'; exception when check_violation then null; end;
  insert into public.portal_bidang (kunci, penanggung_jawab) values ('kurikulum', 'Uji PJ') on conflict (kunci) do update set penanggung_jawab = excluded.penanggung_jawab;
  begin insert into public.portal_bidang (kunci, foto_url) values ('sarpras', 'javascript:alert(1)'); raise exception 'GAGAL: URL foto berbahaya diterima'; exception when check_violation then null; end;
  begin delete from public.prestasi where nama_lomba = 'Lomba Uji Humas'; raise exception 'GAGAL: hapus permanen diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten menulis prestasi/SPMB/penanggung jawab dengan validasi; hapus permanen ditolak';
end $$;
reset role;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name in ('berita', 'galeri', 'hero_slide') and column_name = 'is_placeholder' and column_default <> 'false') then
    raise exception 'GAGAL: is_placeholder bawaan bukan false';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('berita', 'galeri', 'hero_slide', 'prestasi', 'portal_bidang') and column_name = 'is_placeholder') <> 5 then
    raise exception 'GAGAL: kolom is_placeholder tidak lengkap';
  end if;
  raise notice 'LULUS: penanda is_placeholder ada di semua tabel media, bawaan false';
end $$;

rollback;
