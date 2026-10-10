-- Uji RLS: jalankan di database uji (bukan produksi).
-- Memerlukan 2 akun: admin@sman22.test (terdaftar di public.admins) dan guru@sman22.test (bukan admin).
-- Setiap blok gagal dengan EXCEPTION bila aturan akses dilanggar.
\set ON_ERROR_STOP on
begin;

-- siapkan data uji
insert into public.berita (slug, judul, status) values ('uji-terbit', 'Berita terbit uji', 'terbit'), ('uji-draft', 'Berita draft uji', 'draft');
insert into public.pengumuman (judul, aktif) values ('Pengumuman nonaktif uji', false);

create or replace function pg_temp.sebagai(peran text, email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select id into uid from auth.users where auth.users.email = sebagai.email;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', peran, 'aal', 'aal2')::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
end $$;

-- ===== 1. PENGUNJUNG (anon) =====
select pg_temp.sebagai('anon', null);
set local role anon;
do $$ begin
  if (select count(*) from public.berita where slug = 'uji-draft') <> 0 then raise exception 'GAGAL: anon bisa melihat berita draft'; end if;
  if (select count(*) from public.berita where slug = 'uji-terbit') <> 1 then raise exception 'GAGAL: anon tidak bisa melihat berita terbit'; end if;
  if (select count(*) from public.pengumuman where judul = 'Pengumuman nonaktif uji') <> 0 then raise exception 'GAGAL: anon melihat pengumuman nonaktif'; end if;
  if (select count(*) from public.profil_sekolah) <> 1 then raise exception 'GAGAL: anon tidak bisa membaca profil'; end if;
  begin
    insert into public.berita (slug, judul) values ('anon-coba', 'Anon mencoba menulis');
    raise exception 'GAGAL: anon bisa menambah berita';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.audit_log;
    raise exception 'GAGAL: anon bisa membaca audit log';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.admins;
    raise exception 'GAGAL: anon bisa membaca daftar admin';
  exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung (anon)';
end $$;
reset role;

-- ===== 2. PENGGUNA LOGIN TAPI BUKAN ADMIN =====
select pg_temp.sebagai('authenticated', 'guru@sman22.test');
set local role authenticated;
do $$ declare n int; begin
  if public.is_editor() then raise exception 'GAGAL: guru dianggap editor'; end if;
  if (select count(*) from public.berita where slug = 'uji-draft') <> 0 then raise exception 'GAGAL: non-admin melihat draft'; end if;
  begin
    insert into public.berita (slug, judul) values ('guru-coba', 'Guru mencoba menulis');
    raise exception 'GAGAL: non-admin bisa menambah berita';
  exception when insufficient_privilege then null; end;
  update public.profil_sekolah set slogan = 'diretas' where id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: non-admin bisa mengubah profil'; end if;
  update public.berita set judul = 'diretas' where slug = 'uji-terbit';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: non-admin bisa mengubah berita'; end if;
  begin
    insert into public.admins (user_id, peran) values (auth.uid(), 'super_admin');
    raise exception 'GAGAL: non-admin bisa menjadikan dirinya admin';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'guru/x.jpg');
    raise exception 'GAGAL: non-admin bisa mengunggah foto';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.audit_log) <> 0 then raise exception 'GAGAL: non-admin bisa membaca audit log'; end if;
  raise notice 'LULUS: pengguna login non-admin';
end $$;
reset role;

-- ===== 3. ADMIN =====
select pg_temp.sebagai('authenticated', 'admin@sman22.test');
set local role authenticated;
do $$ declare n int; begin
  if not public.is_editor() then raise exception 'GAGAL: admin tidak dikenali'; end if;
  if (select count(*) from public.berita where slug = 'uji-draft') <> 1 then raise exception 'GAGAL: admin tidak melihat draft'; end if;
  insert into public.berita (slug, judul, status) values ('admin-tambah', 'Admin menambah berita', 'draft');
  update public.profil_sekolah set slogan = 'Slogan uji' where id = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: admin tidak bisa mengubah profil'; end if;
  update public.berita set deleted_at = now() where slug = 'admin-tambah';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: admin tidak bisa mengarsipkan berita'; end if;
  begin
    delete from public.berita where slug = 'uji-terbit';
    raise exception 'GAGAL: hapus permanen seharusnya tidak diizinkan';
  exception when insufficient_privilege then null; end;
  insert into storage.objects (bucket_id, name) values ('media', 'berita/uji.jpg');
  if (select count(*) from public.audit_log where tabel = 'profil_sekolah' and user_id = auth.uid()) < 1 then
    raise exception 'GAGAL: perubahan profil tidak tercatat di audit log';
  end if;
  raise notice 'LULUS: admin';
end $$;
reset role;

-- ===== 4. Validasi data =====
do $$ begin
  begin
    insert into public.berita (slug, judul) values ('Slug Tidak Valid!', 'Judul valid');
    raise exception 'GAGAL: slug tidak valid diterima';
  exception when check_violation then null; end;
  begin
    insert into public.berita (slug, judul) values ('uji-terbit', 'Duplikat slug');
    raise exception 'GAGAL: slug duplikat diterima';
  exception when unique_violation then null; end;
  begin
    insert into public.profil_sekolah (id) values (2);
    raise exception 'GAGAL: profil kedua diterima';
  exception when check_violation then null; end;
  raise notice 'LULUS: validasi data';
end $$;

rollback;
