-- Uji hak akses migrasi 20261224 (portal_login, portal_pengaturan) & 20261225 (jabatan, pegawai/laboran, direktori,
-- akun tanpa peran, pengumuman internal). Jalankan di database UJI. Semua perubahan di-rollback.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, aud, role)
select gen_random_uuid(), e || '@sman22.test', 'authenticated', 'authenticated'
from unnest(array['humas', 'guru', 'laboran_uji', 'satpam_uji', 'tanpaperan_uji', 'siswa_uji', 'opsarpras_uji']) e
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
select pg_temp.uid(e), initcap(replace(e, '_uji', '')) || ' Uji', e || '@sman22.test'
from unnest(array['humas', 'guru', 'laboran_uji', 'satpam_uji', 'tanpaperan_uji', 'siswa_uji', 'opsarpras_uji']) e
on conflict (user_id) do update set aktif = true;
delete from public.pengguna_peran where user_id in (select pg_temp.uid(e) from unnest(array['humas', 'guru', 'laboran_uji', 'satpam_uji', 'tanpaperan_uji', 'siswa_uji', 'opsarpras_uji']) e);
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('guru'), 'guru'), (pg_temp.uid('laboran_uji'), 'laboran'),
  (pg_temp.uid('satpam_uji'), 'pegawai'), (pg_temp.uid('siswa_uji'), 'siswa'), (pg_temp.uid('opsarpras_uji'), 'sarpras');
-- humas juga pemegang pengguna.kelola? (tidak) → penerima notifikasi = pemegang pengguna.kelola yang ada
update public.pengguna set jabatan = 'satpam' where user_id = pg_temp.uid('satpam_uji');

insert into public.portal_login (peran, foto_url, alt_text) values ('gtk', '/images/kegiatan-aula.jpg', 'Kegiatan di aula') on conflict (peran) do nothing;
insert into public.pengumuman (judul, isi, tanggal, aktif, sasaran) values ('Rapat GTK uji', 'internal', current_date, true, 'pegawai'), ('Pengumuman umum uji', 'umum', current_date, true, 'umum');
insert into public.kategori_barang (nama, kode) select 'Lab uji', 'LBU' where not exists (select 1 from public.kategori_barang where kode = 'LBU');

-- ================= PENGUNJUNG =================
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.portal_login where peran = 'gtk') then raise exception 'GAGAL: anon tidak membaca portal_login'; end if;
  begin update public.portal_login set caption = 'x'; raise exception 'GAGAL: anon mengubah portal_login'; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.pengumuman where judul = 'Rapat GTK uji') then raise exception 'GAGAL: anon membaca pengumuman internal'; end if;
  if not exists (select 1 from public.pengumuman where judul = 'Pengumuman umum uji') then raise exception 'GAGAL: anon tidak membaca pengumuman umum'; end if;
  begin perform public.direktori_gtk(); raise exception 'GAGAL: anon memanggil direktori_gtk'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengunjung membaca foto masuk & pengumuman umum saja; tanpa direktori, tanpa menulis';
end $$;
reset role;

-- ================= SISWA =================
select pg_temp.sebagai('siswa_uji'); set local role authenticated;
do $$ begin
  if public.staf_aktif() then raise exception 'GAGAL: siswa dianggap GTK'; end if;
  if exists (select 1 from public.pengumuman where judul = 'Rapat GTK uji') then raise exception 'GAGAL: siswa membaca pengumuman internal'; end if;
  if exists (select 1 from public.direktori_gtk()) then raise exception 'GAGAL: siswa melihat direktori GTK'; end if;
  raise notice 'LULUS: siswa tidak membaca pengumuman internal & direktori GTK';
end $$;
reset role;

-- ================= AKUN TANPA PERAN =================
select pg_temp.sebagai('tanpaperan_uji'); set local role authenticated;
do $$ begin
  if not public.staf_aktif() then raise exception 'GAGAL: akun tanpa peran tidak dianggap GTK (dasbor dasar)'; end if;
  if not exists (select 1 from public.pengumuman where judul = 'Rapat GTK uji') then raise exception 'GAGAL: akun tanpa peran tidak membaca pengumuman internal'; end if;
  if not exists (select 1 from public.direktori_gtk() d where d.nama = 'Satpam Uji' and d.jabatan = 'Satpam') then raise exception 'GAGAL: direktori tanpa jabatan satpam'; end if;
  if exists (select 1 from public.direktori_gtk() d where d.nama = 'Siswa Uji') then raise exception 'GAGAL: direktori memuat siswa'; end if;
  begin insert into public.barang (nama, kategori_id) select 'Sisipan tanpa peran', id from public.kategori_barang where kode = 'LBU'; raise exception 'GAGAL: akun tanpa peran menambah barang'; exception when insufficient_privilege then null; end;
  perform public.lapor_akun_tanpa_peran();
  raise notice 'LULUS: akun tanpa peran = GTK dasbor dasar (pengumuman internal, direktori), tanpa izin modul';
end $$;
reset role;
do $$ begin
  if (select count(*) from public.pengguna_berizin('pengguna.kelola')) > 0
     and not exists (select 1 from public.notifikasi where tautan = '/admin/pengguna/' || pg_temp.uid('tanpaperan_uji')::text) then
    raise exception 'GAGAL: admin tidak mendapat notifikasi akun tanpa peran';
  end if;
  raise notice 'LULUS: notifikasi akun tanpa peran terkirim ke pemegang pengguna.kelola';
end $$;

-- ================= PEGAWAI (satpam) =================
select pg_temp.sebagai('satpam_uji'); set local role authenticated;
do $$
declare n int;
begin
  if not public.staf_aktif() then raise exception 'GAGAL: pegawai bukan GTK'; end if;
  begin insert into public.barang (nama, kategori_id) select 'Sisipan satpam', id from public.kategori_barang where kode = 'LBU'; raise exception 'GAGAL: pegawai menambah barang'; exception when insufficient_privilege then null; end;
  begin update public.pengguna set jabatan = 'guru' where user_id = auth.uid(); get diagnostics n = row_count; if n > 0 then raise exception 'GAGAL: pegawai mengubah jabatannya sendiri'; end if; exception when insufficient_privilege then null; end;
  begin insert into public.jabatan_gtk (kode, nama) values ('uji_jabatan', 'Uji'); raise exception 'GAGAL: pegawai menambah jabatan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pegawai hanya dasbor dasar (tanpa inventaris, tanpa mengatur jabatan)';
end $$;
reset role;

-- ================= LABORAN =================
select pg_temp.sebagai('laboran_uji'); set local role authenticated;
do $$
declare bid uuid; n int;
begin
  insert into public.barang (nama, kategori_id) select 'Mikroskop uji', id from public.kategori_barang where kode = 'LBU' returning id into bid;
  update public.barang set kondisi = 'rusak_ringan', keterangan = 'lensa retak' where id = bid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: laboran tidak bisa mengubah barang'; end if;
  begin update public.barang set harga = 1000000 where id = bid; raise exception 'GAGAL: laboran mengubah harga'; exception when insufficient_privilege then null; end;
  begin update public.barang set sumber_dana = 'BOS' where id = bid; raise exception 'GAGAL: laboran mengubah sumber dana'; exception when insufficient_privilege then null; end;
  begin insert into public.barang (nama, kategori_id, harga) select 'Barang berharga', id, 5 from public.kategori_barang where kode = 'LBU'; raise exception 'GAGAL: laboran mengisi harga'; exception when insufficient_privilege then null; end;
  begin delete from public.barang where id = bid; raise exception 'GAGAL: laboran menghapus barang'; exception when insufficient_privilege then null; end;
  if not public.punya_izin('sarpras.lihat') or public.punya_izin('sarpras.kelola') then raise exception 'GAGAL: izin laboran tidak sesuai'; end if;
  raise notice 'LULUS: laboran mengelola inventaris tanpa anggaran, tanpa hapus, tanpa sarpras.kelola';
end $$;
reset role;

-- ================= WAKASEK SARPRAS tetap boleh mengatur anggaran =================
select pg_temp.sebagai('opsarpras_uji'); set local role authenticated;
do $$
declare n int;
begin
  update public.barang set harga = 2500000, sumber_dana = 'BOS' where nama = 'Mikroskop uji';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: Wakasek Sarpras tidak bisa mengubah anggaran barang'; end if;
  raise notice 'LULUS: Wakasek Sarpras tetap mengatur harga & sumber dana';
end $$;
reset role;

-- ================= HUMAS (konten.kelola) =================
select pg_temp.sebagai('humas'); set local role authenticated;
do $$
declare n int;
begin
  update public.portal_login set caption = 'Aula sekolah', fokus_x = 40 where peran = 'gtk';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GAGAL: pengelola konten tidak bisa mengubah foto masuk'; end if;
  insert into public.portal_pengaturan (id, guru_lama_judul, guru_lama_url) values (1, 'Aplikasi guru lama', 'https://contoh.sch.id') on conflict (id) do update set guru_lama_judul = excluded.guru_lama_judul, guru_lama_url = excluded.guru_lama_url;
  begin insert into public.portal_login (peran) values ('admin'); raise exception 'GAGAL: peran tak dikenal diterima'; exception when check_violation then null; end;
  begin update public.portal_login set foto_url = '//evil.example/x.jpg' where peran = 'gtk'; raise exception 'GAGAL: foto protokol-relatif diterima'; exception when check_violation then null; end;
  begin update public.portal_login set foto_url = '/x.jpg', alt_text = '' where peran = 'gtk'; raise exception 'GAGAL: foto tanpa teks alternatif diterima'; exception when check_violation then null; end;
  begin update public.portal_pengaturan set guru_lama_url = 'javascript:alert(1)' where id = 1; raise exception 'GAGAL: tautan guru lama berbahaya diterima'; exception when check_violation then null; end;
  begin update public.portal_pengaturan set guru_lama_url = 'http://tidak-aman.test' where id = 1; raise exception 'GAGAL: tautan http diterima'; exception when check_violation then null; end;
  begin delete from public.portal_login where peran = 'gtk'; raise exception 'GAGAL: hapus permanen portal_login diizinkan'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: pengelola konten mengatur foto masuk & tautan guru lama dengan validasi; hapus ditolak';
end $$;
reset role;

-- ================= GURU (tanpa konten.kelola) =================
select pg_temp.sebagai('guru'); set local role authenticated;
do $$
declare n int;
begin
  update public.portal_login set caption = 'diubah guru' where peran = 'gtk';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: guru mengubah foto masuk'; end if;
  if not exists (select 1 from public.pengumuman where judul = 'Rapat GTK uji') then raise exception 'GAGAL: guru tidak membaca pengumuman internal'; end if;
  raise notice 'LULUS: guru membaca pengumuman internal, tidak bisa mengubah foto masuk';
end $$;
reset role;

rollback;
