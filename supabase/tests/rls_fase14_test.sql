-- Uji hak akses Fase 14 (E-Library publik, draf/riwayat/terbit tampilan, pengumuman prioritas). Jalankan di database UJI.
-- Memerlukan akun auth humas@sman22.test, guru@sman22.test (dibuat bila belum ada).
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
delete from public.riwayat_tampilan;
delete from public.tampilan_draf;
update public.pengaturan_situs set tema = '{}'::jsonb where id = 1;
select set_config('uji.humas', pg_temp.uid('humas')::text, false);

-- data katalog uji
insert into public.buku (id, judul, kategori, tampil_publik) values
  ('00000000-0000-0000-0000-0000000e0b01', 'Buku Sains Publik', 'Sains Uji', true),
  ('00000000-0000-0000-0000-0000000e0b02', 'Buku Sains Tersembunyi', 'Sains Uji', false),
  ('00000000-0000-0000-0000-0000000e0b03', 'Novel Sains Uji (judul memuat kata kategori)', 'Fiksi Uji', true);

-- ================= E-LIBRARY PUBLIK =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select jumlah from public.kategori_katalog_publik() where kategori = 'Sains Uji') <> 1 then raise exception 'GAGAL: kategori menghitung buku yang tidak publik'; end if;
  if (select count(*) from public.katalog_publik_kategori('Sains Uji')) <> 1 then raise exception 'GAGAL: saringan kategori tidak tepat'; end if;
  if exists (select 1 from public.katalog_publik_kategori('Sains Uji') where judul like 'Novel%') then raise exception 'GAGAL: kategori tercampur judul'; end if;
  if (select count(*) from public.aturan_perpus_publik()) <> 1 then raise exception 'GAGAL: aturan pinjam tidak terbaca'; end if;
  raise notice 'LULUS: katalog & kategori publik hanya buku tampil_publik';
end $$;
reset role;

-- ================= DRAF TAMPILAN: hanya pengelola =================
select pg_temp.anon(); set local role anon;
do $$ begin
  begin perform count(*) from public.tampilan_draf; raise exception 'GAGAL: anon membaca draf'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.riwayat_tampilan; raise exception 'GAGAL: anon membaca riwayat'; exception when insufficient_privilege then null; end;
  begin perform public.terbitkan_tampilan('x'); raise exception 'GAGAL: anon menerbitkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung tidak bisa membaca draf/riwayat atau menerbitkan';
end $$;
reset role;

select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  begin insert into public.tampilan_draf (id, konfigurasi) values (1, '{"tema":"modern"}'); raise exception 'GAGAL: guru menulis draf'; exception when insufficient_privilege then null; end;
  begin perform public.terbitkan_tampilan('x'); raise exception 'GAGAL: guru menerbitkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: guru tanpa izin konten tidak bisa menyusun/menerbitkan tampilan';
end $$;
reset role;

select pg_temp.sebagai('humas'); set local role authenticated;
do $$ declare v bigint; begin
  insert into public.tampilan_draf (id, konfigurasi) values (1, '{"versi":1,"tema":"modern"}');
  if (select diubah_oleh from public.tampilan_draf) is distinct from current_setting('uji.humas')::uuid then raise exception 'GAGAL: pengubah draf tidak tercatat'; end if;
  v := public.terbitkan_tampilan('Uji terbit pertama');
  if (select tema -> 'tampilan' ->> 'tema' from public.pengaturan_situs where id = 1) <> 'modern' then raise exception 'GAGAL: konfigurasi tidak terbit'; end if;
  if (select count(*) from public.riwayat_tampilan) <> 1 then raise exception 'GAGAL: riwayat tidak tercatat'; end if;
  -- ubah draf lagi TANPA menerbitkan
  update public.tampilan_draf set konfigurasi = '{"versi":1,"tema":"akademik","rahasia":"draf"}' where id = 1;
  begin update public.riwayat_tampilan set catatan = 'ubah'; raise exception 'GAGAL: riwayat bisa diubah'; exception when insufficient_privilege then null; end;
  begin delete from public.riwayat_tampilan; raise exception 'GAGAL: riwayat bisa dihapus'; exception when insufficient_privilege then null; end;
  begin insert into public.tampilan_draf (id, konfigurasi) values (2, '{}'); raise exception 'GAGAL: draf kedua'; exception when check_violation then null; end;
  raise notice 'LULUS: pengelola menyusun draf, menerbitkan atomik, riwayat append-only';
end $$;
reset role;

select pg_temp.anon(); set local role anon;
do $$ begin
  if (select tema -> 'tampilan' ->> 'tema' from public.pengaturan_situs where id = 1) <> 'modern' then raise exception 'GAGAL: publik tidak melihat versi terbit'; end if;
  if (select tema::text from public.pengaturan_situs where id = 1) like '%rahasia%' then raise exception 'GAGAL: draf bocor ke publik'; end if;
  raise notice 'LULUS: publik hanya melihat konfigurasi terbit, bukan draf';
end $$;
reset role;

-- ================= PENGUMUMAN PRIORITAS =================
do $$ begin
  begin insert into public.pengumuman (judul, prioritas, poster_url, poster_alt) values ('Poster tanpa alt', true, 'https://contoh.id/p.jpg', '');
    raise exception 'GAGAL: poster tanpa teks alternatif diterima'; exception when check_violation then null; end;
  begin insert into public.pengumuman (judul, tautan_url) values ('Tautan protokol-relatif', '//evil.example/x');
    raise exception 'GAGAL: tautan protokol-relatif diterima'; exception when check_violation then null; end;
  begin insert into public.pengumuman (judul, tautan_url) values ('Tautan javascript', 'javascript:alert(1)');
    raise exception 'GAGAL: tautan javascript diterima'; exception when check_violation then null; end;
  insert into public.pengumuman (judul, prioritas, aktif, poster_url, poster_alt, tautan_url, tautan_label)
    values ('Prioritas aktif uji', true, true, 'https://contoh.id/p.jpg', 'Poster jadwal daftar ulang', '/spmb', 'Lihat jadwal'),
           ('Prioritas nonaktif uji', true, false, '', '', '', '');
  raise notice 'LULUS: poster wajib berteks alternatif, tautan aman';
end $$;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select count(*) from public.pengumuman where judul = 'Prioritas aktif uji' and prioritas) <> 1 then raise exception 'GAGAL: prioritas aktif tidak terbaca publik'; end if;
  if (select count(*) from public.pengumuman where judul = 'Prioritas nonaktif uji') <> 0 then raise exception 'GAGAL: prioritas nonaktif terbaca publik'; end if;
  raise notice 'LULUS: popup prioritas hanya dari pengumuman aktif';
end $$;
reset role;

rollback;
