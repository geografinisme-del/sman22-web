-- Uji hak akses Fase 11 (perpustakaan & humas). Jalankan di database UJI.
\set ON_ERROR_STOP on
begin;

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

insert into public.pengguna (user_id, nama, email)
select pg_temp.uid(e), e, e || '@sman22.test' from unnest(array['operator','siswa','ortu','guru','humas','piket','kesiswaan','walikelas']) e
on conflict (user_id) do update set aktif = true;
insert into public.pengguna_peran (user_id, peran) values
  (pg_temp.uid('operator'), 'pustakawan'), (pg_temp.uid('siswa'), 'siswa'), (pg_temp.uid('ortu'), 'orang_tua'), (pg_temp.uid('guru'), 'guru'),
  (pg_temp.uid('humas'), 'humas'), (pg_temp.uid('piket'), 'piket'), (pg_temp.uid('kesiswaan'), 'kesiswaan'), (pg_temp.uid('walikelas'), 'guru')
on conflict do nothing;
update public.siswa set user_id = null where user_id = pg_temp.uid('siswa');
insert into public.siswa (id, nisn, nama, user_id) values
  ('00000000-0000-0000-0000-00000000b0d1', '9910000001', 'Siswa Pustaka', pg_temp.uid('siswa')),
  ('00000000-0000-0000-0000-00000000b0d2', '9910000002', 'Siswa Lain', null);
insert into public.orang_tua (id, nama, user_id) values ('00000000-0000-0000-0000-00000000b0e1', 'Ortu P', pg_temp.uid('ortu')) on conflict (user_id) do nothing;
delete from public.siswa_orang_tua where orang_tua_id = (select id from public.orang_tua where user_id = pg_temp.uid('ortu'));
insert into public.siswa_orang_tua values ('00000000-0000-0000-0000-00000000b0d1', (select id from public.orang_tua where user_id = pg_temp.uid('ortu')), 'ayah');
update public.pegawai set user_id = null where user_id = pg_temp.uid('walikelas');
insert into public.pegawai (id, nama, user_id, nip) values ('00000000-0000-0000-0000-00000000b0b1', 'Guru PIC', pg_temp.uid('walikelas'), '199001012020121999');
update public.pengaturan_perpus set lama_pinjam = 7, maks_pinjam = 2, maks_perpanjang = 1, denda_per_hari = 500;
delete from public.notifikasi;
-- data uji lain (mis. dari e2e) diabaikan; semua dibatalkan oleh rollback
delete from public.riwayat_pengaduan; delete from public.pengaduan; delete from public.ulasan_buku; delete from public.jawaban_survei;

-- ---------- PERPUSTAKAAN ----------
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare b uuid; r record; begin
  insert into public.buku (id, judul, pengarang, kategori) values ('00000000-0000-0000-0000-00000000b101', 'Geografi Indonesia Uji', 'Penulis A', '910 Geografi');
  insert into public.eksemplar (buku_id) select '00000000-0000-0000-0000-00000000b101' from generate_series(1, 3);
  if (select count(*) from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' and kode ~ '^PUS\d{6}$') <> 3 then raise exception 'GAGAL: kode eksemplar otomatis'; end if;
  select * into r from public.pinjam_buku((select kode from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode limit 1), '9910000001');
  if r.peminjam <> 'Siswa Pustaka' then raise exception 'GAGAL: pinjam'; end if;
  begin perform public.pinjam_buku((select kode from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode limit 1), '9910000002');
    raise exception 'GAGAL: eksemplar dipinjam dua kali'; exception when invalid_parameter_value then null; end;
  perform public.pinjam_buku((select kode from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode offset 1 limit 1), '9910000001');
  begin perform public.pinjam_buku((select kode from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode offset 2 limit 1), '9910000001');
    raise exception 'GAGAL: melebihi batas pinjam'; exception when invalid_parameter_value then null; end;
  perform public.pinjam_buku((select kode from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode offset 2 limit 1), '199001012020121999');
  begin update public.eksemplar set status = 'tersedia' where buku_id = '00000000-0000-0000-0000-00000000b101';
    raise exception 'GAGAL: status dipinjam diubah manual'; exception when invalid_parameter_value then null; end;
  raise notice 'LULUS: pustakawan katalog & peminjaman (batas, ganda)';
end $$;
reset role;
-- buat satu pinjaman terlambat 4 hari
update public.pinjaman_buku set pinjam_pada = current_date - 11, jatuh_tempo = current_date - 4
 where eksemplar_id = (select id from public.eksemplar where buku_id = '00000000-0000-0000-0000-00000000b101' order by kode limit 1);
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if (select count(*) from public.pinjaman_buku) <> 2 then raise exception 'GAGAL: siswa melihat pinjamannya'; end if;
  begin perform public.perpanjang_buku((select id from public.pinjaman_buku where jatuh_tempo < current_date)); raise exception 'GAGAL: perpanjang yang terlambat';
    exception when invalid_parameter_value then null; end;
  perform public.perpanjang_buku((select id from public.pinjaman_buku where jatuh_tempo >= current_date));
  begin perform public.perpanjang_buku((select id from public.pinjaman_buku where jatuh_tempo >= current_date)); raise exception 'GAGAL: perpanjang melebihi batas';
    exception when invalid_parameter_value then null; end;
  begin perform public.pinjam_buku('PUS000001', '9910000001'); raise exception 'GAGAL: siswa melayani peminjaman'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: siswa melihat & memperpanjang pinjamannya sendiri';
end $$;
reset role;
select pg_temp.sebagai('ortu'); set local role authenticated;
do $$ begin
  if (select count(*) from public.pinjaman_buku) <> 2 then raise exception 'GAGAL: ortu melihat pinjaman anak'; end if;
  raise notice 'LULUS: orang tua melihat pinjaman anaknya';
end $$;
reset role;
select pg_temp.sebagai('guru'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.pinjaman_buku) then raise exception 'GAGAL: guru lain melihat pinjaman siswa'; end if;
  raise notice 'LULUS: pinjaman tidak terlihat orang lain';
end $$;
reset role;
select pg_temp.sebagai('operator'); set local role authenticated;
do $$ declare r record; begin
  select * into r from public.kembalikan_buku((select e.kode from public.eksemplar e join public.pinjaman_buku p on p.eksemplar_id = e.id where p.jatuh_tempo < current_date and p.kembali_pada is null), 'tersedia', false);
  if r.terlambat <> 4 or r.denda <> 2000 then raise exception 'GAGAL: denda keterlambatan (% hari, %)', r.terlambat, r.denda; end if;
  if (select (statistik_perpus(current_date - 30, current_date) ->> 'denda_belum_lunas')::numeric) <> 2000 then raise exception 'GAGAL: statistik denda'; end if;
  raise notice 'LULUS: pengembalian + denda terlambat';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select tersedia from public.katalog_publik('Geografi Indonesia Uji')) <> 1 then raise exception 'GAGAL: katalog publik ketersediaan'; end if;
  begin perform 1 from public.pinjaman_buku; raise exception 'GAGAL: anon membaca pinjaman'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: katalog publik tanpa data peminjam';
end $$;
reset role;
update public.pinjaman_buku set jatuh_tempo = current_date + 1 where pegawai_id is not null and kembali_pada is null;
do $$ begin
  if public.pengingat_perpus() < 1 then raise exception 'GAGAL: pengingat perpus'; end if;
  if public.pengingat_perpus() <> 0 then raise exception 'GAGAL: pengingat ganda'; end if;
  raise notice 'LULUS: pengingat jatuh tempo sekali sehari';
end $$;

-- ---------- PENGADUAN ----------
select pg_temp.anon(); set local role anon;
create temp table tk (tiket text, kode text);
grant all on tk to anon, authenticated;
do $$ declare r record; begin
  select * into r from public.kirim_pengaduan('fasilitas', 'Toilet lantai 2 rusak', 'Keran toilet siswa lantai dua bocor sejak seminggu lalu dan belum diperbaiki.', 'Bapak X', '0812', false, 'iphashuji');
  insert into tk values (r.tiket, r.kode);
  select * into r from public.kirim_pengaduan('perundungan', 'Perundungan di kelas', 'Anak saya sering diejek dan didorong oleh beberapa teman di kelas saat istirahat.', 'Ibu Y', '0813', true, 'iphashuji');
  insert into tk values (r.tiket, r.kode);
  perform public.kirim_pengaduan('saran', 'Saran kantin sehat', 'Mohon kantin menyediakan lebih banyak pilihan makanan sehat untuk siswa.', '', '', true, 'iphashuji');
  begin perform public.kirim_pengaduan('saran', 'Spam keempat', 'Ini pengaduan keempat dari perangkat yang sama dalam satu jam.', '', '', true, 'iphashuji');
    raise exception 'GAGAL: batas per perangkat'; exception when invalid_parameter_value then null; end;
  begin perform 1 from public.pengaduan; raise exception 'GAGAL: anon membaca tabel pengaduan'; exception when insufficient_privilege then null; end;
  if (select status from public.cek_pengaduan((select tiket from tk limit 1), (select kode from tk limit 1))) <> 'baru' then raise exception 'GAGAL: cek tiket'; end if;
  if exists (select 1 from public.cek_pengaduan((select tiket from tk limit 1), 'SALAH12345')) then raise exception 'GAGAL: kode salah diterima'; end if;
  raise notice 'LULUS: pengaduan publik bertiket + batas spam';
end $$;
reset role;
select pg_temp.sebagai('humas'); set local role authenticated;
do $$ begin
  if (select count(*) from public.pengaduan) <> 2 then raise exception 'GAGAL: humas harus melihat 2 pengaduan non-rahasia'; end if;
  if exists (select 1 from public.pengaduan where kategori = 'perundungan') then raise exception 'GAGAL: humas melihat pengaduan rahasia'; end if;
  if (select anonim from public.pengaduan where kategori = 'saran') is not true or (select nama from public.pengaduan where kategori = 'saran') <> '' then raise exception 'GAGAL: anonim'; end if;
  begin update public.pengaduan set status = 'selesai' where kategori = 'fasilitas'; raise exception 'GAGAL: tutup tanpa tanggapan';
    exception when invalid_parameter_value then null; end;
  update public.pengaduan set status = 'diproses', pic_id = '00000000-0000-0000-0000-00000000b0b1', isi = 'diubah' where kategori = 'fasilitas';
  if (select isi from public.pengaduan where kategori = 'fasilitas') = 'diubah' then raise exception 'GAGAL: isi pelapor diubah'; end if;
  raise notice 'LULUS: humas menangani pengaduan umum (tanpa melihat yang rahasia)';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if (select count(*) from public.pengaduan) <> 1 then raise exception 'GAGAL: PIC melihat pengaduan yang ditugaskan'; end if;
  if not exists (select 1 from public.notifikasi where judul like 'Anda ditugaskan%') then raise exception 'GAGAL: PIC tidak diberi tahu'; end if;
  update public.pengaduan set status = 'selesai', tanggapan_publik = 'Keran sudah diganti oleh tim sarpras.';
  raise notice 'LULUS: PIC menyelesaikan pengaduan';
end $$;
reset role;
select pg_temp.sebagai('kesiswaan'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.pengaduan where kategori = 'perundungan' and rahasia) then raise exception 'GAGAL: kesiswaan tidak melihat pengaduan rahasia'; end if;
  if not exists (select 1 from public.notifikasi where judul = 'Pengaduan RAHASIA baru' and prioritas = 'penting') then raise exception 'GAGAL: notif rahasia'; end if;
  raise notice 'LULUS: pengaduan rahasia ke kesiswaan/BK';
end $$;
reset role;
select pg_temp.anon(); set local role anon;
do $$ begin
  if (select tanggapan_publik from public.cek_pengaduan((select tiket from tk limit 1), (select kode from tk limit 1))) not like 'Keran sudah%' then raise exception 'GAGAL: tanggapan publik'; end if;
  raise notice 'LULUS: pelapor melihat tanggapan dengan tiket + kode';
end $$;
reset role;

-- ---------- KEMITRAAN & BUKU TAMU ----------
select pg_temp.sebagai('humas'); set local role authenticated;
insert into public.kemitraan (mitra, jenis, mulai, berakhir, tampil_publik) values ('Universitas Uji', 'pendidikan', current_date - 300, current_date + 10, true);
reset role;
do $$ begin
  if public.pengingat_kemitraan() < 1 then raise exception 'GAGAL: pengingat MoU'; end if;
  raise notice 'LULUS: pengingat MoU berakhir';
end $$;
select pg_temp.anon(); set local role anon;
do $$ begin
  if not exists (select 1 from public.mitra_publik() where mitra = 'Universitas Uji') then raise exception 'GAGAL: mitra publik'; end if;
end $$;
reset role;
select pg_temp.sebagai('piket'); set local role authenticated;
do $$ begin
  insert into public.buku_tamu (nama, instansi, keperluan, bertemu_id) values ('Tamu Dinas', 'Cabdin Wil. VII', 'Monitoring BOS', '00000000-0000-0000-0000-00000000b0b1');
  begin insert into public.kemitraan (mitra) values ('Piket iseng'); raise exception 'GAGAL: piket menambah MoU'; exception when insufficient_privilege then null; end;
  raise notice 'LULUS: piket mencatat tamu';
end $$;
reset role;
select pg_temp.sebagai('walikelas'); set local role authenticated;
do $$ begin
  if not exists (select 1 from public.notifikasi where judul = 'Tamu menunggu: Tamu Dinas') then raise exception 'GAGAL: tuan rumah tidak diberi tahu'; end if;
  update public.buku_tamu set keluar = now();
  if not exists (select 1 from public.buku_tamu where keluar is not null) then raise exception 'GAGAL: tuan rumah mencatat keluar'; end if;
  raise notice 'LULUS: buku tamu + notifikasi tuan rumah';
end $$;
reset role;
select pg_temp.sebagai('siswa'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.buku_tamu) or exists (select 1 from public.kemitraan) or exists (select 1 from public.pengaduan) then raise exception 'GAGAL: siswa melihat data humas'; end if;
  raise notice 'LULUS: siswa tidak melihat data humas';
end $$;
reset role;

rollback;
