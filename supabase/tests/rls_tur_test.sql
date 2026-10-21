-- Uji hak akses "Langit cerah" Tahap B: tur_sekolah, batas 8 titik aktif, bucket tur-sekolah, kolom angka beranda.
-- Jalankan di database UJI. Semua perubahan di-rollback.
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

-- mulai dari keadaan terkendali: 6 titik aktif uji + 1 nonaktif
update public.tur_sekolah set aktif = false;
insert into public.tur_sekolah (id, urutan, aktif, label, judul) values
  ('00000000-0000-0000-0000-00000000f001', 91, true, 'Uji 1', 'Titik uji 1'),
  ('00000000-0000-0000-0000-00000000f002', 92, true, 'Uji 2', 'Titik uji 2'),
  ('00000000-0000-0000-0000-00000000f003', 93, true, 'Uji 3', 'Titik uji 3'),
  ('00000000-0000-0000-0000-00000000f004', 94, true, 'Uji 4', 'Titik uji 4'),
  ('00000000-0000-0000-0000-00000000f005', 95, true, 'Uji 5', 'Titik uji 5'),
  ('00000000-0000-0000-0000-00000000f006', 96, true, 'Uji 6', 'Titik uji 6'),
  ('00000000-0000-0000-0000-00000000f007', 97, false, 'Uji 7', 'Titik uji nonaktif');

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.tur_sekolah where label like 'Uji %') <> 6 then raise exception 'GAGAL: anon melihat titik nonaktif / tidak melihat titik aktif'; end if;
  begin insert into public.tur_sekolah (label, judul) values ('xx', 'Sisipan anon'); raise exception 'GAGAL: anon menambah titik'; exception when insufficient_privilege then null; end;
  begin update public.tur_sekolah set judul = 'diubah'; raise exception 'GAGAL: anon mengubah titik'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects (bucket_id, name) values ('tur-sekolah', 'masuk/anon.jpg'); raise exception 'GAGAL: anon mengunggah ke bucket tur'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung hanya membaca titik aktif; tidak bisa menulis tabel maupun bucket';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  begin insert into public.tur_sekolah (label, judul) values ('xx', 'Sisipan guru'); raise exception 'GAGAL: guru menambah titik'; exception when insufficient_privilege then null; end;
  update public.tur_sekolah set judul = 'diubah guru' where label = 'Uji 1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah titik'; end if;
  begin insert into storage.objects (bucket_id, name, owner) values ('tur-sekolah', 'masuk/guru.jpg', auth.uid()); raise exception 'GAGAL: guru mengunggah ke bucket tur'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tanpa konten.kelola tidak bisa menulis tur maupun bucket tur';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  if (select count(*) from public.tur_sekolah where label like 'Uji %') <> 7 then raise exception 'GAGAL: pengelola tidak melihat semua titik'; end if;
  update public.tur_sekolah set aktif = true where label = 'Uji 7';                     -- 7 aktif
  insert into public.tur_sekolah (label, judul, aktif) values ('Uji 8', 'Titik uji 8', true); -- 8 aktif
  begin
    insert into public.tur_sekolah (label, judul, aktif) values ('Uji 9', 'Titik uji 9', true);
    raise exception 'GAGAL: titik aktif ke-9 diterima';
  exception when check_violation then null;
  end;
  begin update public.tur_sekolah set media_tipe = 'video', media_url = '/x.mp4' where label = 'Uji 1'; raise exception 'GAGAL: video tanpa poster diterima'; exception when check_violation then null; end;
  begin update public.tur_sekolah set media_url = '/x.jpg', alt_text = '' where label = 'Uji 2'; raise exception 'GAGAL: foto tanpa teks alternatif diterima'; exception when check_violation then null; end;
  begin update public.tur_sekolah set deskripsi = repeat('x', 161) where label = 'Uji 3'; raise exception 'GAGAL: deskripsi > 160 diterima'; exception when check_violation then null; end;
  begin update public.tur_sekolah set tombol_url = 'javascript:alert(1)' where label = 'Uji 3'; raise exception 'GAGAL: tautan javascript: diterima'; exception when check_violation then null; end;
  begin delete from public.tur_sekolah where label = 'Uji 8'; raise exception 'GAGAL: hapus permanen diizinkan'; exception when insufficient_privilege then null; end;
  insert into storage.objects (bucket_id, name, owner) values ('tur-sekolah', 'masuk/uji-humas.jpg', auth.uid());
  update public.profil_sekolah set lulusan_pt_persen = '87', kepala_sekolah_jabatan = 'Uji' where id = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola tidak bisa mengisi angka beranda'; end if;
  begin update public.profil_sekolah set lulusan_pt_persen = 'banyak' where id = 1; raise exception 'GAGAL: persen bukan angka diterima'; exception when check_violation then null; end;
  raise notice 'LULUS: pengelola menulis tur (maks 8 aktif, video berposter, foto beralt), unggah ke bucket tur, isi angka beranda; hapus permanen ditolak';
end $$;
reset role;

rollback;
